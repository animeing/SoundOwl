<?php

namespace db\dto;
use db\dao\ISql;
/**
 * DtoのBase classです。
 */
abstract class DtoBase implements ISql{
    private $dtoCache = array();
    protected function putDtoCache($key, $data){
        $this->dtoCache[$key] = $data;
    }
    public function putAllDtoCache(array $dto){
        $this->dtoCache = $dto;
    }
    public function getDtoCache(){
        return $this->dtoCache;
    }
    public function getPrimaryKey(){
        return $this->getDtoCache()[$this::PRIMARY_KEY];
    }
}