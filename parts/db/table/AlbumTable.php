<?php

interface AlbumTable {
    
    const TABLE_NAME = 'album';
    const PRIMARY_KEY = 'album_id';

    const ALBUM_ID = 'album_id';
    //Albumタイトル
    const TITLE = 'title';
    //album art(binary)
    const ALBUM_ART = 'album_art';
}