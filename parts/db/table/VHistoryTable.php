<?php

interface VHistoryTable {
    
    const TABLE_NAME = 'v_history';
    const PRIMARY_KEY = 'id';
    
    const ID = 'id';
    const SOUND_HASH = 'sound_hash';
    const PLAY_DATE = 'play_date';
    const TITLE = 'title';
    const GENRE = 'genre';
    const LYRICS = 'lyrics';
    const ALBUM_HASH = 'album_hash';
    const ALBUM_TITLE = 'album_title';
    const ARTIST_ID = 'artist_id';
    const ARTIST_NAME = 'artist_name';
    const TRACK_NO = 'track_no';
    const PLAY_COUNT = 'play_count';
    const DATA_LINK = 'data_link';
    const LOUDNESS_TARGET = 'loudness_target';
}
