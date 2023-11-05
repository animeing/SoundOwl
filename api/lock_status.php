<?php

error_reporting(E_ALL & ~E_WARNING);

header("Content-Type: text/json");
require_once(dirname(dirname(__FILE__)).'/parts/loader.php');
define('LOCK_PATH', 'lock/sound_regist.lock');
define('AUDIO_REGIST_LOCK_PATH', '/lock/sound_volume_calc.lock');

echo json_encode(array(
    'regist_status'=>file_exists(LOCK_PATH) || file_exists(AUDIO_REGIST_LOCK_PATH),
    'regist_status_step1'=>file_exists(LOCK_PATH) ,
    'regist_status_step2'=>file_exists(AUDIO_REGIST_LOCK_PATH)
));
