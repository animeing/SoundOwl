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
        getid3_lib::CopyTagsToComments($this->getId3Analyze);
        if(isset($this->getId3Analyze['tags'])){
          $this->tags = $this->getId3Analyze['tags'];
          $this->tagNames = $this->reorderTags($this->getId3Analyze['tags']);
        }
      }

      /**
       * タグ配列を信頼性順に並べ替え、id3v1タグが存在する場合は最後に移動する関数
       *
       * @param array $tags 各種タグを含む連想配列
       * @return array 並べ替えられたタグ配列
       */
      function reorderTags(array $tags): array {
        // 信頼性の高い順にタグを定義
        $trustworthyOrder = ['id3v2', 'ape', 'vorbis', 'id3v1'];

        // タグを並べ替えるための新しい配列
        $sortedTags = [];

        foreach ($trustworthyOrder as $tagType) {
            if (array_key_exists($tagType, $tags)) {
                $sortedTags[] = $tagType;
            }
        }

        // その他のタグ（定義されていないタグ）を追加
        foreach ($tags as $tagType => $tagData) {
          if (!in_array($tagType, $trustworthyOrder)) {
            if(is_array($tagData)) {
              $sortedTags[] = $tagType;
            } else {
              $sortedTags[] = $tagType;
            }
          }
        }

        return $sortedTags;
      }

      /**
       * 再帰的に連想配列内で指定されたキーを検索します。
       *
       * @param array  $array    検索対象の配列
       * @param string $key      検索するキー
       * @return mixed           キーが見つかった場合はその値、見つからない場合は false
       */
      function recursiveArrayKeySearch(array $array, string $key) {
        foreach ($array as $currentKey => $value) {
          if ($currentKey === $key) {
            return $value;
          }
          if (is_array($value)) {
            $result = $this->recursiveArrayKeySearch($value, $key);
            if ($result !== false) {
              return $result;
            }
          }
        }

        return false;
      }

      public function hasTag($key) {
        return isset($this->getId3Analyze[$key]);
      }

      public function getTag($key) {
        return $this->getId3Analyze[$key];
      }

      private function findKeyParam($tagParams, $key) {
        $result = $this->recursiveArrayKeySearch($tagParams, $key);
        if($result === false) {
          return false;
        }
        if(is_array($result) && isset($result[0])) {
          $result = $result[0];
        } else if(is_string($result)) {
          $result = $result;
        } else {
          return false;
        }
        $encode = $this->recursiveArrayKeySearch($tagParams, 'encoding');
        if($encode === false) {
          if(StringUtil::isUTF8NoCtrl($result)) {
            return $result;
          }
          // mb_detect_encodingは当てにならないので、直接使わない
          $converted = StringUtil::fixMojibakeByCharacters($result,[]);
          if($converted !== false && StringUtil::isUTF8NoCtrl($converted)) {
            return $converted;
          } else {
            return false;
          }
        } else {
          $converted = mb_convert_encoding($result, "UTF-8", $encode);
          if(StringUtil::isUTF8NoCtrl($converted)) {
            return $converted;
          }
          $converted = StringUtil::fixMojibakeByCharacters($result,[]);
          if($converted !== false && StringUtil::isUTF8NoCtrl($converted)) {
            return $converted;
          } else {
            return false;
          }
        }
      }

      public function getfindId3TagValue($key) {
        if(!isset($this->tagNames)) {
          return false;
        }
        foreach($this->tagNames as $tagName) {
          if($tagName === '' || $tagName === null) {
            continue;
          }
          if(isset($this->tags[$tagName])) {
            $result = $this->findKeyParam($this->tags[$tagName], $key);
            if($result !== false) {
              return $result;
            }
          }
          if(isset($this->getId3Analyze[$tagName])) {
            $result = $this->findKeyParam($this->getId3Analyze[$tagName], $key);
            if($result !== false) {
              return $result;
            }
          }
        }
        return false;
      }
    };
  }
}