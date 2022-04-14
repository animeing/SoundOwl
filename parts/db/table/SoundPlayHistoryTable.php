<?php

interface SoundPlayHistoryTable {
    const TABLE_NAME = 'sound_play_history';
    const PRIMARY_KEY = 'id';
    
    const ID = 'id';
    const SOUND_HASH = 'sound_hash';
    const PLAY_DATE = 'play_date';
}