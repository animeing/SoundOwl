<?php

use db\dto\DtoBase;

class AlbumDto extends DtoBase implements AlbumTable {
    
    public function setTitle($albumTitle){
        parent::putDtoCache(AlbumTable::TITLE, $albumTitle);
    }

    public function getTitle() {
        return parent::getDtoCache()[AlbumTable::TITLE];
    }

    public function setAlbumHash($albumHash){
        parent::putDtoCache(AlbumTable::ALBUM_HASH, $albumHash);
    }

    public function getAlbumHash() {
        return parent::getDtoCache()[AlbumTable::ALBUM_HASH];
    }

    public function setAlbumArt($albumArt){
        parent::putDtoCache(AlbumTable::ALBUM_ART, $albumArt);
    }

    public function getAlbumArt() {
        return parent::getDtoCache()[AlbumTable::ALBUM_ART];
    }

    public function setArtMime($artMime){
        parent::putDtoCache(AlbumTable::ART_MIME, $artMime);
    }

    public function getArtMime() {
        return parent::getDtoCache()[AlbumTable::ART_MIME];
    }
    
    public function setArtLength($artLength){
        parent::putDtoCache(AlbumTable::ART_LENGTH, $artLength);
    }

    public function getArtLength() {
        return parent::getDtoCache()[AlbumTable::ART_LENGTH];
    }
}