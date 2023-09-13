<?php

use db\dto\DtoBase;

class PlayListDto extends DtoBase implements PlayListTable {

    public function setID($id){
        parent::putDtoCache(PlayListTable::ID, $id);
    }

    public function getID() {
        return parent::getDtoCache()[PlayListTable::ID];
    }

    public function setPlayList($name) {
        parent::putDtoCache(PlayListTable::PLAY_LIST, $name);
    }

    public function getPlayList() {
        return parent::getDtoCache()[PlayListTable::PLAY_LIST];
    }

    public function setSoundPoint($soundPoint) {
        parent::putDtoCache(PlayListTable::SOUND_POINT, $soundPoint);
    }

    public function getSoundPoint() {
        return parent::getDtoCache()[PlayListTable::SOUND_POINT];
    }
    
    public function setSoundHash($soundHash){
        parent::putDtoCache(SoundLinkTable::SOUND_HASH, $soundHash);
    }

    public function getSoundHash() {
        return parent::getDtoCache()[SoundLinkTable::SOUND_HASH];
    }
}

