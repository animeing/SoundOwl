<?php

class ArtistDao extends SqlCreater implements ArtistTable {
    function createDto() {
        return new ArtistDto();
    }
}