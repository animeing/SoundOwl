<?php

error_reporting(E_ALL & ~E_WARNING);

header("Content-Type: text/json");
require_once(dirname(dirname(__FILE__)).'/parts/loader.php');

$soundcountList = new SoundLinkDao;

$ret = array();

foreach($soundcountList->getPlayCountDesc() as $soundCountItem) {
    $ret[] = array(
        SoundLinkTable::SOUND_HASH=>ComplessUtil::compless($soundCountItem->getSoundHash()),
        SoundLinkTable::TITLE=>$soundCountItem->getTitle(),
        SoundLinkTable::ARTIST_NAME=>$soundCountItem->getArtistName(),
        'album'=>array(
            SoundLinkTable::ALBUM_HASH=>ComplessUtil::compless($soundCountItem->getAlbumHash()),
            SoundLinkTable::ALBUM_TITLE=>$soundCountItem->getAlbumTitle()
        )
    );
}

echo json_encode($ret);
