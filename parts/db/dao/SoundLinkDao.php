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
}