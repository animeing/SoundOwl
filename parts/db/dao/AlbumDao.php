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

    function findHaveAlbumArtsDtos($artistId) {
        return $this->toDtoList(
            $this->execute(
                $this->whereQuery(AlbumTable::ARTIST_ID.$this::EQUAL_AND.AlbumTable::ALBUM_ART."<>''"),
                array($artistId)
            )
        );
    }

    /**
     * 
     * @param AlbumDto $albumDto
     * @return AlbumDto|false
     */
    function findAlbum($albumDto) {
        // アルバムタイトルで検索
        $searchAlbumDtos = $this->toDtoList(
            $this->execute(
                $this->whereQuery(AlbumTable::TITLE . $this::EQUAL_PARAM),
                array($albumDto->getTitle())
            )
        );
        
        foreach ($searchAlbumDtos as $searchAlbumDto) {
            if ($albumDto->getArtistId() == $searchAlbumDto->getArtistId()) {
                return $searchAlbumDto;
            }

            // アートの長さやMIMEタイプが異なる場合はスキップ
            if ($searchAlbumDto->getArtLength() != $albumDto->getArtLength()) {
                continue;
            }
            if ($searchAlbumDto->getArtMime() != $albumDto->getArtMime()) {
                continue;
            }
            
            // アルバムアートがある場合はハッシュで比較（nullチェック追加）
            if ($albumDto->getAlbumArt() != null && $searchAlbumDto->getAlbumArt() != null) {
                if (hash('sha256', $searchAlbumDto->getAlbumArt()) == hash('sha256', $albumDto->getAlbumArt())) {
                    return $searchAlbumDto;
                }
            }

            // 年が一致するか確認
            if ($albumDto->getYear() != null && $albumDto->getYear() === $searchAlbumDto->getYear()) {
                return $searchAlbumDto;
            }
        }

        // 一致するアルバムが見つからない場合
        return false;
    }
    function rangeSelect($start, $end) {
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
