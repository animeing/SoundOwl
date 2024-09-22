<?php

final class Id3Facade{
  
  /**
   * @param string $filePath
   * @return Id3FacadeActionInterface
   */
  public static function getId3($filePath): Id3FacadeActionInterface {
    return new class($filePath) implements Id3FacadeActionInterface {
      private $getId3Analyze = null;
      private $tagNames = null;
      private $tags = null;


      function __construct($filePath){
        $getId3 = new getID3();
        $this->getId3Analyze = $getId3->analyze($filePath);
        $this->tags = $this->getId3Analyze['tags'];
        if(isset($this->getId3Analyze['tags'])){
          $this->tagNames = array_reverse(array_keys($this->getId3Analyze['tags']));
        }
      }

      public function hasTag($key) {
        return isset($this->getId3Analyze[$key]);
      }

      public function getTag($key) {
        return $this->getId3Analyze[$key];
      }

      public function getfindId3TagValue($key) {
        if(!isset($this->tagNames)) {
          return null;
        }
        foreach($this->tagNames as $tagName) {
          if(!isset($this->tags[$tagName]) || !isset($this->tags[$tagName][$key])) {
            continue;
          }
          $result = null;
          if(is_array($this->tags[$tagName][$key]) && isset($this->tags[$tagName][$key][0])) {
            $result = $this->tags[$tagName][$key][0];
          } else if(is_string($this->tags[$tagName][$key])) {
            $result = $this->tags[$tagName][$key];
          } else {
            continue;
          }

          $encode = mb_detect_encoding($result, 'auto', true);
          if($encode === false) {
              continue;
          }

          $converted = mb_convert_encoding($result, "UTF-8", $encode);
          if($converted !== false) {
            return $converted;
          }

        }
        return false;
      }


    };
  }

}