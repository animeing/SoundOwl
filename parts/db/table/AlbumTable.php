<?php

interface AlbumTable {
    
    const TABLE_NAME = 'album';
    const PRIMARY_KEY = 'album_key';

    const ALBUM_KEY = 'album_key';

    const ALBUM_ID = 'album_id';
    const ARTIST_ID = 'artist_id';
    //Albumタイトル
    const TITLE = 'title';
    //album art(binary)
    const ALBUM_ART = 'album_art';
    const ART_MIME = 'art_mime';
    const ART_LENGTH = 'art_length';
    const YEAR = 'year';
}
