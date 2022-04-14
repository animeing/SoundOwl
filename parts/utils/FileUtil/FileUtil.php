<?php

final class FileUtil implements IMimeType{
    public static $SOUND_TYPE = array(FileUtil::MP3, FileUtil::WAV, "audio/mpeg", FileUtil::M4A);
    private function __construct(){}
    
    public static function fileTypeCheck($filePath, $mimeType){
        return strstr(mime_content_type($filePath), $mimeType);
    }

    public static function fileTypesCheck($filePath, $mimeTypes){
        if(is_array($mimeTypes)){
            foreach((array)$mimeTypes as $mimeType){
                if(FileUtil::fileTypeCheck($filePath, $mimeType)){
                    return true;
                }
            }
            return false;
        }
        return false;
    }

    public static function getFileNames($fileDirectory){
        $files = array();
        foreach(glob($fileDirectory.'/*') as $file){
            if(is_file($file)){
                $files[]=($file);
            }
        }
        return $files;
    }
}