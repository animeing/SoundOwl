<?php

use db\dto\DtoBase;

class VPlaylistDto extends DtoBase implements VPlaylistTable {
    
    public function setPlayList($playList){
        parent::putDtoCache(VPlaylistTable::PLAY_LIST, $playList);
    }

    public function getPlayList() {
        return parent::getDtoCache()[VPlaylistTable::PLAY_LIST];
    }

    public function setSoundPoint($soundPoint) {
        parent::putDtoCache(VPlaylistTable::SOUND_POINT, $soundPoint);
    }

    public function getSoundPoint() {
        return parent::getDtoCache()[VPlaylistTable::SOUND_POINT];
    }

    public function setSoundHash($soundHash){
        parent::putDtoCache(VPlaylistTable::SOUND_HASH, $soundHash);
    }

    public function getSoundHash() {
        return parent::getDtoCache()[VPlaylistTable::SOUND_HASH];
    }

    public function setTitle($title){
        parent::putDtoCache(VPlaylistTable::TITLE, $title);
    }

    public function getTitle() {
        return parent::getDtoCache()[VPlaylistTable::TITLE];
    }

    public function setGenre($genre){
        parent::putDtoCache(VPlaylistTable::GENRE, $genre);
    }

    public function getGenre() {
        return parent::getDtoCache()[VPlaylistTable::GENRE];
    }

    public function setLyrics($lyrics){
        parent::putDtoCache(VPlaylistTable::LYRICS, $lyrics);
    }

    public function getLyrics() {
        return parent::getDtoCache()[VPlaylistTable::LYRICS];
    }

    public function setAlbumHash($albumHash){
        parent::putDtoCache(VPlaylistTable::ALBUM_HASH, $albumHash);
    }

    public function getAlbumHash() {
        return parent::getDtoCache()[VPlaylistTable::ALBUM_HASH];
    }

    public function setAlbumTitle($albumTitle){
        parent::putDtoCache(VPlaylistTable::ALBUM_TITLE, $albumTitle);
    }

    public function getAlbumTitle() {
        return parent::getDtoCache()[VPlaylistTable::ALBUM_TITLE];
    }

    public function setArtistId($artistId){
        parent::putDtoCache(VPlaylistTable::ARTIST_ID, $artistId);
    }

    public function getArtistId() {
        return parent::getDtoCache()[VPlaylistTable::ARTIST_ID];
    }

    public function setArtistName($artistName){
        parent::putDtoCache(VPlaylistTable::ARTIST_NAME, $artistName);
    }

    public function getArtistName() {
        return parent::getDtoCache()[VPlaylistTable::ARTIST_NAME];
    }

    public function setTrackNo($trackNo){
        parent::putDtoCache(VPlaylistTable::TRACK_NO, $trackNo);
    }

    public function getTrackNo() {
        return parent::getDtoCache()[VPlaylistTable::TRACK_NO];
    }

    public function setPlayCount($playCount){
        parent::putDtoCache(VPlaylistTable::PLAY_COUNT, $playCount);
    }

    public function getPlayCount() {
        return parent::getDtoCache()[VPlaylistTable::PLAY_COUNT];
    }

    public function setDataLink($dataLink){
        parent::putDtoCache(VPlaylistTable::DATA_LINK, $dataLink);
    }

    public function getDataLink() {
        return parent::getDtoCache()[VPlaylistTable::DATA_LINK];
    }
}
