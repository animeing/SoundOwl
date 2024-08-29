<?php

namespace db\dto;

use Annotation;
use AnnotationManager;
use ComplessUtil;
use db\Annotation\Column;
use db\Annotation\JsonIgnore;
use db\dao\ISql;
use db\Util\Utilization;
use ReflectionMethod;

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
    /**
     * @JsonIgnore
     * @return array
     */
    public function getDtoCache(){
        return $this->dtoCache;
    }
    
    /**
     * @JsonIgnore
     * @return mixed
     */
    public function getPrimaryKey(){
        return $this->getDtoCache()[$this::PRIMARY_KEY];
    }

    public function toJson() {
        return json_encode($this->getVisibleRecord());
    }
    private static $time = 0.0;
    /**
     * @JsonIgnore
     * @return array
     */
    public function getVisibleRecord() {
        $result = [];
        $annotation = AnnotationManager::getInstance()->getOrCreateAnnotation($this);
        $methods = $annotation->getFunctionNames();

        foreach($methods as $method) {
            if(strpos($method, 'get') === 0) {
                $jsonIgnore = $annotation->getFunctionAnnotation($method, JsonIgnore::class);
                if($jsonIgnore !== null) {
                    continue;
                }
                $column = $annotation->getFunctionAnnotation($method, Column::class);
                if($column === null || !$column->isVisible()) {
                    continue;
                }
                if($column->isCompless()) {
                    $result[$column->getPropertyName()] = ComplessUtil::compless($this->getDtoCache()[$column->getPropertyName()]);
                } else {
                    $result[$column->getPropertyName()] = $this->getDtoCache()[$column->getPropertyName()];
                }
            }
        }
        return $result;
    }
}