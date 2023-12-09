<?php
require_once(__DIR__. '/../../vendor/autoload.php');
require_once(__DIR__.'/../../parts/loader.php');

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

define('AUDIO_REGIST_LOCK_PATH', __DIR__.'/../lock/sound_volume_calc.lock');
define('LOCK_PATH', __DIR__.'/../lock/sound_regist.lock');
class ServerMessage implements MessageComponentInterface {
    protected $clients;
    protected $soundDao;
    protected $artistDao;
    protected $albumDao;

    protected $hasDatabaseTables = false;

    public function __construct() {
        $this->soundDao = new SoundLinkDao();
        $this->artistDao = new ArtistDao();
        $this->albumDao = new AlbumDao();
        $this->clients = new \SplObjectStorage;
        $this->hasDatabaseTables = FileUtil::isDatabaseCreatedTables();
        $this->sendStatus();
    }

    public function onOpen(ConnectionInterface $conn) {
        $conn->send(json_encode($this->addHeader($this->getStatus())));
        $this->clients->attach($conn);
        
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $this->sendMessage(json_decode($msg));
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        $conn->close();
    }

    public function getStatus(){
        $this->hasDatabaseTables = FileUtil::isDatabaseCreatedTables();

        $settings = (parse_ini_file(SETTING_INI));
        return array(
            'regist_status'=>file_exists(LOCK_PATH) || file_exists(AUDIO_REGIST_LOCK_PATH),
            'regist_status_step1'=>file_exists(LOCK_PATH) ,
            'regist_status_step2'=>file_exists(AUDIO_REGIST_LOCK_PATH),
            'regist_data_count'=>array(
                'sound'=> $this->hasDatabaseTables ? $this->soundDao->count($this->soundDao->countQuery()) : 0,
                'artist'=> $this->hasDatabaseTables ? $this->artistDao->count($this->artistDao->countQuery()) : 0,
                'album'=> $this->hasDatabaseTables ? $this->albumDao->count($this->albumDao->countQuery()) : 0,
                'analysis_sound'=>$this->hasDatabaseTables ? $this->soundDao->countInputedLoudnessTarget() : 0
            ),
            'websocket'=>array(
                'retry_count'=>(array_key_exists('websocket_retry_count', $settings)?$settings['websocket_retry_count'] : 0),
                'retry_interval'=>(array_key_exists('websocket_retry_interval', $settings)?$settings['websocket_retry_interval'] : 10000)
            )
        );
    }

    public function addHeader($param) {
        return array(
            'time'=>time() * 1000,
            'context'=>$param
        );
    }

    public function sendMessage($message) {
        $status = $this->getStatus();
        $status['message'] = $message;
        $data = json_encode($this->addHeader($status));
        $this->sendClientAll($data);
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

