<?php


use db\dto\DtoBase;
use db\Attributes\Column;
use db\Attributes\JsonIgnore;

class VPlaylistDto extends DtoBase implements VPlaylistTable {
    
    public function setPlayList($playList): void {
        parent::putDtoCache(VPlaylistTable::PLAY_LIST, $playList);
    }

    #[Column(propertyName: "play_list")]
    public function getPlayList() {
        return parent::getDtoCache()[VPlaylistTable::PLAY_LIST];
    }

    public function setSoundPoint($soundPoint): void {
        parent::putDtoCache(VPlaylistTable::SOUND_POINT, $soundPoint);
    }

    #[Column(propertyName: "sound_point")]
    public function getSoundPoint() {
        return parent::getDtoCache()[VPlaylistTable::SOUND_POINT];
    }

    public function setSoundHash($soundHash): void {
        parent::putDtoCache(VPlaylistTable::SOUND_HASH, $soundHash);
    }

    #[Column(propertyName: "sound_hash", isVisible: true, isCompless: true)]
    public function getSoundHash() {
        return parent::getDtoCache()[VPlaylistTable::SOUND_HASH];
    }

    public function setTitle($title): void {
        parent::putDtoCache(VPlaylistTable::TITLE, $title);
    }

    #[Column(propertyName: "title")]
    public function getTitle() {
        return parent::getDtoCache()[VPlaylistTable::TITLE];
    }

    public function setGenre($genre): void {
        parent::putDtoCache(VPlaylistTable::GENRE, $genre);
    }

    #[Column(propertyName: "genre")]
    public function getGenre() {
        return parent::getDtoCache()[VPlaylistTable::GENRE];
    }

    public function setLyrics($lyrics): void {
        parent::putDtoCache(VPlaylistTable::LYRICS, $lyrics);
    }

    #[Column(propertyName: "lyrics")]
    public function getLyrics() {
        return parent::getDtoCache()[VPlaylistTable::LYRICS];
    }

    public function setAlbumHash($albumHash): void {
        parent::putDtoCache(VPlaylistTable::ALBUM_HASH, $albumHash);
    }

    #[Column(propertyName: "album_hash")]
    public function getAlbumHash() {
        return parent::getDtoCache()[VPlaylistTable::ALBUM_HASH];
    }

    public function setAlbumTitle($albumTitle): void {
        parent::putDtoCache(VPlaylistTable::ALBUM_TITLE, $albumTitle);
    }

    #[Column(propertyName: "album_title")]
    public function getAlbumTitle() {
        return parent::getDtoCache()[VPlaylistTable::ALBUM_TITLE];
    }

    public function setArtistId($artistId): void {
        parent::putDtoCache(VPlaylistTable::ARTIST_ID, $artistId);
    }

    #[Column(propertyName: "artist_id")]
    public function getArtistId() {
        return parent::getDtoCache()[VPlaylistTable::ARTIST_ID];
    }

    public function setArtistName($artistName): void {
        parent::putDtoCache(VPlaylistTable::ARTIST_NAME, $artistName);
    }

    #[Column(propertyName: "artist_name")]
    public function getArtistName() {
        return parent::getDtoCache()[VPlaylistTable::ARTIST_NAME];
    }

    public function setTrackNo($trackNo): void {
        parent::putDtoCache(VPlaylistTable::TRACK_NO, $trackNo);
    }

    #[Column(propertyName: "track_no")]
    public function getTrackNo() {
        return parent::getDtoCache()[VPlaylistTable::TRACK_NO];
    }

    public function setPlayCount($playCount): void {
        parent::putDtoCache(VPlaylistTable::PLAY_COUNT, $playCount);
    }

    #[Column(propertyName: "play_count")]
    public function getPlayCount() {
        return parent::getDtoCache()[VPlaylistTable::PLAY_COUNT];
    }

    public function setDataLink($dataLink): void {
        parent::putDtoCache(VPlaylistTable::DATA_LINK, $dataLink);
    }

    #[Column(propertyName: "data_link")]
    public function getDataLink() {
        return parent::getDtoCache()[VPlaylistTable::DATA_LINK];
    }
}
