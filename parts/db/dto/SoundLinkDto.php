<?php

use db\dto\DtoBase;

class SoundLinkDto extends DtoBase implements SoundLinkTable {
    
    public function setSoundHash($soundHash){
        parent::putDtoCache(SoundLinkTable::SOUND_HASH, $soundHash);
    }

    /**
     * @db\Annotation\Column(sound_hash, true, true)
     */
    public function getSoundHash() {
        return parent::getDtoCache()[SoundLinkTable::SOUND_HASH];
    }

    public function setAddTime($addTime){
        parent::putDtoCache(SoundLinkTable::ADD_TIME, $addTime);
    }

    /**
     * @db\Annotation\Column(add_time)
     */
    public function getAddTime() {
        return parent::getDtoCache()[SoundLinkTable::ADD_TIME];
    }

    public function setTitle($title){
        parent::putDtoCache(SoundLinkTable::TITLE, $title);
    }

    /**
     * @db\Annotation\Column(title)
     */
    public function getTitle(){
        return parent::getDtoCache()[SoundLinkTable::TITLE];
    }

    public function setLyrics($lyrics) {
        return parent::putDtoCache(SoundLinkTable::LYRICS, $lyrics);
    }

    /**
     * @db\Annotation\Column(lyrics)
     */
    public function getLyrics() {
        return parent::getDtoCache()[SoundLinkTable::LYRICS];
    }

    public function setGenre($genre){
        parent::putDtoCache(SoundLinkTable::GENRE, $genre);
    }

    /**
     * @db\Annotation\Column(genre)
     */
    public function getGenre(){
        return parent::getDtoCache()[SoundLinkTable::GENRE];
    }
    
    public function setAlbumHash($albumId){
        parent::putDtoCache(SoundLinkTable::ALBUM_HASH, $albumId);
    }

    /**
     * @db\Annotation\Column(album_hash, true, true)
     */
    public function getAlbumHash(){
        return parent::getDtoCache()[SoundLinkTable::ALBUM_HASH];
    }

    public function setAlbumTitle($albumTitle) {
        parent::putDtoCache(SoundLinkTable::ALBUM_TITLE, $albumTitle);
    }

    /**
     * @db\Annotation\Column(album_title)
     */
    public function getAlbumTitle(){
        return parent::getDtoCache()[SoundLinkTable::ALBUM_TITLE];
    }

    public function setArtistId($artistId) {
        parent::putDtoCache(SoundLinkTable::ARTIST_ID, $artistId);
    }

    /**
     * @db\Annotation\Column(artist_id)
     */
    public function getArtistId(){
        return parent::getDtoCache()[SoundLinkTable::ARTIST_ID];
    }

    public function setArtistName($artistName) {
        parent::putDtoCache(SoundLinkTable::ARTIST_NAME, $artistName);
    }

    /**
     * @db\Annotation\Column(artist_name)
     */
    public function getArtistName() {
        return parent::getDtoCache()[SoundLinkTable::ARTIST_NAME];
    }

    public function setTrackNo($trackNo) {
        parent::putDtoCache(SoundLinkTable::TRACK_NO, $trackNo);
    }

    /**
     * @db\Annotation\Column(track_no)
     */
    public function getTrackNo(){
        return parent::getDtoCache()[SoundLinkTable::TRACK_NO];
    }

    public function setPlayCount($playCount) {
        parent::putDtoCache(SoundLinkTable::PLAY_COUNT, $playCount);
    }

    /**
     * @db\Annotation\Column(play_count)
     */
    public function getPlayCount(){
        return parent::getDtoCache()[SoundLinkTable::PLAY_COUNT];
    }

    public function setDataLink($dataLink) {
        parent::putDtoCache(SoundLinkTable::DATA_LINK, $dataLink);
    }

    /**
     * @db\Annotation\Column(data_link, false)
     */
    public function getDataLink(){
        return parent::getDtoCache()[SoundLinkTable::DATA_LINK];
    }
    public function setLoudnessTarget($loudnessTarget) {
        return parent::putDtoCache(SoundLinkTable::LOUDNESS_TARGET, $loudnessTarget);
    }

    /**
     * @db\Annotation\Column(loudness_target)
     */
    public function getLoudnessTarget() {
        return parent::getDtoCache()[SoundLinkTable::LOUDNESS_TARGET];
    }

    /**
     * @db\Annotation\Column(mime)
     */
    public function getMime() {
        return mime_content_type($this->getDataLink());
    }
}
