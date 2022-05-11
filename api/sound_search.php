<?php

error_reporting(E_ALL & ~E_WARNING);
require(dirname(__DIR__).'/parts/loader.php');
header("Content-Type: text/json");

$soundList = [];
if(isset($_POST['SearchWord'])) {
    $soundLinkDao = new SoundLinkDao;
    $soundLinkListDtos = $soundLinkDao->getWordSearchSounds($_POST['SearchWord']);
    foreach ($soundLinkListDtos as $soundLinkListDto) {
        $soundList[] = array(
            SoundLinkTable::SOUND_HASH=>ComplessUtil::compless($soundLinkListDto->getSoundHash()),
            SoundLinkTable::TITLE=>$soundLinkListDto->getTitle(),
            SoundLinkTable::ARTIST_NAME=>$soundLinkListDto->getArtistName(),
            'album'=>array(
                SoundLinkTable::ALBUM_HASH=>ComplessUtil::compless($soundLinkListDto->getAlbumHash()),
                SoundLinkTable::ALBUM_TITLE=>$soundLinkListDto->getAlbumTitle()
            )
        );
    }
}
echo json_encode($soundList);
