<?php

use db\dto\DtoBase;

class AlbumDto extends DtoBase implements AlbumTable {
    
    public function setTitle($albumTitle){
        parent::putDtoCache(AlbumTable::TITLE, $albumTitle);
    }

    public function getTitle() {
        return parent::getDtoCache()[AlbumTable::TITLE];
    }

    public function setAlbumId($albumId){
        parent::putDtoCache(AlbumTable::ALBUM_ID, $albumId);
    }

    public function getAlbumId() {
        return parent::getDtoCache()[AlbumTable::ALBUM_ID];
    }

    public function setAlbumArt($albumArt){
        parent::putDtoCache(AlbumTable::ALBUM_ART, $albumArt);
    }

    public function getAlbumArt() {
        return parent::getDtoCache()[AlbumTable::ALBUM_ART];
    }
}