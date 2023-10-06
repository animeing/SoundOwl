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

    function getAlbumArts($name, $limit) {
        return $this->toDtoList(
            $this->execute(
                'SELECT distinct(album_hash) FROM v_playlist where '.
                (VPlaylistTable::PLAY_LIST.$this::EQUAL_AND.VPlaylistTable::ALBUM_HASH.' IS '.$this::NOT.' NULL ').
                $this::ORDER_BY.VPlaylistTable::SOUND_POINT.$this::ASC.$this::LIMIT,
                array($name, $limit)
            )
        );
    }
}
