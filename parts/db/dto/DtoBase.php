<?php

namespace db\dto;

use db\Attributes\Column;
use db\Attributes\JsonIgnore;
use db\dao\ISql;
use db\validation\Attributes\Validate;
use db\validation\Attributes\ValidationType;
use Exception;
use ReflectionClass;
use ReflectionMethod;
use utils\Reflection\Reflection;

/**
 * DtoのBase classです。
 */
abstract class DtoBase implements ISql{
    private array $dtoCache = [];

    protected function putDtoCache(string $key, $data): void {
        $this->dtoCache[$key] = $data;
    }

    public function putAllDtoCache(array $dto): void {
        $this->dtoCache = $dto;
    }

    #[JsonIgnore]
    public function getDtoCache(): array {
        return $this->dtoCache;
    }

    #[JsonIgnore]
    public function getPrimaryKey() {
        return $this->dtoCache[$this::PRIMARY_KEY];
    }

    public function toJson(): string {
        return json_encode($this->getVisibleRecord());
    }

    #[JsonIgnore]
    public function getVisibleRecord(): array {
        $result = [];
        $reflection = Reflection::getInstance()->getOrCreateReflection($this);

        $methodNames = $reflection->getMethodNames();

        foreach ($methodNames as $methodName) {
            if (strpos($methodName, 'get') !== 0) {
                continue;
            }
            $method = $reflection->getMethod($methodName);
            // JsonIgnore属性の確認
            $jsonIgnoreAttributes = $method->getAttributes(JsonIgnore::class);
            if (!empty($jsonIgnoreAttributes)) {
                continue;
            }

            // Column属性の取得
            $columnAttributes = $method->getAttributes(Column::class);
            if (empty($columnAttributes)) {
                continue;
            }

            /** @var Column $column */
            $column = $columnAttributes[0]->newInstance();

            if (!$column->isVisible) {
                continue;
            }

            $propertyName = $column->propertyName;
            $value = $this->dtoCache[$propertyName] ?? null;

            if ($column->isCompless) {
                $value = \ComplessUtil::compless($value);
            }

            $result[$propertyName] = $value;
        }

        return $result;
    }
}
