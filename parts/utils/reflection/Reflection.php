<?php


namespace utils\Reflection;

class Reflection {
  private $reflectionClasses = [];
  private static $instance = null;

  private function __construct(){}

  public static function getInstance() {
    if(self::$instance === null) {
      self::$instance = new Reflection();
    }
    return self::$instance;
  }


  /**
    * @param string|object $clazz クラス名またはオブジェクト
    * @return ReflectorInterface 無名クラスのインスタンスが返されます
    */
  public function getOrCreateReflection($clazz): ReflectorInterface {
    $className = is_object($clazz) ? get_class($clazz) : $clazz;
    if(array_key_exists($className, $this->reflectionClasses)) {
      return $this->reflectionClasses[$className];
    }
    return $this->reflectionClasses[$className] = new class($className) implements ReflectorInterface {
      private $reflection = null;

      private $methods = [];
      private $properties = [];
      function __construct($className) {
        try {
          $this->reflection = new \ReflectionClass($className);
        } catch (\ReflectionException $e) {
          throw new \ReflectionException("Failed to create reflection for class: {$className}", 0, $e);
        }
      }

      private function initializeMethod() {
        foreach($this->reflection->getMethods() as $method) {
            $this->methods[$method->getName()] = $method;
        }
      }
    
      private function initializeProperty() {
          foreach($this->reflection->getProperties() as $property) {
              $this->properties[$property->getName()] = $property;
          }
      }

      public function getMethodNames(): array {
        if($this->methods === []) {
          $this->initializeMethod();
        }
        return array_keys($this->methods);
      }

      public function getPropertyNames(): array {
        if($this->properties === []) {
          $this->initializeProperty();
        }
        return array_keys($this->properties);
      }

      public function getMethod(string $methodName): ?\ReflectionMethod {
        if($this->methods === []) {
          $this->initializeMethod();
        }
        if(array_key_exists($methodName, $this->methods)){
          return $this->methods[$methodName];
        } else {
          return null;
        }
      }

      public function getProperty(string $propertyName): ?\ReflectionProperty {
        if($this->properties === []) {
          $this->initializeProperty();
        }
        if(array_key_exists($propertyName, $this->properties)) {
          return $this->properties[$propertyName];
        } else {
          return null;
        }
      }

      public function getClassReflection():\ReflectionClass {
        return $this->reflection;
      }
    };
  }
}