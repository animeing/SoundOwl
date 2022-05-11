<?php

class SoundLinkDao extends SqlCreater implements SoundLinkTable {
    function createDto() {
        return new SoundLinkDto();
    }

    /**
     * @return SoundLinkDto[]
     */
    function findSoundLink($soundLink) {
        return $this->toDtoList(
            $this->execute(
                $this->whereQuery(SoundLinkTable::DATA_LINK.$this::EQUAL_PARAM),
                array($soundLink)
            )
        );
    }
    
    /**
     * @return SoundLinkDto[]
     */
    function getPlayCountDesc($limit = 20) {
        return $this->toDtoList(
            $this->execute(
                $this->selectQuery().$this::ORDER_BY.$this::PLAY_COUNT.$this::DESC.$this::LIMIT,
                array($limit)
            )
        );
    }

    /**
     * @return SoundLinkDto[]
     */
    public function getWordSearchSounds($word){
        return $this->toDtoList(
            $this->execute(
                $this->whereQuery(
                    SoundDataView::ARTIST_NAME.$this::LIKE_OR.SoundDataView::TITLE.$this::LIKE_OR.SoundDataView::ALBUM_TITLE.$this::LIKE),
                    array('%'.$word.'%', '%'.$word.'%', '%'.$word.'%')
            )
        );
    }
}