<?php

namespace annotation;

use annotation\Annotation;
/**
 * @deprecated
 */
class AnnotationManager {
  
  private static $instance = null;
  private $annotation = [];
  private function __construct(){}


  // シングルトンインスタンスを取得するための静的メソッド
  public static function getInstance() {
      if (self::$instance === null) {
          self::$instance = new AnnotationManager();
      }
      return self::$instance;
  }

  /**
   * 
   * @param string|object $clazz クラス名またはオブジェクトインスタンス
   * @return Annotation
   */
  public function getOrCreateAnnotation($clazz) {
    $className = is_object($clazz) ? get_class($clazz) : $clazz;

    if (array_key_exists($className, $this->annotation)) {
        return $this->annotation[$className];
    }
    return $this->annotation[$className] = new Annotation($clazz);
  }

}