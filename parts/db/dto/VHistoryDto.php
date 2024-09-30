<?php

use db\dto\DtoBase;

class VHistoryDto extends DtoBase implements VHistoryTable {
    
    public function setId($id) {
        parent::putDtoCache(VHistoryTable::ID, $id);
    }

    /**
     * @db\Annotation\Column(id)
     */
    public function getId() {
        return parent::getDtoCache()[VHistoryTable::ID];
    }

    public function setSoundHash($soundHash){
        parent::putDtoCache(VHistoryTable::SOUND_HASH, $soundHash);
    }

    /**
     * @db\Annotation\Column(sound_hash, true, true)
     */
    public function getSoundHash() {
        return parent::getDtoCache()[VHistoryTable::SOUND_HASH];
    }

    public function setPlayDate($playDate){
        parent::putDtoCache(VHistoryTable::PLAY_DATE, $playDate);
    }

    /**
     * @db\Annotation\Column(play_date)
     */
    public function getPlayDate() {
        return parent::getDtoCache()[VHistoryTable::PLAY_DATE];
    }

    public function setTitle($title){
        parent::putDtoCache(VHistoryTable::TITLE, $title);
    }

    /**
     * @db\Annotation\Column(title)
     */
    public function getTitle() {
        return parent::getDtoCache()[VHistoryTable::TITLE];
    }

    public function setGenre($genre){
        parent::putDtoCache(VHistoryTable::GENRE, $genre);
    }

    /**
     * @db\Annotation\Column(genre)
     */
    public function getGenre() {
        return parent::getDtoCache()[VHistoryTable::GENRE];
    }

    public function setLyrics($lyrics){
        parent::putDtoCache(VHistoryTable::LYRICS, $lyrics);
    }

    /**
     * @db\Annotation\Column(lyrics)
     */
    public function getLyrics() {
        return parent::getDtoCache()[VHistoryTable::LYRICS];
    }

    public function setAlbumHash($albumHash){
        parent::putDtoCache(VHistoryTable::ALBUM_HASH, $albumHash);
    }

    /**
     * @db\Annotation\Column(album_hash, true, true)
     */
    public function getAlbumHash() {
        return parent::getDtoCache()[VHistoryTable::ALBUM_HASH];
    }

    public function setAlbumTitle($albumTitle){
        parent::putDtoCache(VHistoryTable::ALBUM_TITLE, $albumTitle);
    }

    /**
     * @db\Annotation\Column(album_title)
     */
    public function getAlbumTitle() {
        return parent::getDtoCache()[VHistoryTable::ALBUM_TITLE];
    }
    public function setArtistId($artistId){
        parent::putDtoCache(VHistoryTable::ARTIST_ID, $artistId);
    }

    /**
     * @db\Annotation\Column(artist_id, true, true)
     */
    public function getArtistId() {
        return parent::getDtoCache()[VHistoryTable::ARTIST_ID];
    }

    public function setArtistName($artistName){
        parent::putDtoCache(VHistoryTable::ARTIST_NAME, $artistName);
    }

    /**
     * @db\Annotation\Column(artist_name)
     */
    public function getArtistName() {
        return parent::getDtoCache()[VHistoryTable::ARTIST_NAME];
    }

    public function setTrackNo($trackNo){
        parent::putDtoCache(VHistoryTable::TRACK_NO, $trackNo);
    }

    /**
     * @db\Annotation\Column(track_no)
     */
    public function getTrackNo() {
        return parent::getDtoCache()[VHistoryTable::TRACK_NO];
    }

    public function setPlayCount($playCount){
        parent::putDtoCache(VHistoryTable::PLAY_COUNT, $playCount);
    }

    /**
     * @db\Annotation\Column(play_count)
     */
    public function getPlayCount() {
        return parent::getDtoCache()[VHistoryTable::PLAY_COUNT];
    }

    public function setDataLink($dataLink){
        parent::putDtoCache(VHistoryTable::DATA_LINK, $dataLink);
    }

    /**
     * @db\Annotation\Column(data_link, false)
     */
    public function getDataLink() {
        return parent::getDtoCache()[VHistoryTable::DATA_LINK];
    }

    public function setLoudnessTarget($loudnessTarget){
        parent::putDtoCache(VHistoryTable::LOUDNESS_TARGET, $loudnessTarget);
    }

    /**
     * @db\Annotation\Column(loudness_target)
     */
    public function getLoudnessTarget() {
        return parent::getDtoCache()[VHistoryTable::LOUDNESS_TARGET];
    }
}
