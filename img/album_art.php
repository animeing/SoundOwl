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
$albumDao = new AlbumDao;
$albumDto = null;
foreach($albumDao->find($decrypted) as $findAlbumDto) {
    if($findAlbumDto->getAlbumKey() == $decrypted) {
        $albumDto = $findAlbumDto;
        break;
    }
}

if($albumDto == null || $albumDto->getAlbumArt() == null) {
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
if(strpos($mime,'jpeg') !== false) {
    if(file_put_contents(urldecode($_GET["media_hash"]).'.jpg', $albumDto->getAlbumArt()) === false){
        echo $albumDto->getAlbumArt();
        return;
    }
    $imageResource = imagecreatefromjpeg(urldecode($_GET["media_hash"]).'.jpg');
    imageinterlace($imageResource, true);
    imagejpeg($imageResource, null, 70);
    unlink(urldecode($_GET["media_hash"]).'.jpg');
    imagedestroy($imageResource);
} else if(strpos($mime,'png') !== false){
    if(file_put_contents(urldecode($_GET["media_hash"]).'.png', $albumDto->getAlbumArt()) === false) {
        echo $albumDto->getAlbumArt();
        return;
    }
    $imageResource = imagecreatefrompng(urldecode($_GET["media_hash"]).'.png');
    imageinterlace($imageResource, true);
    imagepng($imageResource);
    unlink(urldecode($_GET["media_hash"]).'.png');
    imagedestroy($imageResource);

} else {
    echo $albumDto->getAlbumArt();
}
