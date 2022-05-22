<?php

error_reporting(E_ALL & ~E_WARNING);

header("Content-Type: text/json");
require_once(dirname(dirname(__FILE__)).'/parts/loader.php');

$soundDao = new SoundLinkDao();
if(!isset($_GET['SoundHash'])) {
    echo json_encode(array());
    return;
}
foreach( $soundDao->find(ComplessUtil::decompless(BrowserUtil::getGetParam('SoundHash'))) as $soundDto) {
    $data = $soundDto->getDtoCache();
    $data['mime'] = mime_content_type($soundDto->getDataLink());
    echo json_encode($data);
    return;
}
echo json_encode(array());
