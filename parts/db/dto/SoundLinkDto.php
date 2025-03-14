<?php

use db\dto\DtoBase;
use db\Attributes\Column;
use db\Attributes\JsonIgnore;

class SoundLinkDto extends DtoBase implements SoundLinkTable {
    
    public function setSoundHash($soundHash){
        parent::putDtoCache(SoundLinkTable::SOUND_HASH, $soundHash);
    }

    #[Column(propertyName: "sound_hash", isVisible: true, isCompless: true)]
    public function getSoundHash() {
        return parent::getDtoCache()[SoundLinkTable::SOUND_HASH];
    }

    public function setAddTime($addTime){
        parent::putDtoCache(SoundLinkTable::ADD_TIME, $addTime);
    }

    #[Column(propertyName: "add_time")]
    public function getAddTime() {
        return parent::getDtoCache()[SoundLinkTable::ADD_TIME];
    }

    public function setTitle($title){
        parent::putDtoCache(SoundLinkTable::TITLE, $title);
    }

    #[Column(propertyName: "title")]
    public function getTitle(){
        return parent::getDtoCache()[SoundLinkTable::TITLE];
    }

    public function setLyrics($lyrics) {
        return parent::putDtoCache(SoundLinkTable::LYRICS, $lyrics);
    }

    #[Column(propertyName: "lyrics")]
    public function getLyrics() {
        return parent::getDtoCache()[SoundLinkTable::LYRICS];
    }

    public function setGenre($genre){
        parent::putDtoCache(SoundLinkTable::GENRE, $genre);
    }

    #[Column(propertyName: "genre")]
    public function getGenre(){
        return parent::getDtoCache()[SoundLinkTable::GENRE];
    }
    
    public function setAlbumHash($albumId){
        parent::putDtoCache(SoundLinkTable::ALBUM_HASH, $albumId);
    }

    #[Column(propertyName: "album_hash", isVisible: true, isCompless: true)]
    public function getAlbumHash(){
        return parent::getDtoCache()[SoundLinkTable::ALBUM_HASH];
    }

    public function setAlbumTitle($albumTitle) {
        parent::putDtoCache(SoundLinkTable::ALBUM_TITLE, $albumTitle);
    }

    #[Column(propertyName: "album_title")]
    public function getAlbumTitle(){
        return parent::getDtoCache()[SoundLinkTable::ALBUM_TITLE];
    }

    public function setArtistId($artistId) {
        parent::putDtoCache(SoundLinkTable::ARTIST_ID, $artistId);
    }

    #[Column(propertyName: "artist_id", isVisible: true, isCompless: true)]
    public function getArtistId(){
        return parent::getDtoCache()[SoundLinkTable::ARTIST_ID];
    }

    public function setArtistName($artistName) {
        parent::putDtoCache(SoundLinkTable::ARTIST_NAME, $artistName);
    }

    #[Column(propertyName: "artist_name")]
    public function getArtistName() {
        return parent::getDtoCache()[SoundLinkTable::ARTIST_NAME];
    }

    public function setTrackNo($trackNo) {
        parent::putDtoCache(SoundLinkTable::TRACK_NO, $trackNo);
    }

    #[Column(propertyName: "track_no")]
    public function getTrackNo(){
        return parent::getDtoCache()[SoundLinkTable::TRACK_NO];
    }

    public function setPlayCount($playCount) {
        parent::putDtoCache(SoundLinkTable::PLAY_COUNT, $playCount);
    }

    #[Column(propertyName: "play_count")]
    public function getPlayCount(){
        return parent::getDtoCache()[SoundLinkTable::PLAY_COUNT];
    }

    public function setDataLink($dataLink) {
        parent::putDtoCache(SoundLinkTable::DATA_LINK, $dataLink);
    }

    #[Column(propertyName: "data_link", isVisible: false)]
    public function getDataLink(){
        return parent::getDtoCache()[SoundLinkTable::DATA_LINK];
    }

    public function setLoudnessTarget($loudnessTarget) {
        return parent::putDtoCache(SoundLinkTable::LOUDNESS_TARGET, $loudnessTarget);
    }

    #[Column(propertyName: "loudness_target")]
    public function getLoudnessTarget() {
        return parent::getDtoCache()[SoundLinkTable::LOUDNESS_TARGET];
    }

    #[Column(propertyName: "mime", isVisible: false)]
    public function getMime() {
        return mime_content_type($this->getDataLink());
    }
}
