<?php

namespace db\dto;

use Annotation;
use ComplessUtil;
use db\Annotation\Column;
use db\Annotation\JsonIgnore;
use db\dao\ISql;
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
    /**
     * @JsonIgnore
     * @return array
     */
    public function getVisibleRecord() {
        $result = [];
        $annotation = new Annotation($this);
        $methods = $annotation->getReflection()->getMethods(ReflectionMethod::IS_PUBLIC);

        foreach($methods as $method) {
            if(strpos($method->getName(), 'get') === 0) {
                $jsonIgnore = $annotation->getFunctionAnnotation($method->getName(), JsonIgnore::class);
                if($jsonIgnore !== null) {
                    continue;
                }
                $column = $annotation->getFunctionAnnotation($method->getName(), Column::class);
                if($column === null || !$column->isVisible()) {
                    continue;
                }
                if($column->isCompless()) {
                    $result[$column->getPropertyName()] = ComplessUtil::compless($method->invoke($this));
                } else {
                    $result[$column->getPropertyName()] = $method->invoke($this);   
                }
            }
        }

        return $result;
    }
}