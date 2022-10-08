<?php

error_reporting(E_ALL & ~E_WARNING);
require(dirname(__DIR__).'/parts/loader.php');
header("Content-Type: text/json");

$soundList = [];
if(isset($_POST['ArtistHash'])) {
    $soundLinkDao = new SoundLinkDao;
    $soundLinkListDtos = $soundLinkDao->getArtistSounds(ComplessUtil::decompless($_POST['ArtistHash']));
    foreach($soundLinkListDtos as $soundLinkDto) {
        $soundList[] = array(
            SoundLinkTable::SOUND_HASH=>ComplessUtil::compless($soundLinkDto->getSoundHash()),
            SoundLinkTable::TITLE=>$soundLinkDto->getTitle(),
            SoundLinkTable::ARTIST_NAME=>$soundLinkDto->getArtistName(),
            SoundLinkTable::TRACK_NO=>$soundLinkDto->getTrackNo(),
            'album'=>array(
                SoundLinkTable::ALBUM_HASH=>ComplessUtil::compless($soundLinkDto->getAlbumHash()),
                SoundLinkTable::ALBUM_TITLE=>$soundLinkDto->getAlbumTitle()
            )
        );
    }
}
echo json_encode($soundList);
