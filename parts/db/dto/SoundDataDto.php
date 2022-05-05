<?php

use db\dto\DtoBase;

class SoundDataDto extends DtoBase implements SoundDataView {
    
    public function setSoundHash($soundHash){
        parent::putDtoCache(SoundDataView::SOUND_HASH, $soundHash);
    }

    public function getSoundHash() {
        return parent::getDtoCache()[SoundDataView::SOUND_HASH];
    }

    public function setTitle($title){
        parent::putDtoCache(SoundDataView::TITLE, $title);
    }

    public function getTitle(){
        return parent::getDtoCache()[SoundDataView::TITLE];
    }

    public function setGenre($genre){
        parent::putDtoCache(SoundDataView::GENRE, $genre);
    }

    public function getGenre(){
        return parent::getDtoCache()[SoundDataView::GENRE];
    }

    public function setTrackNo($trackNo) {
        parent::putDtoCache(SoundDataView::TRACK_NO, $trackNo);
    }

    public function getTrackNo(){
        return parent::getDtoCache()[SoundDataView::TRACK_NO];
    }

    public function setPlayCount($playCount) {
        parent::putDtoCache(SoundDataView::PLAY_COUNT, $playCount);
    }

    public function getPlayCount(){
        return parent::getDtoCache()[SoundDataView::PLAY_COUNT];
    }

    public function setDataLink($dataLink) {
        parent::putDtoCache(SoundDataView::DATA_LINK, $dataLink);
    }

    public function getDataLink(){
        return parent::getDtoCache()[SoundDataView::DATA_LINK];
    }

    public function setAlbumKey($albumKey) {
        parent::putDtoCache(AlbumTable::ALBUM_KEY, $albumKey);
    }

    public function getAlbumKey() {
        return parent::getDtoCache()[AlbumTable::ALBUM_KEY];
    }

    public function setArtistName($artistName) {
        parent::putDtoCache(SoundDataView::ARTIST_NAME, $artistName);
    }

    public function getArtistName() {
        return parent::getDtoCache()[SoundDataView::ARTIST_NAME];
    }
    
    public function setAlbumTitle($albumTitle){
        parent::putDtoCache(SoundDataView::ALBUM_TITLE, $albumTitle);
    }

    public function getAlbumTitle() {
        return parent::getDtoCache()[SoundDataView::ALBUM_TITLE];
    }

    public function setAlbumArt($albumArt){
        parent::putDtoCache(SoundDataView::ALBUM_ART, $albumArt);
    }

    public function getAlbumArt() {
        return parent::getDtoCache()[SoundDataView::ALBUM_ART];
    }

    public function setArtMime($artMime){
        parent::putDtoCache(SoundDataView::ART_MIME, $artMime);
    }

    public function getArtMime() {
        return parent::getDtoCache()[SoundDataView::ART_MIME];
    }
    
    public function setArtLength($artLength){
        parent::putDtoCache(SoundDataView::ART_LENGTH, $artLength);
    }

    public function getArtLength() {
        return parent::getDtoCache()[SoundDataView::ART_LENGTH];
    }
}