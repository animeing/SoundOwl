<?php

namespace annotation;

use utils\Reflection\Reflection;

/**
 * @deprecated
 */
class Annotation {
  private $reflection = null;
  private $methodsComment = [];
  private $propertiesComment = [];
  private $annotationInstanceCache = [];

  /**
   * コンストラクタ
   *
   * @param string|object $clazz クラス名またはオブジェクトインスタンス
   */
  public function __construct($clazz){
    $this->reflection = Reflection::getInstance()->getOrCreateReflection($clazz);
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
    $functionReflection = $this->reflection->getMethod($functionName);
    if($functionReflection == null) {
      return null;
    }
    $functionAnnotations = null;
    if(array_key_exists($functionReflection->getName(), $this->methodsComment)) {
      $functionAnnotations = $this->methodsComment[$functionReflection->getName()];
    } else {
      $functionAnnotations = $this->methodsComment[$functionReflection->getName()] = $this->parseDocComment($functionReflection->getDocComment());
    }
    if(!array_key_exists($annotationClassString, $functionAnnotations)) {
      return null;
    }
    return $this->createAnnotationClass($annotationClassString, $functionAnnotations[$annotationClassString]);
  }

  /**
   * クラスのアノテーションインスタンスを取得する
   *
   * @template T
   * @param class-string<T> $annotationClassString アノテーションクラスの名前
   * @return T|null アノテーションインスタンス、またはnull（アノテーションが存在しない場合）
  */
  public function getClassAnnotation($annotationClassString) {
    $classAnnotations = $this->parseDocComment($this->reflection->getClassReflection()->getDocComment());
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
    $propertyNameReflection = $this->reflection->getProperty($propertyName);
    if($propertyNameReflection == null) {
      return null;
    }
    $propertyAnnotations = null;
    if(array_key_exists($propertyNameReflection->getName(), $this->propertiesComment)) {
      $propertyAnnotations = $this->propertiesComment[$propertyNameReflection->getName()];
    } else {
      $propertyAnnotations = $this->propertiesComment[$propertyNameReflection->getName()] = $this->parseDocComment($propertyNameReflection->getDocComment());
    }
    if(!array_key_exists($annotationClassString, $propertyAnnotations)) {
      return null;
    }
    return $this->createAnnotationClass($annotationClassString, $propertyAnnotations[$annotationClassString]);
  }

  private function createAnnotationClass($annotationClassName, ?array $args=null) {
    $cacheKey = $annotationClassName . ($args ? ':' . implode(',', $args) : '');
    if (isset($this->annotationInstanceCache[$cacheKey])) {
      return $this->annotationInstanceCache[$cacheKey];
    }
    $annotationClassReflection = new \ReflectionClass($annotationClassName);

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
            return \StringUtil::convertToAppropriateType(trim($arg, '\''));
          }, $argumentList);

          $annotations[$annotationName] = $argumentList;
        }
      }
    }
    return $annotations;
  }

}
