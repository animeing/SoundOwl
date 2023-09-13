<?php


error_reporting(E_ALL & ~E_WARNING);

header("Content-Type: text/json");
require_once(dirname(dirname(__FILE__)).'/parts/loader.php');

$soundLinkDao = new SoundLinkDao;

$ret = array();
foreach($soundLinkDao->SoundFileTimeDesc() as $soundFileTimeItem) {
    $ret[] = array(
        SoundLinkTable::SOUND_HASH=>ComplessUtil::compless($soundFileTimeItem->getSoundHash()),
        SoundLinkTable::TITLE=>$soundFileTimeItem->getTitle(),
        SoundLinkTable::ARTIST_NAME=>$soundFileTimeItem->getArtistName(),
        'album'=>array(
            SoundLinkTable::ALBUM_HASH=>ComplessUtil::compless($soundFileTimeItem->getAlbumHash()),
            SoundLinkTable::ALBUM_TITLE=>$soundFileTimeItem->getAlbumTitle()
        )
    );
}

echo json_encode($ret);
