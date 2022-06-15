<?php

class AlbumDao extends SqlCreater implements AlbumTable{
    /**
     * @return AlbumDto
     */
    function createDto() {
        return new AlbumDto();
    }

    /**
     * @return AlbumDto[]
     */
    function findAlbumIdAndArtistId($albumTitle, $artistId) {
        return $this->toDtoList(
            $this->execute(
                $this->whereQuery(AlbumTable::TITLE.$this::EQUAL_AND.AlbumTable::ARTIST_ID.$this::EQUAL_PARAM),
                array($albumTitle, $artistId)
            )
        );
    }

    function rageSelect($start, $end) {
        $paramArray = array();
        $paramArray[] = $end;
        $paramArray[] = $start;
        return $this->toDtoList(
            $this->execute($this->selectQuery().$this::LIMIT_OFFSET, $paramArray));
    }
    
    function hasRegistedAlbum($albumTitle, $artistName) {
        foreach($this->findAlbumIdAndArtistId($albumTitle, sha1($artistName)) as $albumDto) {
            if($albumDto->getAlbumKey() == sha1($albumTitle).sha1($artistName)) {
                return $albumDto;
            }
        }
        return false;
    }
}
