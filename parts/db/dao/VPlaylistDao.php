<?php

class VPlaylistDao extends SqlCreater implements VPlaylistTable {
    /**
     * @return VPlaylistDto
     */
    function createDto() {
        return new VPlaylistDto();
    }

    function getPlayListSounds($name) {
        return $this->toDto(
            $this->execute(
                $this->whereQuery(VPlaylistTable::PLAY_LIST.$this::EQUAL_PARAM).$this::ORDER_BY.VPlaylistTable::SOUND_POINT.$this::DESC,
                array($name)
            )
        );
    }
}
