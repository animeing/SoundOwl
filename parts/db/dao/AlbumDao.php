<?php

class AlbumDao extends SqlCreater implements AlbumTable{
    function createDto() {
        return new AlbumDto();
    }
}