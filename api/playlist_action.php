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

if($_POST['method'] == 'create') {
    if(!isset($_POST['sounds']) || !isset($_POST['playlist_name'])){
        http_response_code(400);
        return;
    }
    foreach ($_POST['sounds'] as $key => $value) {
        $playlist = new PlayListDto();
        $playlist->setPlayList($_POST['playlist_name']);
        $playlist->setSoundPoint($key);
        $playlist->setSoundHash(ComplessUtil::decompless($value));
        (new PlayListDao())->insert($playlist);
    }
    return;
}
