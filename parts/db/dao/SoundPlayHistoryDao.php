<?php

class SoundPlayHistoryDao extends SqlCreater implements SoundPlayHistoryTable {
    function createDto() {
        return new SoundPlayHistoryDto();
    }
}