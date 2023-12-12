<?php

require_once(__DIR__. '/../../vendor/autoload.php');
require_once(__DIR__.'/../../parts/loader.php');

$predis = new Predis\Client([
    'host'=>REDIS_SERVER
]);

define('AUDIO_REGIST_LOCK_PATH', __DIR__.'/../lock/sound_volume_calc.lock');
function calcVolume($filePath) {
    $command = "ffmpeg -i '".escapeshellarg($filePath)."' -filter:a volumedetect -f null - 2>&1";
    $output = shell_exec($command);
    $patterns = [
        'mean_volume' => "/mean_volume: ([\-\d\.]+) dB/",
        'max_volume' => "/max_volume: ([\-\d\.]+) dB/"
    ];
    $results = [];
    foreach ($patterns as $key => $pattern) {
        if (preg_match($pattern, $output, $matches)) {
            $results[$key] = $matches[1];
        }
    }
    return $results;
}



while (true) {
    list($queueName, $jobData) = $predis->brpop('queue:audio-processing', 5) ?: [null, null];
    if ($jobData) {
        FileUtil::touchWithDir(AUDIO_REGIST_LOCK_PATH);
        $messageData = json_decode($jobData, true);
        $soundDao = new SoundLinkDao();
        $soundLinkDto = null;
        foreach($soundDao->find($messageData['hash']) as $find) {
            if($messageData['file_path'] == $find->getDataLink()) {
                $soundLinkDto = $find;
            }
        }
        if($soundLinkDto == null){
            sleep(1);
            continue;
        }
        $volume = calcVolume($messageData['file_path']);
        $soundLinkDto->setLoudnessTarget($volume['mean_volume']);
        $soundDao->update($soundLinkDto);
    } else {
        echo "キューが空です。待機...\n";
        if(is_file(AUDIO_REGIST_LOCK_PATH)){
            unlink(AUDIO_REGIST_LOCK_PATH);
        }
    }
    sleep(1);
}

