<?php

interface SoundLinkTable {
    const TABLE_NAME = 'sound_link';
    const PRIMARY_KEY = 'sound_hash';

    const SOUND_HASH = 'sound_hash';
    const ADD_TIME = 'add_time';
    const TITLE = 'title';
    const LYRICS = 'lyrics';
    const GENRE = 'genre';
    const ALBUM_HASH = 'album_hash';
    const ALBUM_TITLE = 'album_title';
    const ARTIST_ID = 'artist_id';
    const ARTIST_NAME = 'artist_name';
    const TRACK_NO = 'track_no';
    const PLAY_COUNT = 'play_count';
    const DATA_LINK = 'data_link';
}