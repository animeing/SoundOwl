<?php

error_reporting(E_ALL & ~E_WARNING);
ini_set('max_execution_time', 0);

header("Content-Type: text/json");
require_once(dirname(dirname(__FILE__)).'/vendor/autoload.php');
require_once(dirname(dirname(__FILE__)).'/parts/loader.php');
define('LOCK_PATH', 'lock/sound_regist.lock');

if(!file_exists(LOCK_PATH)) {
    try{
        touch(LOCK_PATH);
        function hasRegistedSound($file) {
            global $soundDao;
            foreach($soundDao->findSoundLink($file) as $find) {
                if($file == $find->getDataLink()) {
                    return true;
                }
            }
            return false;
        }


        function findId3TagValue($key, $id3Tags, $tagNames) {
            foreach($tagNames as $tagName) {
                if(!isset($id3Tags[$tagName]) || !isset($id3Tags[$tagName][$key])) {
                    continue;
                }
                $val = null;
                if(is_array($id3Tags[$tagName][$key]) && isset($id3Tags[$tagName][$key][0])){
                    $val = $id3Tags[$tagName][$key][0];
                } else if(is_string($id3Tags[$tagName][$key])) {
                    $val = $id3Tags[$tagName][$key];
                } else {
                    continue;
                }
                
                $encode = mb_detect_encoding($val, 'auto', true);
                if($encode === false) {
                    continue;
                }
                $converted = mb_convert_encoding($val, "UTF-8", $encode);
                if($converted !== false) {
                    return $converted;
                }
            }
            return false;
        }


        $soundDao = new SoundLinkDao();
        $artistDao = new ArtistDao();
        $albumDao = new AlbumDao();
        FileUtil::fileListAction(SOUND_DIRECTORY, function($file) {
            global $artistDao, $albumDao, $soundDao;
            if(hasRegistedSound($file) || !preg_match('/\.mp3|\.m4a|\.wav|\.ogg|\.flac]/', $file)){
                return;
            }
            $soundLinkDto = new SoundLinkDto();
            $id3 = new getID3();
            $id3Analyze = $id3->analyze($file);
            if(!isset($id3Analyze['tags'])){
                echo $file;
                return;
            }
            $id3Tags = $id3Analyze['tags'];
            $tagNames = array_reverse(array_keys($id3Tags));
            {
                $title = findId3TagValue('title', $id3Tags, $tagNames);
                if($title === false) {
                    $soundLinkDto->setTitle(pathinfo($file)['filename']);
                } else {
                    $soundLinkDto->setTitle($title);
                }
            }
            {
                $artist = findId3TagValue('artist', $id3Tags, $tagNames);
                if($artist !== false) {
                    $registedArtistDto = $artistDao->hasRegistedArtist($artist);
                    if($registedArtistDto === false) {
                        $artistDto = $artistDao->insertArtistTable($artist);
                        $soundLinkDto->setArtistId($artistDto->getArtistId());
                        $soundLinkDto->setArtistName($artistDto->getArtistName());
                    } else {
                        $soundLinkDto->setArtistId($registedArtistDto->getArtistId());
                        $soundLinkDto->setArtistName($registedArtistDto->getArtistName());
                    }
                }
            }
            {
                $album = findId3TagValue('album', $id3Tags, $tagNames);
                if($album === false) {
                    $soundLinkDto->setAlbumHash('');
                } else {
                    $albumDto = $albumDao->hasRegistedAlbum($album, $artist);
                    if($albumDto === false) {
                        $albumDto = new AlbumDto;
                        $albumDto->setArtistId($soundLinkDto->getArtistId());
                        $albumDto->setTitle($album);
                        $albumDto->setAlbumId(sha1($album));
                        if($albumDto->getArtistId() === null){
                            $albumDto->setAlbumKey($albumDto->getAlbumId().'_'.StringUtil::uniqueRandom());
                        } else {
                            $albumDto->setAlbumKey($albumDto->getAlbumId().$albumDto->getArtistId());
                        }
                        if(isset($id3Analyze['comments']) && isset($id3Analyze['comments']['picture'][0])) {
                            $albumArtData = $id3Analyze['comments']['picture'][0];
                            $albumDto->setAlbumArt(isset($albumArtData['data'])?$albumArtData['data']:'');
                            $albumDto->setArtMime(isset($albumArtData['image_mime'])?$albumArtData['image_mime']:'');
                            $albumDto->setArtLength(isset($albumArtData['datalength'])?$albumArtData['datalength']:'');
                        }
                        $albumDao->insert($albumDto);
                    }
                    $soundLinkDto->setAlbumHash($albumDto->getAlbumKey());
                    $soundLinkDto->setAlbumTitle($albumDto->getTitle());
                }
            }
            {
                $lyrics = findId3TagValue('lyrics', $id3Tags, $tagNames);
                
                if($lyrics !== false) {
                    $soundLinkDto->setLyrics($lyrics);
                }
            }
            {
                $genre = findId3TagValue('genre', $id3Tags, $tagNames);
                if($genre === false) {
                    $soundLinkDto->setGenre('');
                } else {
                    $soundLinkDto->setGenre($genre);
                }
            }
            {
                $track = findId3TagValue('track_number', $id3Tags, $tagNames);
                if($track !== false) {
                    $soundLinkDto->setTrackNo($track);
                }
            }
            {
                $soundLinkDto->setPlayCount(0);
            }
            {
                $soundLinkDto->setDataLink($file);
                $soundLinkDto->setSoundHash(sha1($file));
            }
            $soundDao->insert($soundLinkDto);
        });
    } finally {
        unlink(LOCK_PATH);
    }
}

$soundDao = new SoundLinkDao();
echo json_encode(array(
    'count'=>$soundDao->count($soundDao->countQuery()),
    'status'=>file_exists(LOCK_PATH)?'lock':'success'
));
