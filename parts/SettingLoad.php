<?php
/**
 * データが展開されている絶対Path
 */
define("INCLUDE_PATH", dirname(dirname(__FILE__)));

define("PARTS_DIRECTORY", INCLUDE_PATH.'/parts/');

define("PAGE_PROTOCOL",(empty($_SERVER["HTTPS"]) ? "http://" : "https://"));

define("SETTING_INI", PARTS_DIRECTORY.'setting.ini');


function getParam($name, $defaultValue = null) {
  $setting = parse_ini_file(SETTING_INI);
  if (array_key_exists($name, $setting)) {
    return $setting[$name];
  } else {
    return $defaultValue;
  }
}

define("DB_IP_ADDRESS", getenv('DB_SERVER')?: getParam("db_ip_address","localhost"));

define('DB_NAME', getParam('db_name', 'sound'));

define("DB_DSN", 'mysql:host='.DB_IP_ADDRESS.';dbname='.DB_NAME);

define("DB_USER", getParam("db_user","sound"));

define("DB_PASSWORD", getParam("db_pass","sound"));

define("SOUND_DIRECTORY", getParam("sound_directory","/"));

define("WEBSOCKET_RETRY_COUNT_LIMIT", getParam("websocket_retry_count",0));

define("WEBSOCKET_RETRY_INTERVAL", getParam("websocket_retry_interval",10000));

define("REDIS_SERVER", getenv('REDIS_SERVER')?: getParam("redis_ip_address","localhost"));

$setting = null;

