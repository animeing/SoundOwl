<?php
require_once(__DIR__. '/../../vendor/autoload.php');
require_once(__DIR__.'/../../parts/loader.php');

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

define('LOCK_PATH', __DIR__.'/../lock/sound_regist.lock');
class ServerMessage implements MessageComponentInterface {
    protected $clients;
    protected $soundDao;
    protected $artistDao;
    protected $albumDao;

    public function __construct() {
        $this->soundDao = new SoundLinkDao();
        $this->artistDao = new ArtistDao();
        $this->albumDao = new AlbumDao();
        $this->clients = new \SplObjectStorage;
        $this->sendStatus();
    }

    public function onOpen(ConnectionInterface $conn) {
        $conn->send(json_encode($this->addHeader($this->getStatus())));
        $this->clients->attach($conn);
        
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $from->send(json_encode($this->addHeader($msg)));
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        $conn->close();
    }

    public function getStatus(){
        $settings = (parse_ini_file(SETTING_INI));
        return array(
            'regist_status'=>file_exists(LOCK_PATH),
            'regist_data_count'=>array(
                'sound'=>$this->soundDao->count($this->soundDao->countQuery()),
                'artist'=>$this->artistDao->count($this->artistDao->countQuery()),
                'album'=>$this->albumDao->count($this->albumDao->countQuery())
            ),
            'websocket_retry_count'=>array_key_exists('websocket_retry_count', $settings)?$settings['websocket_retry_count'] : 0
            );
    }

    public function addHeader($param) {
        return array(
            'time'=>time() * 1000,
            'context'=>$param
        );
    }

    public function sendStatus() {
        $data = json_encode($this->addHeader($this->getStatus()));
        $this->sendClientAll($data);
    }

    public function sendClientAll(string $data) {
        foreach ($this->clients as $client) {
            $client->send($data);
        }
    }
}


$message = new ServerMessage();
$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            $message
        )
    ),
    8080
);

$server->loop->addPeriodicTimer(5, function() use($message) {
    $message->sendStatus();
});

$server->run();

