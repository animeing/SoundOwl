<?php

class ArtistDao extends SqlCreater implements ArtistTable {
    function createDto() {
        return new ArtistDto();
    }

    /**
     * @return ArtistDto[]
     */
    function findArtistName($artistName) {
        return $this->toDtoList(
            $this->execute(
                $this->whereQuery(ArtistTable::ARTIST_NAME.$this::EQUAL_PARAM),
                array($artistName)
            )
        );
    }
    
    function insertArtistTable($artistName) {
        $artistDto = new ArtistDto();
        $artistDto->setArtistId(sha1($artistName));
        $artistDto->setArtistName($artistName);
        $this->insert($artistDto);
        return $artistDto;
    }

    function rangeSelect($start, $end) {
        $paramArray = array();
        $paramArray[] = $end;
        $paramArray[] = $start;
        return $this->toDtoList(
            $this->execute($this->selectQuery().$this::ORDER_BY.$this::BRACKET_OPEN.$this::ARTIST_NAME.$this::BRACKET_END.
            $this::LIMIT_OFFSET, $paramArray)
        );
    }
    
    function hasRegistedArtist($artistName) {
        foreach($this->findArtistName($artistName) as $artistDto) {
            if($artistName == $artistDto->getArtistName()) {
                return $artistDto;
            }
        }
        return false;
    }
}
