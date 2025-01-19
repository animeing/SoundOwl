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
	public static function isUTF8NoCtrl(string $value): bool {
			$length = strlen($value);
			$i = 0;
	
			while ($i < $length) {
					$byte1 = ord($value[$i]);
	
					// ===== 1バイト(ASCII) ====================================
					if ($byte1 < 0x80) {
							// ASCIIコントロール文字またはDEL(0x7F)か？
							if ($byte1 < 0x20 || $byte1 == 0x7F) {
									return false;
							}
							$i++;
							continue;
					}
	
					// ===== 2バイト(U+0080～U+07FF) ===========================
					if (($byte1 & 0xE0) === 0xC0) {
							// 次のバイトが足りない
							if ($i + 1 >= $length) {
									return false;
							}
							$byte2 = ord($value[$i + 1]);
	
							// 後続バイト(10xxxxxx)か？
							if (($byte2 & 0xC0) !== 0x80) {
									return false;
							}
	
							// Unicodeスカラー値(コードポイント)を組み立てる
							$codepoint = (($byte1 & 0x1F) << 6) | ($byte2 & 0x3F);
	
							// 過剰オーバーローンのチェック (本来2バイトで表す範囲なのに小さすぎないか)
							if ($codepoint < 0x80) {
									return false; 
							}
	
							// C1制御文字(U+0080～U+009F)を排除
							if ($codepoint < 0xA0) {
									return false;
							}
	
							$i += 2;
							continue;
					}
	
					// ===== 3バイト(U+0800～U+FFFF) ===========================
					if (($byte1 & 0xF0) === 0xE0) {
							// 次のバイトが足りない
							if ($i + 2 >= $length) {
									return false;
							}
							$byte2 = ord($value[$i + 1]);
							$byte3 = ord($value[$i + 2]);
	
							// 後続バイト(10xxxxxx)か？
							if ((($byte2 & 0xC0) !== 0x80) || (($byte3 & 0xC0) !== 0x80)) {
									return false;
							}
	
							// コードポイントを組み立てる
							$codepoint = (($byte1 & 0x0F) << 12) | 
													 (($byte2 & 0x3F) << 6)  | 
													 ($byte3 & 0x3F);
	
							// 過剰オーバーローンチェック (本来3バイトで表す範囲なのに小さすぎないか)
							if ($codepoint < 0x800) {
									return false;
							}
	
							// サロゲートエリア(U+D800～U+DFFF)や制御文字などもここで除外
							if ($codepoint >= 0xD800 && $codepoint <= 0xDFFF) {
									return false; 
							}
	
							$i += 3;
							continue;
					}
	
					// ===== 4バイト(U+10000～U+10FFFF) =========================
					if (($byte1 & 0xF8) === 0xF0) {
							// 次のバイトが足りない
							if ($i + 3 >= $length) {
									return false;
							}
							$byte2 = ord($value[$i + 1]);
							$byte3 = ord($value[$i + 2]);
							$byte4 = ord($value[$i + 3]);
	
							if ((($byte2 & 0xC0) !== 0x80) ||
									(($byte3 & 0xC0) !== 0x80) ||
									(($byte4 & 0xC0) !== 0x80)) {
									return false;
							}
	
							$codepoint = (($byte1 & 0x07) << 18) |
													 (($byte2 & 0x3F) << 12) |
													 (($byte3 & 0x3F) << 6) |
														($byte4 & 0x3F);
	
							// 4バイトで表せる最大はU+10FFFF。それを超えるなら不正
							if ($codepoint > 0x10FFFF) {
									return false;
							}
	
							// 過剰オーバーローンチェック (本来4バイトで表す範囲なのに小さすぎないか)
							if ($codepoint < 0x10000) {
									return false;
							}
	
							$i += 4;
							continue;
					}
	
					// それ以外はUTF-8として不正
					return false;
			}
	
			// 全ての文字が形式的にUTF-8かつ、制御文字が含まれない場合
			return true;
	}
 /**
	* 文字列に制御文字が含まれているかをチェックする関数
	*
	* @param string $str チェックする文字列
	* @return bool 制御文字が含まれている場合は true、そうでない場合は false
	*/
	public static function containsControlCharacters($str, $allowedControls = ["\n", "\r", "\t"]) {
		 
		 // 文字列を1文字ずつチェック
		 $length = mb_strlen($str, 'UTF-8');
		 for ($i = 0; $i < $length; $i++) {
				 $char = mb_substr($str, $i, 1, 'UTF-8');
				 $ord = ord($char);
				 // 制御文字かどうかをチェック
				 if ($ord < 32 || $ord === 127) {
						 // 許容制御文字に含まれていない場合
						 if (!in_array($char, $allowedControls)) {
								 return true;
						 }
				 }
		 }
		 return false;
  }

  public static function detectMojibakeWithIconv(string $text, string $fromEncoding = 'UTF-8', string $toEncoding = 'UTF-8'): bool {
	  $converted = @iconv($fromEncoding, $toEncoding . '//IGNORE', $text);
	  return $converted !== $text;
  }
	
	public static function convertAndValidateEncoding ($text, $to_encoding, $from_encoding, $isReadable=false) {
		$mb_enc = mb_convert_encoding($text, $to_encoding, $from_encoding);
		$rev_enc = mb_convert_encoding($mb_enc, $from_encoding, $to_encoding);
		if($text === $rev_enc) {
				if(!$isReadable){
						return $mb_enc;
				}
				$ico_enc = @iconv($from_encoding, $to_encoding.'//IGNORE', $text);
				$rev_ico_enc = @iconv($to_encoding, $from_encoding.'//IGNORE', $ico_enc);
				if($mb_enc === $ico_enc && $rev_ico_enc === $text) {
						return $ico_enc;
				}
		}
		return false;
	}
	public static function fixMojibakeByCharacters($garbled, $allowedControls = ["\n", "\r", "\t"]) {
    $encodings = mb_list_encodings();
    // 文字化け修正対象外のエンコードリスト
    $unsupported_encodings  = [
			'BASE64',
			'HTML-ENTITIES',
			'7bit',
			'8bit',
			'UCS-2',
			'UCS-2LE',
			'UCS-2BE',
			'UCS-4',
			'UCS-4LE',
			'UCS-4BE',
			'byte2be',
			'byte2le',
			'byte4be',
			'byte4le',
		];
    $list = array_diff($encodings, $unsupported_encodings );
    // 一般的なエンコーディングを優先するリスト
    $priority_encodings =  [
        'UTF-8',       // 世界中で最も一般的
        'ISO-8859-1',  // 西ヨーロッパ言語
        'ISO-8859-15', // ユーロ記号対応版
        'Shift_JIS',   // 日本
        'Windows-1252',// 西ヨーロッパ言語 (Windows標準)
        'EUC-JP',      // 日本
        'GB2312',      // 簡体字中国語
        'Big5',        // 繁体字中国語
        'ISO-2022-JP', // 日本 (古い電子メールなど)
    ];
		
    // 一般的なエンコーディングを前方に配置
    $correctEncodings = array_unique(array_merge($priority_encodings, $list));
    $wrongEncodings = $correctEncodings;
    $wrongEncodings = array_diff($wrongEncodings, ['UTF-8']);
    return self::fixMojibakeByControlCharacters($garbled, $allowedControls, $wrongEncodings, $correctEncodings);
  }
	/**
	 * 文字化けを修正する関数（制御文字の有無を基準）
	 *
	 * @param string $garbled テキスト
	 * @param array $wrongEncodings 誤って解釈されたエンコーディングのリスト
	 * @param array $correctEncodings 正しく解釈すべきエンコーディングのリスト
	 * @return string|bool 修正されたテキストまたはfalse（修正できなかった場合）
	 */
	public static function fixMojibakeByControlCharacters($garbled, $allowedControls = ["\n", "\r", "\t"], $wrongEncodings, $correctEncodings) {
			foreach ($wrongEncodings as $wrongEncoding) {
					$bytes = self::convertAndValidateEncoding ($garbled, $wrongEncoding, 'UTF-8');
					if($bytes === false) {
						continue;
					}
					foreach ($correctEncodings as $correctEncoding) {
							$fixed = self::convertAndValidateEncoding ($bytes, 'UTF-8', $correctEncoding, true);
							if($fixed === false) {
								continue;
							}
							if (!self::containsControlCharacters($fixed, $allowedControls) && !self::detectMojibakeWithIconv($fixed) && self::isUTF8NoCtrl($fixed)) {
									return $fixed;
							}
					}
			}
			return false;
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
