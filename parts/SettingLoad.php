<?php
/**
 * データが展開されている絶対Path
 */
define("INCLUDE_PATH", dirname(dirname(__FILE__)));

define("PARTS_DIRECTORY", INCLUDE_PATH.'/parts/');

define("PAGE_PROTOCOL",(empty($_SERVER["HTTPS"]) ? "http://" : "https://"));

define("SETTING_INI", PARTS_DIRECTORY.'setting.ini');

$setting = parse_ini_file(SETTING_INI);

define("DB_DSN", $setting['db_dsn']);

define("DB_USER", $setting['db_user']);

define("DB_PASSWORD", $setting['db_pass']);

define("SOUND_DIRECTORY", $setting['sound_directory']);

$setting = null;

