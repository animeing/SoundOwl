<?php

interface SoundDataView {
    const TABLE_NAME = 'sounddata';
    const PRIMARY_KEY = 'sound_hash';
    
    const SOUND_HASH = 'sound_hash';
    const TITLE = 'title';
    const ARTIST_NAME = 'artist_name';
    const ALBUM_TITLE = 'album_title';
    const GENRE = 'genre';
    const TRACK_NO = 'track_no';
    const PLAY_COUNT = 'play_count';
    const DATA_LINK = 'data_link';
    
    const ALBUM_KEY = 'album_key';
    const ALBUM_ART = 'album_art';
    const ART_MIME = 'art_mime';
    const ART_LENGTH = 'art_length';
}
