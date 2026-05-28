<?php

require_once(__DIR__ . '/../vendor/autoload.php');
require_once(__DIR__ . '/../parts/loader.php');

use Predis\Client;

$command = $argv[1] ?? '';
$hash = '8ee9a84fa1a11e5dcf6598db5f013c492e3c0dd6';
$filePath = '/music/contract-fixture/track-03.wav';
$lockPath = __DIR__ . '/../api/lock/sound_volume_calc.lock';

function worker_db(): PDO {
    return new PDO(DB_DSN, DB_USER, DB_PASSWORD, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

function worker_redis(): Client {
    return new Client(['host' => REDIS_SERVER]);
}

switch ($command) {
    case 'reset':
        @unlink($lockPath);
        $redis = worker_redis();
        $redis->del(['queue:audio-processing']);
        $db = worker_db();
        $stmt = $db->prepare('UPDATE sound_link SET loudness_target = 0 WHERE sound_hash = ?');
        $stmt->execute([$hash]);
        echo json_encode(['status' => 'ok']);
        break;

    case 'restore':
        @unlink($lockPath);
        $redis = worker_redis();
        $redis->del(['queue:audio-processing']);
        $db = worker_db();
        $stmt = $db->prepare('UPDATE sound_link SET loudness_target = 0 WHERE sound_hash = ?');
        $stmt->execute([$hash]);
        echo json_encode(['status' => 'ok']);
        break;

    case 'push-valid':
        worker_redis()->lpush('queue:audio-processing', [json_encode([
            'file_path' => $filePath,
            'hash' => $hash,
        ])]);
        echo json_encode(['status' => 'ok']);
        break;

    case 'push-invalid':
        worker_redis()->lpush('queue:audio-processing', [json_encode(['hash' => $hash])]);
        echo json_encode(['status' => 'ok']);
        break;

    case 'loudness':
        $db = worker_db();
        $stmt = $db->prepare('SELECT loudness_target FROM sound_link WHERE sound_hash = ?');
        $stmt->execute([$hash]);
        echo json_encode(['loudness_target' => $stmt->fetchColumn()]);
        break;

    case 'lock':
        echo json_encode(['exists' => file_exists($lockPath)]);
        break;

    default:
        fwrite(STDERR, "unknown command\n");
        exit(2);
}
