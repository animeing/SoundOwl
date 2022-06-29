<?php

error_reporting(E_ALL & ~E_WARNING);

header("Content-Type: text/json");
require_once(dirname(dirname(__FILE__)).'/parts/loader.php');
define('LOCK_PATH', 'lock/sound_regist.lock');

echo json_encode(array(
    'regist_status'=>file_exists(LOCK_PATH)
));
