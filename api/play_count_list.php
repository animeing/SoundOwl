<?php

error_reporting(E_ALL & ~E_WARNING);

header("Content-Type: text/json");
require_once(dirname(dirname(__FILE__)).'/parts/loader.php');

$soundcountList = new SoundDataDao;

$ret = array();

foreach($soundcountList->getPlayCountDesc() as $soundCountItem) {
    $ret[] = array(
        SoundDataView::SOUND_HASH=>ComplessUtil::compless($soundCountItem->getSoundHash()),
        SoundDataView::TITLE=>$soundCountItem->getTitle(),
        SoundDataView::ARTIST_NAME=>$soundCountItem->getArtistName(),
        'album'=>array(
            SoundDataView::ALBUM_KEY=>ComplessUtil::compless($soundCountItem->getAlbumKey()),
            SoundDataView::ALBUM_TITLE=>$soundCountItem->getAlbumTitle()
        )
    );
}

echo json_encode($ret);
