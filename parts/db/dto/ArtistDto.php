<?php

use db\dto\DtoBase;

class ArtistDto extends DtoBase implements ArtistTable {
    
    public function setArtistId($artistId) {
        parent::putDtoCache(ArtistTable::ARTIST_ID, $artistId);
    }

    public function getArtistId() {
        return parent::getDtoCache()[ArtistTable::ARTIST_ID];
    }
}