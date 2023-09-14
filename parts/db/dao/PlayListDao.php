<?php

class PlayListDao extends SqlCreater implements PlayListTable {
    function createDto() {
        return new PlayListDto();
    }

    function getPlayListSounds($name) {
        return $this->toDto(
            $this->execute(
                $this->whereQuery(PlayListTable::PLAY_LIST.$this::EQUAL_PARAM).$this::ORDER_BY.$this::SOUND_POINT.$this::DESC,
                array($name)
            )
        );
    }
    
    function removePlayList($name) {
        $this->execute(
            $this::DELETE.$this::FROM.$this::TABLE_NAME.$this::WHERE.$this::PLAY_LIST.$this::EQUAL_PARAM,
            array($name)
        );
    }

}
