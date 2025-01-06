<?php

namespace db\Attributes;

use Attribute;

#[Attribute(Attribute::TARGET_METHOD)]
class Column {
    public string $propertyName;
    public bool $isVisible;
    public bool $isCompless;

    /**
     * @param string $propertyName プロパティ名
     * @param bool $isVisible 可視性（デフォルト: true）
     * @param bool $isCompless コンプレッシブ（デフォルト: false）
     */
    public function __construct(string $propertyName, bool $isVisible = true, bool $isCompless = false) {
        $this->propertyName = $propertyName;
        $this->isVisible = $isVisible;
        $this->isCompless = $isCompless;
    }
}