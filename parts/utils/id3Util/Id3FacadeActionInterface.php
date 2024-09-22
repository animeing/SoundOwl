<?php

interface Id3FacadeActionInterface{
  /**
   * 
   * @param string $filePath
   * @return string|bool
   */
  public function getfindId3TagValue($filePath);
  /**
   * 
   * @param string $key
   * @return bool
   */
  public function hasTag($key);

  /**
   * 
   * 
   * @param string $key
   * @return array|string
   */
  public function getTag($key);
}

