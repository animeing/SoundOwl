<?php
/**
 * あんまり圧縮されない。。。。
 */
final class ComplessUtil{
    private function __construct(){
    }

    const TABLE = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@,.<>[]:;!$()";
    
    /**
     * @param string $str
     * @return string
     */
    public static function compless($str){
        $bb = str_split($str, 9);
        $ret = null;
        foreach ($bb as $key => $value) {
            $data = "";
            if (strlen($ret) > 0 && $bb[$key] != "") {
                $ret.='_';
            }
            $data = $value;
            $option = "";
            while (substr($data, 0 ,1) === '0') {
                $data = substr($data, 1);
                $option .="-";
            }
            $data = ComplessUtil::dec2dohex(hexdec($data));
            $ret .= $option.$data;
        }
        return $ret;
    }

    /**
     * @param string $str
     * @return string
     */
    public static function decompless($str){
        $bb = explode ("_", $str);
        $ret = "";
        foreach ($bb as $key => $value) {
            $data = $value;
            $option = "";
            while (substr($data, 0, 1) === '-') {
                $data = substr($data, 1);
                $option .="0";
            }
            $ret .= $option.dechex(ComplessUtil::dohex2dec($data));
        }
        return $ret;
    }
    
    protected static function dec2dohex($dec) {
        $HASHTABLE = ComplessUtil::TABLE;
        $result = '';
        $size = mb_strlen($HASHTABLE);
        while ($dec > 0) {
            $mod = $dec % $size;
            $result = $HASHTABLE[$mod] . $result;
            $dec = ($dec - $mod) / $size;
        }
        return $result;
    }
    
    protected static function dohex2dec($dohex) {
        $HASHTABLE = ComplessUtil::TABLE;
        $len = strlen($dohex);
        $size = mb_strlen($HASHTABLE);
        $result = "";
        for ($i = 0; $i < $len; ++$i) {
            for ($j = 0; $j < $size; ++$j) {
                if ($HASHTABLE[$j] == $dohex[$i]) {
                    @$result += $j * pow($size, $len - $i - 1);
                }
            }
        }
        return $result;
    }
}