<?php

error_reporting(E_ALL & ~E_WARNING);
require(dirname(__DIR__).'/parts/loader.php');
header("Content-Type: text/json");

class DeleteResponse {
    public $status;
    public $message;
}

function deleteImpulseResponse() {
    $response = new DeleteResponse();

    if (!isset($_POST['preset'])) {
        $response->status = 'error';
        $response->message = '削除するプリセットが指定されていません。';
        echo json_encode($response);
        return;
    }

    $preset = $_POST['preset'];
    $filePath = __DIR__ . '/../audio_pulse/' . basename($preset);
    print($filePath);
    if (!file_exists($filePath)) {
        $response->status = 'error';
        $response->message = '指定されたファイルが存在しません。';
        echo json_encode($response);
        return;
    }

    if (!unlink($filePath)) {
        $response->status = 'error';
        $response->message = 'ファイルの削除に失敗しました。';
        echo json_encode($response);
        return;
    }

    $response->status = 'success';
    $response->message = 'ファイルの削除に成功しました。';
    echo json_encode($response);
}

deleteImpulseResponse();
