<?php

class SoundLinkDao extends SqlCreater implements SoundLinkTable {
    function createDto() {
        return new SoundLinkDto();
    }
}