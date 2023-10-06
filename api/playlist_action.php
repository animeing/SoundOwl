<?php

header("Content-Type: text/json");
require_once(dirname(dirname(__FILE__)).'/parts/loader.php');

if(!isset($_POST)) {
    http_response_code(400);
    return;
}
if(!isset($_POST['method'])) {
    http_response_code(400);
    return;
}


function createImageData() {

    function addImage($currentImg, $addImg, $paintPointX, $paintPointY) {
        imagecopyresampled($currentImg, $addImg, $paintPointX, $paintPointY, 0, 0, 150, 150, imagesx($addImg), imagesy($addImg));
    }
    
    $VPlaylistDao = new VPlaylistDao;

    $playlistDatas = array_reverse($VPlaylistDao->getAlbumArts($_POST['playlist_name'], 5));

    $albumDao = new AlbumDao;

    $newImage = imagecreatetruecolor(200, 200);

    $pointx = 105;
    $pointy = 105;
    foreach ($playlistDatas as $playlistData) {
        $albumDto = null;
        $pointx -= 21;
        $pointy -= 21;
        foreach($albumDao->find($playlistData->getAlbumHash()) as $value) {
            $albumDto = $value;
            break;
        }
        if($albumDto == null || $albumDto->getArtMime() == null) {
            continue;
        }
        
        if(strpos($albumDto->getArtMime(),'jpeg') !== false || strpos($albumDto->getArtMime(),'png') !== false) {
            $imgdata = imagecreatefromstring($albumDto->getAlbumArt());
            addImage($newImage, $imgdata, $pointx, $pointy);
            imagedestroy($imgdata);

            continue;
        } else {
            continue;
        }
    }

    ob_start();
    imagepng($newImage);
    imagedestroy($newImage);
    return ob_get_clean();

}

if($_POST['method'] == 'create') {
    if(!isset($_POST['sounds']) || !isset($_POST['playlist_name'])){
        http_response_code(400);
        return;
    }
    if(count($_POST['sounds']) == 0) {
        echo json_encode(
            array(
                'status'=>'error',
                'detail'=>'There are too few sound.'
            )
        );
        return;
    }
    (new PlayListDao())->removePlayList($_POST['playlist_name']);
    $playlistDataDto = new PlaylistDataDto;
    $playlistDataDto->setPlayList($_POST['playlist_name']);
    $playlistDataDao = new PlaylistDataDao;
    $playlistDataDao->upsert($playlistDataDto);

    foreach ($_POST['sounds'] as $key => $value) {
        $playlist = new PlayListDto();
        $playlist->setPlayList($_POST['playlist_name']);
        $playlist->setSoundPoint($key);
        $playlist->setSoundHash(ComplessUtil::decompless($value));
        (new PlayListDao())->insert($playlist);
    }
    $playlistDataDto->setArt(createImageData());
    $playlistDataDao->upsert($playlistDataDto);
    
    echo json_encode(
        array(
            'status'=>'success',
            'detail'=>'playlist created.'
        )
    );
    return;
}
else if($_POST['method'] == 'names') {
    $playlist = (new PlayListDao())->getPlayListNames();
    $ret = [];
    foreach ((new PlayListDao())->getPlayListNames() as $value) {
        $ret[] = $value->getDtoCache();
    }
    echo json_encode($ret);
}


