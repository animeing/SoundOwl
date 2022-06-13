<?php

error_reporting(E_ALL & ~E_WARNING);
require(dirname(__DIR__).'/parts/loader.php');
header("Content-Type: text/json");

$albumList = [];
$albumDao = new AlbumDao;
$artistDao = new ArtistDao;

foreach($albumDao->select() as $albumDto) {
    $artistDto = $artistDao->find($albumDto->getArtistId())[0];
    $albumList[] = array(
        AlbumTable::ALBUM_KEY=>ComplessUtil::compless($albumDto->getAlbumKey()),
        AlbumTable::TITLE=>$albumDto->getTitle(),
        'artist'=>array(
            AlbumTable::ARTIST_ID=>$albumDto->getArtistId(),
            ArtistTable::ARTIST_NAME=>(empty($artistDto) ? '' : $artistDto->getArtistName())
        )
    );
}
echo json_encode($albumList);