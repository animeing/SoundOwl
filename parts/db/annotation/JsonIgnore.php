<?php

namespace db\Annotation;
use db\Annotation\Column;
class JsonIgnore extends Column {
  public function __construct() {
    parent::__construct('', false);
  }
}