<?php

interface AlbumTable {
    
    const TABLE_NAME = 'album';
    const PRIMARY_KEY = 'album_hash';

    const ALBUM_HASH = 'album_hash';
    //Albumタイトル
    const TITLE = 'title';
    //album art(binary)
    const ALBUM_ART = 'album_art';
    const ART_MIME = 'art_mime';
    const ART_LENGTH = 'art_length';
}