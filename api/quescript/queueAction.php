<?php

// 必要な拡張が有効か確認
if (!function_exists('pcntl_fork')) {
    die("PCNTL functions not available on this PHP installation.\n");
}

require_once(__DIR__. '/../../vendor/autoload.php');
require_once(__DIR__.'/../../parts/loader.php');

use Predis\Client;

// Redisクライアントの設定
$predis = new Client([
    'host' => REDIS_SERVER
]);

define('AUDIO_REGIST_LOCK_PATH', __DIR__.'/../lock/sound_volume_calc.lock');

// 音量計算関数
function calcVolume($filePath, $patterns) {
    // ffmpegコマンドの構築
    $escapedPath = escapeshellarg($filePath);
    $command = "ffmpeg -i $escapedPath -filter:a volumedetect -f null - 2>&1";
    
    // コマンドの実行
    $output = shell_exec($command);
    $results = [];
    
    // パターンマッチング
    foreach ($patterns as $key => $pattern) {
        if (preg_match($pattern, $output, $matches)) {
            $results[$key] = $matches[1];
        }
    }
    
    return $results;
}

// 正規表現パターンを事前に定義
$volumePatterns = [
    'mean_volume' => "/mean_volume: ([\-\d\.]+) dB/",
    'max_volume' => "/max_volume: ([\-\d\.]+) dB/"
];

// SoundLinkDaoをループ外でインスタンス化
$soundDao = new SoundLinkDao();

// 最大並列プロセス数
$maxProcesses = 5;
$currentProcesses = 0;

// 子プロセスのPIDを保持
$childPids = [];

// シグナルハンドラの設定
pcntl_signal(SIGCHLD, function($signo) use (&$currentProcesses, &$childPids) {
    while (($pid = pcntl_waitpid(-1, $status, WNOHANG)) > 0) {
        $currentProcesses--;
        unset($childPids[$pid]);
    }
});

// メインループ
while (true) {
    // シグナルを処理
    pcntl_signal_dispatch();
    
    // 現在のプロセス数が最大に達している場合、子プロセスの終了を待つ
    if ($currentProcesses >= $maxProcesses) {
        // 短時間待機してから再度チェック
        usleep(100000); // 100ms
        continue;
    }
    
    // Redisからジョブをブロック取得
    list($queueName, $jobData) = $predis->brpop('queue:audio-processing', 5) ?: [null, null];
    
    if ($jobData) {
        $pid = pcntl_fork();
        if ($pid == -1) {
            // フォーク失敗
            echo "プロセスのフォークに失敗しました。\n";
            continue;
        } elseif ($pid) {
            // 親プロセス
            $currentProcesses++;
            $childPids[$pid] = true;
        } else {
            // 子プロセス
            // ロックファイルの存在チェックと作成
            if (!is_file(AUDIO_REGIST_LOCK_PATH)) {
                FileUtil::touchWithDir(AUDIO_REGIST_LOCK_PATH);
            }
            
            // ジョブデータのデコード
            $messageData = json_decode($jobData, true);
            if (!isset($messageData['hash'], $messageData['file_path'])) {
                // 必要なデータがない場合はスキップ
                echo "無効なジョブデータです。\n";
                exit(1);
            }
            
            // 対応するSoundLinkDtoの検索
            $soundLinkDto = null;
            foreach ($soundDao->find($messageData['hash']) as $find) {
                if ($messageData['file_path'] === $find->getDataLink()) {
                    $soundLinkDto = $find;
                    break; // 見つかったらループを抜ける
                }
            }
            
            if ($soundLinkDto === null) {
                // 該当するデータが見つからない場合はスキップ
                echo "該当するSoundLinkDtoが見つかりません。\n";
                exit(1);
            }
            
            // 音量の計算
            $volume = calcVolume($messageData['file_path'], $volumePatterns);
            if (isset($volume['mean_volume'])) {
                $soundLinkDto->setLoudnessTarget($volume['mean_volume']);
                $soundDao->update($soundLinkDto);
                echo "音量が更新されました: " . $volume['mean_volume'] . " dB\n";
            } else {
                echo "音量の計算に失敗しました。\n";
            }
            
            // 子プロセスを終了
            exit(0);
        }
    } else {
        // ロックファイルの削除
        if ($currentProcesses == 0 && is_file(AUDIO_REGIST_LOCK_PATH)) {
            unlink(AUDIO_REGIST_LOCK_PATH);
        }
    }
    
    // 少し待機
    usleep(50000); // 50ms
}
