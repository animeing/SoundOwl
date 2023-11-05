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

    
    function SoundFileTimeDesc($limit = 40) {
        return $this->toDtoList(
            $this->execute(
                $this->selectQuery().$this::ORDER_BY.$this::ADD_TIME.$this::DESC.$this::LIMIT,
                array($limit)
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

    function getAlbumPlayCountDesc($limit = 20) {
        $ALBUM_PLAY_COUNT = ' album_play_count ';
        return $this->toDtoList(
            $this->execute(
                $this::SELECT.
                    $this::ALL_COLUMN.' , '.
                    $this::SUM.'('.$this::PLAY_COUNT.$this::BRACKET_END.$ALBUM_PLAY_COUNT.
                $this::FROM.$this::TABLE_NAME.
                $this::WHERE.SoundLinkTable::ALBUM_TITLE.' IS NOT NULL '.
                $this::GROUP_BY.$this::ALBUM_HASH.
                $this::ORDER_BY.$ALBUM_PLAY_COUNT.$this::DESC.
                $this::LIMIT,
                array($limit)
            )
        );
    }

    /**
     * @return SoundLinkDto[]
     */
    public function getWordSearchSounds($word) {
        return $this->toDtoList(
            $this->execute(
                $this->whereQuery(
                    SoundDataView::ARTIST_NAME . $this::LIKE_OR . SoundDataView::TITLE . $this::LIKE_OR . SoundDataView::ALBUM_TITLE . $this::LIKE
                ) . ' ORDER BY 
                CASE 
                    WHEN ' . SoundDataView::ARTIST_NAME . ' = ? THEN 1
                    WHEN ' . SoundDataView::TITLE . ' = ? THEN 1
                    WHEN ' . SoundDataView::ALBUM_TITLE . ' = ? THEN 1
                    ELSE 2 
                END,
                CHAR_LENGTH(' . SoundDataView::ARTIST_NAME . '),
                CHAR_LENGTH(' . SoundDataView::TITLE . '),
                CHAR_LENGTH(' . SoundDataView::ALBUM_TITLE . ')
                ',
                array('%' . $word . '%', '%' . $word . '%', '%' . $word . '%', $word, $word, $word)
            )
        );
    }

    public function countInputedLoudnessTarget() {
        return $this->count($this->countWhereQuery($this::LOUDNESS_TARGET.'<> 0'));
    }
    

    public function getAlbumSounds($albumHash) {
        return $this->toDtoList(
            $this->execute(
                $this->whereQuery(
                    $this::ALBUM_HASH.$this::EQUAL_PARAM.
                    $this::ORDER_BY.$this::LENGTH.$this::BRACKET_OPEN.$this::TRACK_NO.$this::BRACKET_END.
                    $this::COMMA.$this::TRACK_NO
                ),
                array($albumHash)
            )
        );
    }

    public function getArtistSounds($artistHash) {
        return $this->toDtoList(
            $this->execute(
                $this->whereQuery(
                    $this::ARTIST_ID.$this::EQUAL_PARAM.
                    $this::ORDER_BY.$this::LENGTH.$this::BRACKET_OPEN.$this::TRACK_NO.$this::BRACKET_END.
                    $this::COMMA.$this::TRACK_NO
                ),
                array($artistHash)
            )
        );
    }

}
