<?php

class SoundDataDao extends SqlCreater implements SoundDataView {
    function createDto() {
        return new SoundDataDto;
    }

    /**
     * @return SoundDataDto[]
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
     * @return SoundViewDto[]
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
