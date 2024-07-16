<?php

error_reporting(E_ALL & ~E_WARNING);
require(dirname(__DIR__).'/parts/loader.php');
header("Content-Type: text/json");

$jsonData = json_decode(file_get_contents("php://input"), true);

$historyList = [];
$historyDao = new VHistoryDao();
foreach($historyDao->getRange($jsonData['start'], $jsonData['end']) as $historyDto) {
  $result = $historyDto->getDtoCache();
  unset($result[VHistoryTable::DATA_LINK]);
  $result[VHistoryTable::SOUND_HASH] = ComplessUtil::compless($result[VHistoryTable::SOUND_HASH]);
  $result[VHistoryTable::ALBUM_HASH] = ComplessUtil::compless($result[VHistoryTable::ALBUM_HASH]);
  
  $historyList[] = $result;
}
echo json_encode($historyList);