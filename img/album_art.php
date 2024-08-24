<?php

error_reporting(E_ALL & ~E_WARNING);

require(dirname(__DIR__).'/parts/loader.php');
require(dirname(__DIR__).'/vendor/autoload.php');

header('Cache-Control: public');
header('Pragma: public');

if(!isset($_GET["media_hash"])) {
    $mime = mime_content_type(dirname(__DIR__).'/img/blank-image.png');
    header("Accept: {$mime}");
    header("Content-type: {$mime}");
    echo readfile(dirname(__DIR__).'/img/blank-image.png');
    return;
}

$decrypted = ComplessUtil::decompless((urldecode($_GET["media_hash"])));

$predis = new Predis\Client([
    'host'=>REDIS_SERVER
]);
$predis->executeRaw(['CONFIG', 'SET', 'maxmemory', '256mb']);
$predis->executeRaw(['CONFIG', 'SET', 'maxmemory-policy', 'volatile-ttl']);

$albumDto = new AlbumDto;

if($predis->exists($decrypted)) {
    $albumDto->putAllDtoCache(unserialize($predis->get($decrypted)));
    header("X-Cache-Load: True");
} else {
    $albumDao = new AlbumDao;
    foreach($albumDao->find($decrypted) as $findAlbumDto) {
        if($findAlbumDto->getAlbumKey() == $decrypted) {
            $albumDto = $findAlbumDto;
            break;
        }
    }
    header("X-Cache-Load: False");
    $predis->setex($decrypted, 3600, serialize($albumDto->getDtoCache()));
}



if($albumDto->getAlbumArt() == null) {
    $mime = mime_content_type(dirname(__DIR__).'/img/blank-image.png');
    header("Accept: {$mime}");
    header("Content-type: {$mime}");
    echo readfile(dirname(__DIR__).'/img/blank-image.png');
    return;
}

header("Accept-Ranges: bytes");
$mime = $albumDto->getArtMime();
header("Accept: {$mime}");
header("Content-type: {$mime}");

$imageData = $albumDto->getAlbumArt();

echo $imageData;

