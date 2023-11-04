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

    public static function getFileList($dir) {
        if(strpos($dir,'RECYCLE.BIN') !== false) {
            return array();
        }
        $files = glob(rtrim($dir, '/') .  '/*', GLOB_BRACE);
        $list = array();
        foreach ($files as $file) {
            if (is_file($file)) {
                $list[] = $file;
            }
            if (is_dir($file)) {
                $list = array_merge($list, FileUtil::getFileList($file));
            }
        }
        return $list;
    }
    
    /**
     * 指定されたファイルパスのディレクトリが存在しない場合にディレクトリを作成し、
     * ファイルにtouchを実行する関数。
     * 
     * @param string $filePath touchを実行するファイルのパス。
     * 
     * @return bool ディレクトリの作成とファイルのtouchに成功した場合はtrue、
     *              失敗した場合はfalseを返します。
     */
    public static function touchWithDir($filePath) {
        // ファイルが存在するディレクトリを取得
        $directory = dirname($filePath);
    
        // ディレクトリが存在しない場合は作成
        if (!is_dir($directory)) {
            // 再帰的にディレクトリを作成し、失敗したらfalseを返す
            if (!mkdir($directory, 0644, true)) {
                return false;
            }
        }
    
        // ファイルをtouchする
        return touch($filePath);
    }

    /**
     * @param function $action 引数はFilePathが入ってる。
     */
    public static function fileListAction($dir, $action) {
        if(strpos($dir,'RECYCLE.BIN') !== false) {
            return;
        }
        $files = glob(rtrim($dir, '/') .  '/*', GLOB_BRACE);
        foreach ($files as $file) {
            if (is_file($file)) {
                $action($file);
            }
            if (is_dir($file)) {
                FileUtil::fileListAction($file, $action);
            }
        }
    }
}
