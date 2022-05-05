<?php

error_reporting(E_ALL & ~E_WARNING);

require(dirname(__DIR__).'/parts/loader.php');
if(!isset($_GET["media_hash"])) return;

$decrypted = ComplessUtil::decompless((urldecode($_GET["media_hash"])));
$albumDao = new AlbumDao;
$albumDto = null;
foreach($albumDao->find($decrypted) as $findAlbumDto) {
    if($findAlbumDto->getAlbumKey() == $decrypted) {
        $albumDto = $findAlbumDto;
        break;
    }
}

if($albumDto == null) {
    return;
}
header('Cache-Control: public');
header('Pragma: public');

header("Accept-Ranges: bytes"); 
$mime = $albumDto->getArtMime();
header("Accept: {$mime}");
header("Content-type: {$mime}");


echo $albumDto->getAlbumArt();