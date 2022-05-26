<?php

error_reporting(E_ALL & ~E_WARNING);

require(dirname(__DIR__).'/parts/loader.php');
header('X-Link', dirname(__DIR__).'/img/blank-image.png');
if(!isset($_GET["media_hash"])) {
    $mime = mime_content_type(dirname(__DIR__).'/img/blank-image.png');
    header("Accept: {$mime}");
    header("Content-type: {$mime}");
    echo readfile(dirname(__DIR__).'/img/blank-image.png');
    return;
};

$decrypted = ComplessUtil::decompless((urldecode($_GET["media_hash"])));
$albumDao = new AlbumDao;
$albumDto = null;
foreach($albumDao->find($decrypted) as $findAlbumDto) {
    if($findAlbumDto->getAlbumKey() == $decrypted) {
        $albumDto = $findAlbumDto;
        break;
    }
}

header('Cache-Control: public');
header('Pragma: public');
if($albumDto == null || $albumDto->getAlbumArt() == null) {
    $mime = mime_content_type(dirname(__DIR__).'/img/blank-image.png');
    header("Accept: {$mime}");
    header("Content-type: {$mime}");
    echo readfile(dirname(__DIR__).'/img/blank-image.png');
    return;
}
header('Cache-Control: public');
header('Pragma: public');

header("Accept-Ranges: bytes"); 
$mime = $albumDto->getArtMime();
header("Accept: {$mime}");
header("Content-type: {$mime}");


echo $albumDto->getAlbumArt();