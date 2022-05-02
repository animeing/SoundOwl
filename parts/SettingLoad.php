<?php
/**
 * データが展開されている絶対Path
 */
define("INCLUDE_PATH", dirname(dirname(__FILE__)));

define("PARTS_DIRECTORY", INCLUDE_PATH.'/parts/');

define("PAGE_PROTOCOL",(empty($_SERVER["HTTPS"]) ? "http://" : "https://"));

$setting = parse_ini_file(PARTS_DIRECTORY.'setting.ini');

define("DB_DSN", $setting['db_dsn']);

define("DB_USER", $setting['db_user']);

define("DB_PASSWORD", $setting['db_pass']);

define("SOUND_DIRECTORY", $setting['sound_directory']);

$setting = null;

