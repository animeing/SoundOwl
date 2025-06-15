<?php
header("Content-Type: text/json");
require_once(dirname(dirname(__FILE__)).'/parts/loader.php');

if(!isset($_POST['playlist_name']) || !isset($_POST['sounds'])) {
    http_response_code(400);
    echo json_encode(['status'=>'error','detail'=>'invalid request']);
    return;
}

$playlistName = $_POST['playlist_name'];
$sounds = $_POST['sounds'];

$playlistDao = new PlayListDao();
$playlistDataDao = new PlaylistDataDao();

$playlistDao->removePlayList($playlistName);

$index = 0;
foreach ($sounds as $hash) {
    $playlist = new PlayListDto();
    $playlist->setPlayList($playlistName);
    $playlist->setSoundPoint($index);
    $playlist->setSoundHash(ComplessUtil::decompless($hash));
    $playlistDao->insert($playlist);
    $index++;
}

foreach($playlistDataDao->find($playlistName) as $value){
    $playlistDataDao->update($value);
}

echo json_encode([
    'status'=>'success',
    'detail'=>'playlist order saved.'
]);
