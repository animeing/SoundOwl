<?php
require(dirname(__DIR__).'/parts/loader.php');

$media_hash = $_GET["media_hash"] ?? '';
$decrypted = ComplessUtil::decompless(urldecode($media_hash));

$soundLinkDao = new SoundLinkDao;
$soundDto = null;
foreach($soundLinkDao->find($decrypted) as $findSoundLinkDto) {
    if($findSoundLinkDto->getSoundHash() == $decrypted) {
        $soundDto = $findSoundLinkDto;
        break;
    }
}

if($soundDto == null) {
    http_response_code(404);
    exit;
}

define("PATH", $soundDto->getDataLink());
$mime_type = mime_content_type(PATH);
$fileSize = filesize(PATH);

header("Accept-Ranges: bytes"); 
header("ETag: \"" .(sha1($decrypted))."\"" );
header("Accept: {$mime_type}");
header("Content-type: {$mime_type}");

$rangeOffset = 0;
$rangeLimit = $fileSize - 1;

if (isset($_SERVER["HTTP_RANGE"])){
    list($rangeOffset, $rangeLimit) = sscanf($_SERVER['HTTP_RANGE'], "bytes=%d-%d");
    $rangeLimit = $rangeLimit != "" ? $rangeLimit : $fileSize - 1;
    http_response_code ($rangeOffset != 0 ? 206 : 200);
    $contentRange = sprintf("bytes %d-%d/%d", $rangeOffset, $rangeLimit, $fileSize);
    header("Content-Range: {$contentRange}");
    $contentLength  = $rangeLimit - $rangeOffset + 1;
    header("Content-Length: {$contentLength}");
    header("Keep-Alive: timeout=10, max{$contentLength}");
    set_time_limit(0);
    $contentPointer = fopen(PATH, "rb");
    fseek($contentPointer, $rangeOffset);
    $load = 8192;
    $loop = ceil(($rangeLimit - $rangeOffset + 1) / $load);
    $counter = 0;
    $bf="";
    $limitLength = $contentLength;
    @ob_end_clean();
    while($counter < $loop && !connection_aborted()){
        $load = min($limitLength, $load);
        $bf = fread($contentPointer, $load);
        echo $bf;
        $limitLength -= $load;
        $counter++;
    }
    @flush();
    @ob_flush();
    fclose($contentPointer);
} else {
    header("Keep-Alive: timeout=15");
    header('Content-Length: ' . $fileSize );
    header("Content-Range: bytes 0-".($fileSize-1)."/".$fileSize );
    http_response_code(200);
    readfile(PATH);
}
