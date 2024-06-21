<?php

error_reporting(E_ALL & ~E_WARNING);
require(dirname(__DIR__).'/parts/loader.php');
header("Content-Type: text/json");

$files = FileUtil::getFileList(INCLUDE_PATH.'/audio_pulse/');
$result = [];

foreach($files as $filePath) {
  if(FileUtil::fileTypesCheck($filePath, ['audio/wav', 'audio/mpeg'])) {
    $result[] = basename($filePath);
  }
}

echo json_encode($result);
