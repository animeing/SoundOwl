<?php

error_reporting(E_ALL & ~E_WARNING);

header("Content-Type: text/json");
require_once(dirname(dirname(__FILE__)).'/parts/loader.php');

$mysqli = new mysqli(DB_IP_ADDRESS, DB_USER, DB_PASSWORD);
if($mysqli->connect_error) {
    echo json_encode(array(
        'status'=>'error', 
        'errorNo'=>$mysqli->errno
    ));
    return;
}
{
    $query = sprintf("CREATE DATABASE IF NOT EXISTS `%s`", mysqli_real_escape_string($mysqli, DB_NAME));
    if($mysqli->query($query) === false){
        echo json_encode(array(
            'status'=>'error', 
            'errorNo'=>$mysqli->errno
        ));
        return;
    }
    $query = sprintf("USE `%s`", mysqli_real_escape_string($mysqli, DB_NAME));
    if($mysqli->query($query) === false){
        echo json_encode(array(
            'status'=>'error', 
            'errorNo'=>$mysqli->errno
        ));
        return;
    }
}
{
    $createTable = file_get_contents(dirname(dirname(__FILE__)).'\parts\setup\db\soundowl_table_mysql.sql');
    if($mysqli->multi_query($createTable) === false){
        echo json_encode(array(
            'status'=>'error', 
            'errorNo'=>$mysqli->errno
        ));
        return;
    }
}

echo json_encode(array(
    'status'=>'success'
));
