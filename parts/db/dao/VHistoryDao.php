<?php

class VHistoryDao extends SqlCreater implements VHistoryTable {
    /**
     * @return VHistoryDto
     */
    function createDto() {
        return new VHistoryDto();
    }

    /**
     * 範囲取得を行う関数
     * 
     * @param int $start 開始位置
     * @param int $limit 取得する件数
     * @return VHistoryDto[] DTOのリスト
     */
    function getRange($start, $limit) {
      $sql = $this->selectQuery() . $this::ORDER_BY . $this::PLAY_DATE . $this::DESC . $this::LIMIT_OFFSET;
      return $this->toDtoList($this->execute($sql, [$start, $limit]));
  }
}
