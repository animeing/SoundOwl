<?php

class SoundDataDao extends SqlCreater implements SoundDataView {
    function createDto() {
        return new SoundDataDto;
    }

}
