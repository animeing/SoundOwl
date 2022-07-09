<?php

error_reporting(E_ALL & ~E_WARNING);
require(dirname(__DIR__).'/parts/loader.php');
header("Content-Type: text/json");

$artistList = [];
$artistDao = new ArtistDao;
$albumDao = new AlbumDao;
foreach($artistDao->rangeSelect(BrowserUtil::getPostParam('start'), BrowserUtil::getPostParam('end')) as $artistDto) {
    $albumDto = $albumDao->findHaveAlbumArtsDtos($artistDto->getArtistId());
    

    if (empty($albumDto)) {
        $artistList[] = array(
            ArtistTable::ARTIST_ID=>ComplessUtil::compless($artistDto->getArtistId()),
            ArtistTable::ARTIST_NAME=>$artistDto->getArtistName(),
            'album'=>array(
                AlbumTable::ALBUM_KEY=>'',
                AlbumTable::TITLE=>''
            )
        );
    } else {
        $artistList[] = array(
            ArtistTable::ARTIST_ID=>ComplessUtil::compless($artistDto->getArtistId()),
            ArtistTable::ARTIST_NAME=>$artistDto->getArtistName(),
            'album'=>array(
                AlbumTable::ALBUM_KEY=>ComplessUtil::compless($albumDto[0]->getAlbumKey()),
                AlbumTable::TITLE=>$albumDto[0]->getTitle()
            )
        );
    }
}

echo json_encode($artistList);
