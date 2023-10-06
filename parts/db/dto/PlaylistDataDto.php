<?php

use db\dto\DtoBase;

class PlaylistDataDto extends DtoBase implements PlaylistDataTable {

    public function setPlayList($playList) {
        parent::putDtoCache(PlaylistDataTable::PLAY_LIST, $playList);
    }

    public function getPlayList() {
        return parent::getDtoCache()[PlaylistDataTable::PLAY_LIST];
    }

    public function setArt($art) {
        parent::putDtoCache(PlaylistDataTable::ART, $art);
    }

    public function getArt() {
        return parent::getDtoCache()[PlaylistDataTable::ART];
    }

    public function setCreateDatetime($createDatetime) {
        parent::putDtoCache(PlaylistDataTable::CREATE_DATETIME, $createDatetime);
    }

    public function getCreateDatetime() {
        return parent::getDtoCache()[PlaylistDataTable::CREATE_DATETIME];
    }

    public function setUpdateDatetime($updateDatetime) {
        parent::putDtoCache(PlaylistDataTable::UPDATE_DATETIME, $updateDatetime);
    }

    public function getUpdateDatetime() {
        return parent::getDtoCache()[PlaylistDataTable::UPDATE_DATETIME];
    }
}
