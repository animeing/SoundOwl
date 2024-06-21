<?php

ini_set('display_errors', "On");

header("Content-Type: text/json");
require_once(dirname(dirname(__FILE__)).'/parts/loader.php');

class UploadResponse {
    public $status;
    public $message;
}

function uploadImpulseResponse() {
    $response = new UploadResponse();

    if (!isset($_FILES['impulseResponse']) || $_FILES['impulseResponse']['error'] !== UPLOAD_ERR_OK) {
        $response->status = 'error';
        $response->message = 'ファイルのアップロードに失敗しました。';
        echo json_encode($response);
        return;
    }

    $file = $_FILES['impulseResponse'];
    $filePath = $file['tmp_name'];
    $fileName = $file['name'];
    $destination = __DIR__ . '/../audio_pulse/' . basename($fileName);

    if (!FileUtil::fileTypesCheck($filePath, ['wav', 'audio/mpeg'])) {
        $response->status = 'error';
        $response->message = 'アップロードできるファイル形式は.wavと.mp3のみです。';
        echo json_encode($response);
        return;
    }

    if (!FileUtil::touchWithDir($destination) || !move_uploaded_file($filePath, $destination)) {
        $response->status = 'error';
        $response->message = 'ファイルの保存に失敗しました。';
        echo json_encode($response);
        return;
    }

    $response->status = 'success';
    $response->message = 'ファイルのアップロードに成功しました。';
    echo json_encode($response);
}

uploadImpulseResponse();
