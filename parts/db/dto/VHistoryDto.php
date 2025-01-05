<?php

use db\dto\DtoBase;
use db\Attributes\Column;

class VHistoryDto extends DtoBase implements VHistoryTable {
    
    public function setId($id) {
        parent::putDtoCache(VHistoryTable::ID, $id);
    }

    #[Column(propertyName: "id")]
    public function getId() {
        return parent::getDtoCache()[VHistoryTable::ID];
    }

    public function setSoundHash($soundHash){
        parent::putDtoCache(VHistoryTable::SOUND_HASH, $soundHash);
    }

    #[Column(propertyName: "sound_hash", isVisible: true, isCompless: true)]
    public function getSoundHash() {
        return parent::getDtoCache()[VHistoryTable::SOUND_HASH];
    }

    public function setPlayDate($playDate){
        parent::putDtoCache(VHistoryTable::PLAY_DATE, $playDate);
    }

    #[Column(propertyName: "play_date")]
    public function getPlayDate() {
        return parent::getDtoCache()[VHistoryTable::PLAY_DATE];
    }

    public function setTitle($title){
        parent::putDtoCache(VHistoryTable::TITLE, $title);
    }

    #[Column(propertyName: "title")]
    public function getTitle() {
        return parent::getDtoCache()[VHistoryTable::TITLE];
    }

    public function setGenre($genre){
        parent::putDtoCache(VHistoryTable::GENRE, $genre);
    }

    #[Column(propertyName: "genre")]
    public function getGenre() {
        return parent::getDtoCache()[VHistoryTable::GENRE];
    }

    public function setLyrics($lyrics){
        parent::putDtoCache(VHistoryTable::LYRICS, $lyrics);
    }

    #[Column(propertyName: "lyrics")]
    public function getLyrics() {
        return parent::getDtoCache()[VHistoryTable::LYRICS];
    }

    public function setAlbumHash($albumHash){
        parent::putDtoCache(VHistoryTable::ALBUM_HASH, $albumHash);
    }

    #[Column(propertyName: "album_hash", isVisible: true, isCompless: true)]
    public function getAlbumHash() {
        return parent::getDtoCache()[VHistoryTable::ALBUM_HASH];
    }

    public function setAlbumTitle($albumTitle){
        parent::putDtoCache(VHistoryTable::ALBUM_TITLE, $albumTitle);
    }

    #[Column(propertyName: "album_title")]
    public function getAlbumTitle() {
        return parent::getDtoCache()[VHistoryTable::ALBUM_TITLE];
    }
    public function setArtistId($artistId){
        parent::putDtoCache(VHistoryTable::ARTIST_ID, $artistId);
    }

    #[Column(propertyName: "artist_id", isVisible: true, isCompless: true)]
    public function getArtistId() {
        return parent::getDtoCache()[VHistoryTable::ARTIST_ID];
    }

    public function setArtistName($artistName){
        parent::putDtoCache(VHistoryTable::ARTIST_NAME, $artistName);
    }

    #[Column(propertyName: "artist_name")]
    public function getArtistName() {
        return parent::getDtoCache()[VHistoryTable::ARTIST_NAME];
    }

    public function setTrackNo($trackNo){
        parent::putDtoCache(VHistoryTable::TRACK_NO, $trackNo);
    }

    #[Column(propertyName: "track_no")]
    public function getTrackNo() {
        return parent::getDtoCache()[VHistoryTable::TRACK_NO];
    }

    public function setPlayCount($playCount){
        parent::putDtoCache(VHistoryTable::PLAY_COUNT, $playCount);
    }

    #[Column(propertyName: "play_count")]
    public function getPlayCount() {
        return parent::getDtoCache()[VHistoryTable::PLAY_COUNT];
    }

    public function setDataLink($dataLink){
        parent::putDtoCache(VHistoryTable::DATA_LINK, $dataLink);
    }

    #[Column(propertyName: "data_link", isVisible: false)]
    public function getDataLink() {
        return parent::getDtoCache()[VHistoryTable::DATA_LINK];
    }

    public function setLoudnessTarget($loudnessTarget){
        parent::putDtoCache(VHistoryTable::LOUDNESS_TARGET, $loudnessTarget);
    }

    #[Column(propertyName: "loudness_target")]
    public function getLoudnessTarget() {
        return parent::getDtoCache()[VHistoryTable::LOUDNESS_TARGET];
    }
}
