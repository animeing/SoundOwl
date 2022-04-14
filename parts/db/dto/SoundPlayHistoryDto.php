<?php

use db\dto\DtoBase;

class SoundPlayHistoryDto extends DtoBase implements SoundPlayHistoryTable {
    
    public function setId($id){
        parent::putDtoCache(SoundPlayHistoryTable::ID, $id);
    }

    public function getId() {
        return parent::getDtoCache()[SoundPlayHistoryTable::ID];
    }

    public function setSoundHash($soundHash){
        parent::putDtoCache(SoundPlayHistoryTable::SOUND_HASH, $soundHash);
    }

    public function getSoundHash() {
        return parent::getDtoCache()[SoundPlayHistoryTable::SOUND_HASH];
    }
    
    public function setPlayDate($playDate){
        parent::putDtoCache(SoundPlayHistoryTable::PLAY_DATE, $playDate);
    }

    public function getPlayDate() {
        return parent::getDtoCache()[SoundPlayHistoryTable::PLAY_DATE];
    }
}