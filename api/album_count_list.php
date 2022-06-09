<?php

error_reporting(E_ALL & ~E_WARNING);

header("Content-Type: text/json");
require_once(dirname(dirname(__FILE__)).'/parts/loader.php');

$soundcountList = new SoundLinkDao;

$ret = array();

foreach($soundcountList->getAlbumPlayCountDesc() as $albumPlayCountItem) {
    $ret[] = array(
        "title"=>$albumPlayCountItem->getAlbumTitle(),
        "albumKey"=>ComplessUtil::compless($albumPlayCountItem->getAlbumHash())
    );
}
echo json_encode($ret);
