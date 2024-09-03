<?php

namespace utils\Reflection;

interface ReflectorInterface {
    public function getMethodNames(): array;
    public function getPropertyNames(): array;
    /**
     * 指定されたメソッド名の ReflectionMethod オブジェクトを返す。存在しない場合は null を返す。
     *
     * @param string $methodName メソッド名
     * @return \ReflectionMethod|null メソッドの ReflectionMethod オブジェクト、または存在しない場合は null
     */
    public function getMethod(string $methodName): ?\ReflectionMethod;
    /**
     * 指定されたメソッド名の ReflectionProperty オブジェクトを返す。存在しない場合は null を返す。
     *
     * @param string $methodName メソッド名
     * @return \ReflectionProperty|null メソッドの ReflectionProperty オブジェクト、または存在しない場合は null
     */
    public function getProperty(string $propertyName): ?\ReflectionProperty;
    /**
     * 指定されたメソッド名の ReflectionClass オブジェクトを返す。
     *
     * @return \ReflectionClass メソッドの ReflectionClass オブジェクト
     */
    public function getClassReflection() :\ReflectionClass;
}
