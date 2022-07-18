<?php

error_reporting(E_ALL & ~E_WARNING);
require(dirname(__DIR__).'/parts/loader.php');

$decrypted = ComplessUtil::decompless((urldecode($_GET["media_hash"])));
$soundLinkDao = new SoundLinkDao;
$soundDto = null;
foreach($soundLinkDao->find($decrypted) as $findSoundLinkDto) {
    if($findSoundLinkDto->getSoundHash() == $decrypted) {
        $soundDto = $findSoundLinkDto;
        break;
    }
}
if($soundDto == null) {
    return;
}
header("Accept-Ranges: bytes"); 
header("ETag: \"" .(sha1($decrypted))."\"" );
define("path", $soundDto->getDataLink());
$mime_type = mime_content_type(path);
header("Accept: {$mime_type}");
header("Content-type: {$mime_type}");

if (isset($_SERVER["HTTP_RANGE"])){
    list($rangeOffset, $rangeLimit) = sscanf($_SERVER['HTTP_RANGE'], "bytes=%d-%d");
    if($rangeLimit == ""){
        $rangeLimit = filesize(path)-1;
    }
    if($rangeOffset != 0){
        http_response_code (206);
    } else {
        http_response_code (200);
    }
    $contentRange = sprintf("bytes %d-%d/%d", $rangeOffset, $rangeLimit, filesize(path));
    header("Content-Range: {$contentRange}");
    $contentLength  = $rangeLimit - $rangeOffset + 1;
    header("Content-Length: {$contentLength}");
    header("Keep-Alive: timeout=10, max{$contentLength}");
    $contentPointer = fopen(path, "rb");
    fseek($contentPointer, $rangeOffset);
    $load = 8192;
    $loop = ceil($rangeLimit / $load);
    $counter = 0;
    $bf="";
    $limitLength = $contentLength;
    @ob_end_clean();
    while($counter < $loop && !connection_aborted()){
        set_time_limit(0);
        if($limitLength-$load >= 0){
            $load = $limitLength;
        }
        $bf = fread($contentPointer, $load);
        echo $bf;
        $counter++;
    }
    @flush();
    @ob_flush();
    fclose($contentPointer);
} else {
    header("Keep-Alive: timeout=15");
    header('Content-Length: ' . filesize(path) );
    header("Content-Range: bytes 0-".(filesize(path)-1)."/".filesize(path) );
    header("HTTP/1.1 200 OK");

    readfile($file);
}
exit;