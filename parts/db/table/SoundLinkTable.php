<?php

interface SoundLinkTable {
    const TABLE_NAME = 'sound_link';
    const PRIMARY_KEY = 'sound_hash';

    const SOUND_HASH = 'sound_hash';
    const TITLE = 'title';
    const GENRE = 'genre';
    const ALBUM_ID = 'album_id';
    const ARTIST_ID = 'artist_id';
    const TRACK_NO = 'track_no';
    const PLAY_COUNT = 'play_count';
    const DATA_LINK = 'data_link';
}