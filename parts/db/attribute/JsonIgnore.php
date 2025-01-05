<?php

namespace db\Attributes;

use Attribute;
use db\Attributes\Column;

#[Attribute(Attribute::TARGET_METHOD)]
class JsonIgnore extends Column {
    public function __construct() {
        parent::__construct('', false, false);
    }
}
