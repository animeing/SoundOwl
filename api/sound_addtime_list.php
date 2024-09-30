<?php


error_reporting(E_ALL & ~E_WARNING);

header("Content-Type: text/json");
require_once(dirname(dirname(__FILE__)).'/parts/loader.php');

$soundLinkDao = new SoundLinkDao;

$soundList = array();
foreach($soundLinkDao->SoundFileTimeDesc() as $soundFileTimeItem) {
    $record = $soundFileTimeItem->getVisibleRecord();
    $record['album']=array(
        SoundLinkTable::ALBUM_HASH=>ComplessUtil::compless($soundFileTimeItem->getAlbumHash()),
        SoundLinkTable::ALBUM_TITLE=>$soundFileTimeItem->getAlbumTitle()
    );
    $soundList[] = $record;
}

echo json_encode($soundList);
