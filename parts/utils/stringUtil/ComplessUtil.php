<?php
/**
 * あんまり圧縮されない。。。。
 */
final class ComplessUtil{
    private function __construct() {}

    const TABLE = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@,.<>[]:;!$()";

    public static function compless($str){
        if(!$str) {
            $str = '';
        }
        $chunks = str_split($str, 9);
        $result = [];

        foreach ($chunks as $chunk) {
            $data = ltrim($chunk, '0');
            $prefix = str_repeat("-", strlen($chunk) - strlen($data));
            $encoded = self::dec2dohex(hexdec($data));
            $result[] = $prefix . $encoded;
        }

        return implode('_', $result);
    }

    public static function decompless($str){
        $chunks = explode("_", $str);
        $result = [];

        foreach ($chunks as $chunk) {
            $data = ltrim($chunk, '-');
            $prefix = str_repeat("0", strlen($chunk) - strlen($data));
            $decoded = dechex(self::dohex2dec($data));
            $result[] = $prefix . $decoded;
        }

        return implode('', $result);
    }

    protected static function dec2dohex($dec) {
        $result = '';
        $tableLength = strlen(self::TABLE);

        while ($dec > 0) {
            $mod = $dec % $tableLength;
            $result = self::TABLE[$mod] . $result;
            $dec = ($dec - $mod) / $tableLength;
        }
        
        return $result;
    }

    protected static function dohex2dec($dohex) {
        $len = strlen($dohex);
        $tableLength = strlen(self::TABLE);
        $result = 0;

        for ($i = 0; $i < $len; $i++) {
            $index = strpos(self::TABLE, $dohex[$i]);
            if ($index !== false) {
                $result += $index * pow($tableLength, $len - $i - 1);
            }
        }
        
        return $result;
    }
}
