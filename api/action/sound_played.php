<?php

error_reporting(E_ALL & ~E_WARNING);

header("Content-Type: text/json");
require_once(dirname(dirname(dirname(__FILE__))).'/parts/loader.php');

if(!isset($_GET['SoundHash'])) {
    echo json_encode(array());
    return;
}

$soundDao = new SoundLinkDao();
foreach($soundDao->find(ComplessUtil::decompless(BrowserUtil::getGetParam('SoundHash'))) as $soundDto) {
    $soundDto->setPlayCount($soundDto->getPlayCount() + 1);
    $soundDao->update($soundDto);
    $soundHistoryDto = new SoundPlayHistoryDto();
    $soundHistoryDto->setPlayDate(date("Y-m-d H:i:s"));
    $soundHistoryDto->setSoundHash($soundDto->getSoundHash());
    $soundPlayHistoryDao = new SoundPlayHistoryDao();
    $soundPlayHistoryDao->insert($soundHistoryDto);
    break;
}

