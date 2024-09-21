<?php

use db\dto\DtoBase;

class AlbumDto extends DtoBase implements AlbumTable {
    
    public function setTitle($albumTitle){
        parent::putDtoCache(AlbumTable::TITLE, $albumTitle);
    }

    public function getTitle() {
        return parent::getDtoCache()[AlbumTable::TITLE];
    }

    public function setAlbumKey($albumKey) {
        parent::putDtoCache(AlbumTable::ALBUM_KEY, $albumKey);
    }

    public function getAlbumKey() {
        return parent::getDtoCache()[AlbumTable::ALBUM_KEY];
    }

    public function setAlbumId($albumId){
        parent::putDtoCache(AlbumTable::ALBUM_ID, $albumId);
    }

    public function getAlbumId() {
        return parent::getDtoCache()[AlbumTable::ALBUM_ID];
    }

    public function setArtistId($artistId){
        parent::putDtoCache(AlbumTable::ARTIST_ID, $artistId);
    }

    public function getArtistId() {
        return parent::getDtoCache()[AlbumTable::ARTIST_ID];
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
    public function setYear($year) {
        parent::putDtoCache(AlbumTable::YEAR, $year);
    }

    public function getYear() {
        return parent::getDtoCache()[AlbumTable::YEAR];
    }
}