<?php

namespace db;

use PDO;

class Connector{
	private static $dsn = DB_DSN;
	private static $user = DB_USER;
    private static $pass = DB_PASSWORD;
    private $pdo;

    /**
     * @return PDO
     */
    function getConnector(){
        $this->pdo = new PDO(Connector::$dsn, Connector::$user, Connector::$pass,
            array(PDO::ATTR_EMULATE_PREPARES => false));
            
    	$this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_WARNING);
        $this->pdo->query('SET NAMES utf8');
        return $this->pdo;
    }

    function commitExecute($sql, $param){
        $stmt = null;
        try{
            $pdo = $this->getConnector();
            $stmt = $pdo->prepare($sql);
            $stmt->execute($param);
        } finally{
            $stmt = null;
        }
    }

    /**
     * Returns an array containing all of the result set rows
     */
    function execute($sql, $params =null){
        $stmt = null;
        try{
            $pdo = $this->getConnector();
            $stmt = $pdo->prepare($sql,[PDO::ATTR_CURSOR => PDO::CURSOR_SCROLL]);
            $stmt->execute($params);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } finally{
            $stmt = null;
        }
        return null;
    }

    function count($sql, $param = null){
        $pdo = $this->getConnector();
        $stmt = $pdo->prepare($sql);
        $stmt->execute($param);
        return $stmt->fetch(PDO::FETCH_COLUMN);
    }
}