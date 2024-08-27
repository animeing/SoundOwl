<?php

final class StringUtil {
    private function __construct(){}
	
	const EMPTY_STRING = "";
	const TIME_STAMP_FORMAT = "Y-m-d H:i:s";
	
    public static function isNullOrEmpty($variable){
        return (!isset($variable) || $variable == "");
	}
    
	public static function deleteBom($str){
		if (($str == NULL) || (mb_strlen($str) == 0)) {
			return $str;
		}
		$bomcode = hex2bin('EFBBBF');
		return preg_replace("/^$bomcode/", '', $str);
	}

	public static function encloseData($data, $enclose){
		return $enclose.$data.$enclose;
	}

	public static function uniqueRandom($length = 8){
		return substr(str_shuffle('1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLNMOPQRSTUVWXYZ*+=-^~|{}[]`?_<>,.'), 0, $length);
	}
	
	/**
	 * @param string $html 
	 * @return string
	 */
	public static function removeEOL($html){
		$html = preg_replace('[\r\n|\r|\n|'.PHP_EOL.']', "", $html);
		return $html;
	}

	public static function changeHtmlEOL($data){
		return str_replace(PHP_EOL, '<br>', $data);
	}
	/**
	 * @param string $html 
	 * @return string
	 */
	public static function deleteTab($html){
		return preg_replace('[\t|  ]',"", $html);
	}
	/**
	 * @param string $html 
	 * @return string
	 */
	public static function deleteSlashComment($html){
		return preg_replace('[\s//.*'.PHP_EOL.']',"" , $html);
	}
	/**
	 * @param string $html 
	 * @return string
	 */
	public static function deleteJsDocComment($html){
		return preg_replace("/[\/][\*][\*][^\/]*[\*][\/]/s", "", $html);
	}

	public static function deleteString($remove, $text){		
		return str_replace($remove, '', $text);
	}

	/**
	 * 与えられた変数の値を型に応じて変換する関数
	 *
	 * @param mixed $value 変換対象の値
	 * @return bool|int|string 変換後の値
	 */
	public static function convertToAppropriateType($value) {
		if ($value === 'true') {
				return true;
		} elseif ($value === 'false') {
				return false;
		}
		if (is_numeric($value)) {
				return (int)$value;
		}
		return (string)$value;
	}
	
	/**
	 * @param string $javascript 
	 * @return string
	 */
	public static function deleteNonCode($javascript){
		return StringUtil::removeEOL(StringUtil::deleteTab(StringUtil::deleteJsDocComment(StringUtil::deleteSlashComment($javascript))));
	}

	public static function deleteNonCss($css){
		return StringUtil::removeEOL(StringUtil::deleteTab($css));
	}

	public static function deleteNonHtml($html){
		return StringUtil::removeEOL(StringUtil::deleteBom($html));
	}
}
