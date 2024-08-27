<?php

error_reporting(E_ALL & ~E_WARNING);
require(dirname(__DIR__).'/parts/loader.php');
header("Content-Type: text/json");

$jsonData = json_decode(file_get_contents("php://input"), true);

$historyList = [];
$historyDao = new VHistoryDao();
foreach($historyDao->getRange($jsonData['start'], $jsonData['end']) as $historyDto) {
  $historyList[] = $historyDto->getVisibleRecord();
}
echo json_encode($historyList);