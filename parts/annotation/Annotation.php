<?php

class Annotation {
  private $reflection = null;

  /**
   * コンストラクタ
   *
   * @param string|object $clazz クラス名またはオブジェクトインスタンス
   */
  public function __construct($clazz){
    $this->reflection = new ReflectionClass($clazz);
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
    $functionReflection = $this->getReflection()->getMethod($functionName);
    if($functionReflection == null) {
      return null;
    }
    
    $classAnnotations = $this->parseDocComment($functionReflection->getDocComment());
    if(!array_key_exists($annotationClassString, $classAnnotations)) {
      return null;
    }
    return $this->createAnnotationClass($annotationClassString, $classAnnotations[$annotationClassString]);
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
    $propertyNameReflection = $this->getReflection()->getProperty($propertyName);
    if($propertyNameReflection == null) {
      return null;
    }
    $propertyAnnotations = $this->parseDocComment($propertyNameReflection->getDocComment());
    if(!array_key_exists($annotationClassString, $propertyAnnotations)) {
      return null;
    }
    return $this->createAnnotationClass($annotationClassString, $propertyAnnotations[$annotationClassString]);
  }

  private function createAnnotationClass($annotationClassName, ?array $args=null) {
    $annotationClassReflection = new ReflectionClass($annotationClassName);
    if($args == null || count($args) == 0) {
      return $annotationClassReflection->newInstance();
    }
    return $annotationClassReflection->newInstanceArgs($args);
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
