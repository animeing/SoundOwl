<?php

class IniWriter{
	public static function iniWrite($file, $data, $mode = 'w'){
		$fp = fopen($file, $mode);
		if(!flock($fp, LOCK_EX)) return;
	    $keys = "";
    	foreach($data as $key => $values){
    	    $key = str_replace(array("\r\n","\n","\r"), '', $key);
    	    if(is_array($values)){
    	        if($keys !== $key){
    	            fwrite($fp,"[".str_replace(array(';', '&'), '', $key)."]\r\n");
    	            $keys = $key;
    	        }
    	        foreach ($values as $keyd => $value) {
					IniWriter::write($keyd, $value, $fp);
	            }
	        } else {
				IniWriter::write($key, $values, $fp);
	        }
		}
		fclose($fp);
	}

	private static function write($key, $value, $fp){
        if($value === "true" || $value === "false" ||is_numeric($value)){
            fwrite($fp, str_replace(array(';', '&'), '', $key)."=".$value."\r\n");
	    } else {
	        fwrite($fp, str_replace(array(';', '&'), '', $key)."='".$value."'\r\n");
	    }
	}
}
