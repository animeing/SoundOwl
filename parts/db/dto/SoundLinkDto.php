<?php

use db\dto\DtoBase;

class SoundLinkDto extends DtoBase implements SoundLinkTable {
    
    public function setSoundHash($soundHash){
        parent::putDtoCache(SoundLinkTable::SOUND_HASH, $soundHash);
    }

    public function getSoundHash() {
        return parent::getDtoCache()[SoundLinkTable::SOUND_HASH];
    }

    public function setTitle($title){
        parent::putDtoCache(SoundLinkTable::TITLE, $title);
    }

    public function getTitle(){
        return parent::getDtoCache()[SoundLinkTable::TITLE];
    }

    public function setGenre($genre){
        parent::putDtoCache(SoundLinkTable::GENRE, $genre);
    }

    public function getGenre(){
        return parent::getDtoCache()[SoundLinkTable::GENRE];
    }
    
    public function setAlbumId($albumId){
        parent::putDtoCache(SoundLinkTable::ALBUM_ID, $albumId);
    }

    public function getAlbumId(){
        return parent::getDtoCache()[SoundLinkTable::ALBUM_ID];
    }

    public function setArtistId($artistId) {
        parent::putDtoCache(SoundLinkTable::ARTIST_ID, $artistId);
    }

    public function getArtistId(){
        return parent::getDtoCache()[SoundLinkTable::ARTIST_ID];
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
