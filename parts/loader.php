<?php
ob_start();
/**
 * private method
 */
function projectLoader($dir){
    
    require($dir.'/SettingLoad.php');
    
    $xmlFileName = $dir.'loader.xml';
    $datas = simplexml_load_file($xmlFileName);

    foreach($datas->util as $item){
        require($dir.$item);
    }
    foreach($datas->base as $item){
        require($dir.$item);
    }
    foreach($datas->data as $item){
        require($dir.'db/table/'.$item["table"]);
        require($dir.'db/dto/'.$item["dto"]);
        require($dir.'db/dao/'.$item["dao"]);
    }
    foreach($datas->sub as $item){
        require($dir.$item);
    }

    foreach($datas->main as $item){
        require($dir.$item);
    }
}

projectLoader(__DIR__.'/');

