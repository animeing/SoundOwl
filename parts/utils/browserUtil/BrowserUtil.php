<?php

final class BrowserUtil{
    private function __construct(){}
    
    public static function getCookieParam(string $key){
        return $_COOKIE[$key];
    }

    public static function setCookieParam(string $key, $value, long $expirationSecond = null){
        if($expirationSecond == null){
            setcookie($key, $value);
        } else {
            setcookie($key, $value, time() + $expirationSecond);
        }
    }

    public static function getGetParam(string $key){
        return $_GET[$key];
    }

    public static function addGetParam($key, $value, $url){
        if(strpos($url, '?') === false) {
            $url.'?';
        } else {
            $url.'&';
        }
        return ($url.$key.'='.$value);
    }
    
    public static function getPostParam($key){
        return $_POST[$key];
    }

	public static function headerToString(array $header){
        $headerString = "";
        foreach ($header as $name => $value) {
            $headerString .= "$name: $value\n";
        }
        return $headerString;
    }
    
    public static function stringToHeader($stringHeader){
        $header = array();
        foreach (explode('\n', $stringHeader) as $record) {
            $sp = explode (': ', $record, 2);
            $header[$sp[0]] = $sp[1];
        }
        return $header;
    }

    public static function getCurrentUrl(){
        return (empty($_SERVER['HTTPS']) ? 'http://' : 'https://').$_SERVER['HTTP_HOST'].$_SERVER['REQUEST_URI'];
    }
    
}