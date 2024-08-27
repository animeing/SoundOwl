<?php

error_reporting(E_ALL & ~E_WARNING);
require(dirname(__DIR__).'/parts/loader.php');
header("Content-Type: text/json");

$soundList = [];
if(isset($_POST['SearchWord'])) {
    $soundLinkDao = new SoundLinkDao;
    $soundLinkListDtos = $soundLinkDao->getWordSearchSounds($_POST['SearchWord']);
    foreach ($soundLinkListDtos as $soundLinkListDto) {
        $record = $soundLinkListDto->getVisibleRecord();
        $record['album']=array(
            SoundLinkTable::ALBUM_HASH=>ComplessUtil::compless($soundLinkListDto->getAlbumHash()),
            SoundLinkTable::ALBUM_TITLE=>$soundLinkListDto->getAlbumTitle()
        );
        $soundList[] = $record;
    }
}
echo json_encode($soundList);
