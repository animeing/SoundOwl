<?php

use db\dto\DtoBase;

class SoundLinkDto extends DtoBase implements SoundLinkTable {
    
    public function setSoundHash($soundHash){
        parent::putDtoCache(SoundLinkTable::SOUND_HASH, $soundHash);
    }

    public function getSoundHash() {
        return parent::getDtoCache()[SoundLinkTable::SOUND_HASH];
    }

    public function setAddTime($addTime){
        parent::putDtoCache(SoundLinkTable::ADD_TIME, $addTime);
    }

    public function getAddTime() {
        return parent::getDtoCache()[SoundLinkTable::ADD_TIME];
    }

    public function setTitle($title){
        parent::putDtoCache(SoundLinkTable::TITLE, $title);
    }

    public function getTitle(){
        return parent::getDtoCache()[SoundLinkTable::TITLE];
    }

    public function setLyrics($lyrics) {
        return parent::putDtoCache(SoundLinkTable::LYRICS, $lyrics);
    }

    public function getLyrics() {
        return parent::getDtoCache()[SoundLinkTable::LYRICS];
    }

    public function setGenre($genre){
        parent::putDtoCache(SoundLinkTable::GENRE, $genre);
    }

    public function getGenre(){
        return parent::getDtoCache()[SoundLinkTable::GENRE];
    }
    
    public function setAlbumHash($albumId){
        parent::putDtoCache(SoundLinkTable::ALBUM_HASH, $albumId);
    }

    public function getAlbumHash(){
        return parent::getDtoCache()[SoundLinkTable::ALBUM_HASH];
    }

    public function setAlbumTitle($albumTitle) {
        parent::putDtoCache(SoundLinkTable::ALBUM_TITLE, $albumTitle);
    }

    public function getAlbumTitle(){
        return parent::getDtoCache()[SoundLinkTable::ALBUM_TITLE];
    }

    public function setArtistId($artistId) {
        parent::putDtoCache(SoundLinkTable::ARTIST_ID, $artistId);
    }

    public function getArtistId(){
        return parent::getDtoCache()[SoundLinkTable::ARTIST_ID];
    }

    public function setArtistName($artistName) {
        parent::putDtoCache(SoundLinkTable::ARTIST_NAME, $artistName);
    }

    public function getArtistName() {
        return parent::getDtoCache()[SoundLinkTable::ARTIST_NAME];
    }

    public function setTrackNo($trackNo) {
        parent::putDtoCache(SoundLinkTable::TRACK_NO, $trackNo);
    }

    public function getTrackNo(){
        return parent::getDtoCache()[SoundLinkTable::TRACK_NO];
    }

    public function setPlayCount($playCount) {
        parent::putDtoCache(SoundLinkTable::PLAY_COUNT, $playCount);
    }

    public function getPlayCount(){
        return parent::getDtoCache()[SoundLinkTable::PLAY_COUNT];
    }

    public function setDataLink($dataLink) {
        parent::putDtoCache(SoundLinkTable::DATA_LINK, $dataLink);
    }

    public function getDataLink(){
        return parent::getDtoCache()[SoundLinkTable::DATA_LINK];
    }
}
