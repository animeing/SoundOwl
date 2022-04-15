<?php
header("Content-type: font/ttf");

echo file_get_contents(dirname(__DIR__).'/vendor/kenangundogan/fontisto/fonts/fontisto/fontisto.ttf');