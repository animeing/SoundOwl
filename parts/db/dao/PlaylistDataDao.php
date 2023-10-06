<?php

class PlaylistDataDao extends SqlCreater implements PlaylistDataTable {
    function createDto() {
        return new PlaylistDataDto();
    }

    /**
     * @param PlaylistDataDto $dto
     */
    function update($dto) {
        $dto->setUpdateDatetime(date('Y-m-d H:i:s'));
        parent::update($dto);
    }
}
