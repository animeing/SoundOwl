<?php
namespace db\Annotation;

class Column {
  private $isVisible = true;
  private $isCompless = null;
  private $propertyName = '';

  public function __construct($propertyName, $isVisible = true, $isCompless=false) {
    $this->isVisible = $isVisible;
    $this->isCompless = $isCompless;
    $this->propertyName = $propertyName;
  }

  public function isVisible(){
    return $this->isVisible;
  }

  public function isCompless() {
    return $this->isCompless;
  }

  public function getPropertyName() {
    return $this->propertyName;
  }
}