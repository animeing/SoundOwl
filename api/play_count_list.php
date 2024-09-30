<?php

error_reporting(E_ALL & ~E_WARNING);

header("Content-Type: text/json");
require_once(dirname(dirname(__FILE__)).'/parts/loader.php');

$soundcountList = new SoundLinkDao;

$soundList = array();

foreach($soundcountList->getPlayCountDesc() as $soundCountItem) {
    $record = $soundCountItem->getVisibleRecord();
    $record['album']=array(
        SoundLinkTable::ALBUM_HASH=>ComplessUtil::compless($soundCountItem->getAlbumHash()),
        SoundLinkTable::ALBUM_TITLE=>$soundCountItem->getAlbumTitle()
    );
    $soundList[] = $record;
}

echo json_encode($soundList);
