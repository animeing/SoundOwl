<?php

error_reporting(E_ALL & ~E_WARNING);
require(dirname(__DIR__).'/parts/loader.php');
header("Content-Type: text/json");

$soundList = [];
if(isset($_POST['ArtistHash'])) {
    $soundLinkDao = new SoundLinkDao;
    $soundLinkListDtos = $soundLinkDao->getArtistSounds(ComplessUtil::decompless($_POST['ArtistHash']));
    foreach($soundLinkListDtos as $soundLinkDto) {
        $record = $soundLinkDto->getVisibleRecord();
        $record['album']=array(
            SoundLinkTable::ALBUM_HASH=>ComplessUtil::compless($soundLinkDto->getAlbumHash()),
            SoundLinkTable::ALBUM_TITLE=>$soundLinkDto->getAlbumTitle()
        );
        $soundList[] = $record;
    }
}
echo json_encode($soundList);
