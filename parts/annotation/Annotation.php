<?php

class Annotation {
  private $reflection = null;
  private $methods = [];
  private $methodsComment = [];
  private $properties = [];

  private const DOC_COMMENT = 'DOC_COMMENT';

  private $annotationInstanceCache = [];

  /**
   * コンストラクタ
   *
   * @param string|object $clazz クラス名またはオブジェクトインスタンス
   */
  public function __construct($clazz){
    $this->reflection = new ReflectionClass($clazz);
  }

  public function getMethod($functionName){
    if($this->methods == []) {
      foreach($this->reflection->getMethods() as $method){
        $this->methods[$method->getName()] = $method;
      }
    }
    if(array_key_exists($functionName, $this->methods)) {
      return $this->methods[$functionName];
    } else {
      return null;
    }
  }

  /**
   * 指定された関数のアノテーションインスタンスを取得する
   *
   * @template T
   * @param string $functionName 関数名
   * @param class-string<T> $annotationClassString アノテーションクラスの名前
   * @return T|null アノテーションインスタンス、またはnull（アノテーションが存在しない場合）
  */
  public function getFunctionAnnotation($functionName, $annotationClassString) {
    $functionReflection = $this->getMethod($functionName);
    if($functionReflection == null) {
      return null;
    }
    $classAnnotations = null;
    if(array_key_exists($functionReflection->getName(), $this->methodsComment)) {
      $classAnnotations = $this->methodsComment[$functionReflection->getName()];
      
    } else {
      $classAnnotations = $this->methodsComment[$functionReflection->getName()] = $this->parseDocComment($functionReflection->getDocComment());
    }
    if(!array_key_exists($annotationClassString, $classAnnotations)) {
      return null;
    }
    return $this->createAnnotationClass($annotationClassString, $classAnnotations[$annotationClassString]);
  }

  public function getFunctionNames() {
    if($this->methods == []) {
      foreach($this->reflection->getMethods() as $method){
        $this->methods[$method->getName()] = $method;
      }
    }
    return array_keys($this->methods);
  }

  /**
   * クラスのアノテーションインスタンスを取得する
   *
   * @template T
   * @param class-string<T> $annotationClassString アノテーションクラスの名前
   * @return T|null アノテーションインスタンス、またはnull（アノテーションが存在しない場合）
  */
  public function getClassAnnotation($annotationClassString) {
    $classAnnotations = $this->parseDocComment($this->getReflection()->getDocComment());
    if(!array_key_exists($annotationClassString, $classAnnotations)) {
      return null;
    }
    return $this->createAnnotationClass($annotationClassString, $classAnnotations[$annotationClassString]);
  }

  /**
   * プロパティのアノテーションインスタンスを取得する
   *
   * @template T
   * @param string $propertyName プロパティ―名
   * @param class-string<T> $annotationClassString アノテーションクラスの名前
   * @return T|null アノテーションインスタンス、またはnull（アノテーションが存在しない場合）
  */
  public function getPropertyAnnotation($propertyName, $annotationClassString) {
    $propertyNameReflection = $this->getProperty($propertyName);
    if($propertyNameReflection == null) {
      return null;
    }
    $propertyAnnotations = null;
    if(array_key_exists(self::DOC_COMMENT,$this->properties[$propertyNameReflection->getName()])) {
      $propertyAnnotations = $this->properties[$propertyNameReflection->getName()][self::DOC_COMMENT];
    } else {
      $propertyAnnotations = $this->properties[$propertyNameReflection->getName()][self::DOC_COMMENT] = $this->parseDocComment($propertyNameReflection->getDocComment());
    }
    if(!array_key_exists($annotationClassString, $propertyAnnotations)) {
      return null;
    }
    return $this->createAnnotationClass($annotationClassString, $propertyAnnotations[$annotationClassString]);
  }

  public function getProperty($propertyName) {
    if($this->properties == []) {
      foreach($this->reflection->getProperties() as $property) {
        $this->properties[$property->getName()] = $property;
      }
    }
    if(array_key_exists($propertyName, $this->properties)) {
      return $this->properties[$propertyName];
    } else {
      null;
    }
  }

  public function getPropertyNames() {
    if($this->properties == []) {
      foreach($this->reflection->getProperties() as $property) {
        $this->properties[$property->getName()] = $property;
      }
    }
    return array_keys($this->properties);
  }

  private function createAnnotationClass($annotationClassName, ?array $args=null) {
    $cacheKey = $annotationClassName . ($args ? ':' . implode(',', $args) : '');
    if (isset($this->annotationInstanceCache[$cacheKey])) {
      return $this->annotationInstanceCache[$cacheKey];
    }
    $annotationClassReflection = new ReflectionClass($annotationClassName);

    if ($args == null || count($args) == 0) {
      $instance = $annotationClassReflection->newInstance();
    } else {
      $instance = $annotationClassReflection->newInstanceArgs($args);
    }
    return $this->annotationInstanceCache[$cacheKey] = $instance;
  }

  /**
   * DocBlockコメントを解析してアノテーションを取得する
   *
   * @param string|false $docComment DocBlockコメント
   * @return array アノテーション名をキーとし、引数リストを値とする連想配列
   */
  private function parseDocComment($docComment) {
    $annotations = [];
    if($docComment !== false) {
      $lines = explode(PHP_EOL, $docComment);

      foreach($lines as $line) {
        if(preg_match('/@([\w\\\\]+)\((.*?)\)/', $line, $matches)) {
          $annotationName = $matches[1];
          $arguments = $matches[2];
          $argumentList = array_map('trim', explode(',', $arguments));

          $argumentList = array_map(function($arg) {
            return StringUtil::convertToAppropriateType(trim($arg, '\''));
          }, $argumentList);

          $annotations[$annotationName] = $argumentList;
        }
      }
    }
    return $annotations;
  }

  public function getReflection() {
    return $this->reflection;
  }
}
