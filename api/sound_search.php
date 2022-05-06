<?php

error_reporting(E_ALL & ~E_WARNING);
require(dirname(__DIR__).'/parts/loader.php');
header("Content-Type: text/json");

$soundList = [];
if(isset($_POST['SearchWord'])) {
    $soundDataDao = new SoundDataDao;
    $soundDataListDtos = $soundDataDao->getWordSearchSounds($_POST['SearchWord']);
    foreach ($soundDataListDtos as $soundDataListDto) {
        $soundList[] = array(
            SoundDataView::SOUND_HASH=>ComplessUtil::compless($soundDataListDto->getSoundHash()),
            SoundDataView::TITLE=>$soundDataListDto->getTitle(),
            SoundDataView::ARTIST_NAME=>$soundDataListDto->getArtistName(),
            'album'=>array(
                SoundDataView::ALBUM_KEY=>ComplessUtil::compless($soundDataListDto->getAlbumKey()),
                SoundDataView::ALBUM_TITLE=>$soundDataListDto->getAlbumTitle()
            )
        );
    }
}
echo json_encode($soundList);
