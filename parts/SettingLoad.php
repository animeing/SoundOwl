<?php
/**
 * データが展開されている絶対Path
 */
define("INCLUDE_PATH", dirname(dirname(__FILE__)));

define("PARTS_DIRECTORY", INCLUDE_PATH.'/parts/');

define("PAGE_PROTOCOL",(empty($_SERVER["HTTPS"]) ? "http://" : "https://"));

define("SETTING_INI", PARTS_DIRECTORY.'setting.ini');

$setting = parse_ini_file(SETTING_INI);

define("DB_IP_ADDRESS", array_key_exists('db_ip_address',$setting)?$setting['db_ip_address']:'');

define('DB_NAME', array_key_exists('db_name',$setting)?$setting['db_name']:'');

define("DB_DSN", 'mysql:host='.DB_IP_ADDRESS.';dbname='.DB_NAME);

define("DB_USER", array_key_exists('db_user',$setting)?$setting['db_user']:'');

define("DB_PASSWORD", array_key_exists('db_pass',$setting)?$setting['db_pass']:'');

define("SOUND_DIRECTORY", array_key_exists('sound_directory',$setting)?$setting['sound_directory']:'');

define("WEBSOCKET_RETRY_COUNT_LIMIT", array_key_exists('websocket_retry_count', $setting)?$setting['websocket_retry_count'] : 0);

define("WEBSOCKET_RETRY_INTERVAL", array_key_exists('websocket_retry_interval', $setting)? $setting['websocket_retry_interval'] : 10000);

$setting = null;

