<?php

require(dirname(__DIR__).'/parts/loader.php');
require(dirname(__DIR__).'/vendor/autoload.php');

header('Cache-Control: public');
header('Pragma: public');

header("Content-type: image/png");


if(!isset($_GET['playlist'])) {
    $mime = mime_content_type(dirname(__DIR__).'/img/blank-image.png');
    header("Accept: {$mime}");
    header("Content-type: {$mime}");
    echo readfile(dirname(__DIR__).'/img/blank-image.png');
    return;
}

$playlistDataDao = new PlaylistDataDao;
$playlistDataDto = null;
foreach($playlistDataDao->find($_GET['playlist']) as $value) {
    if($value->getPlayList() == $_GET['playlist']) {
        $playlistDataDto = $value;
    }
}

if($playlistDataDto == null || $playlistDataDto->getArt() == null) {
    $mime = mime_content_type(dirname(__DIR__).'/img/blank-image.png');
    header("Accept: {$mime}");
    header("Content-type: {$mime}");
    echo readfile(dirname(__DIR__).'/img/blank-image.png');
    return;
}

echo $playlistDataDto->getArt();
