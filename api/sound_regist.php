<?php

error_reporting(E_ALL & ~E_WARNING);
ini_set('max_execution_time', 0);

header("Content-Type: text/json");
require_once(dirname(dirname(__FILE__)).'/vendor/autoload.php');
require_once(dirname(dirname(__FILE__)).'/parts/loader.php');
define('LOCK_PATH', 'lock/sound_regist.lock');

if(!file_exists(LOCK_PATH)) {
    try{
        FileUtil::touchWithDir(LOCK_PATH);

        $predis = new Predis\Client([
            'host'=>REDIS_SERVER
        ]);
        function hasRegistedSound($file) {
            global $soundDao;
            foreach($soundDao->findSoundLink($file) as $find) {
                if($file == $find->getDataLink()) {
                    return true;
                }
            }
            return false;
        }
        

        $soundDao = new SoundLinkDao();
        $artistDao = new ArtistDao();
        $albumDao = new AlbumDao();
        function registSoundData($file) {
            global $artistDao, $albumDao, $soundDao, $predis;
            if(!preg_match('/\.(mp3|m4a|wav|ogg|flac|ape)$/', $file)){
                return;
            }
            $soundLinkDto = new SoundLinkDto();
            $soundLinkDto->setLoudnessTarget(0);
            $id3Facade = Id3Facade::getId3($file);
            if(!$id3Facade->hasTag('tags')){
                $soundDtos = $soundDao->find(sha1($file));
                if(count($soundDtos) == 0){
                    $soundLinkDto->setTitle(basename($file));
                    $soundLinkDto->setDataLink($file);
                    $soundLinkDto->setSoundHash(sha1($file));
                    $soundLinkDto->setPlayCount(0);
                    $soundLinkDto->setAddTime(date("Y-m-d H:i:s", filemtime($file)));
                    $soundDao->insert($soundLinkDto);
                    $jobData = json_encode(['file_path' => $file,'hash'=>$soundLinkDto->getSoundHash()]);
                    $predis->lpush('queue:audio-processing', [$jobData]);
                }
                return;
            }
            {
                $title = $id3Facade->getfindId3TagValue('title');
                if($title === false) {
                    $soundLinkDto->setTitle(pathinfo($file)['filename']);
                } else {
                    $soundLinkDto->setTitle($title);
                }
            }
            {
                $artist = $id3Facade->getfindId3TagValue('artist');
                if($artist === false || $artist == '') {
                    $artist = $id3Facade->getfindId3TagValue('band');
                }
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
                $album = $id3Facade->getfindId3TagValue('album');
                if($album === false || $album == '') {
                    $album = $id3Facade->getfindId3TagValue('product');
                }
                if($album === false) {
                    $soundLinkDto->setAlbumHash('');
                } else {
                    $albumDto = new AlbumDto;
                    $albumDto->setArtistId($soundLinkDto->getArtistId());
                    $albumDto->setTitle($album);
                    $albumDto->setAlbumId(sha1($album));
                    if($albumDto->getArtistId() === null){
                        $albumDto->setAlbumKey($albumDto->getAlbumId().sha1(StringUtil::uniqueRandom()));
                    } else {
                        $albumDto->setAlbumKey($albumDto->getAlbumId().$albumDto->getArtistId());
                    }
                    if($id3Facade->hasTag('comments') && isset($id3Facade->getTag('comments')['picture'][0])) {
                        $albumArtData = $id3Facade->getTag('comments')['picture'][0];
                        $albumDto->setAlbumArt(isset($albumArtData['data'])?$albumArtData['data']:'');
                        $albumDto->setArtMime(isset($albumArtData['image_mime'])?$albumArtData['image_mime']:'');
                        $albumDto->setArtLength(isset($albumArtData['datalength'])?$albumArtData['datalength']:strlen($albumArtData['data']));
                    }
                    if($id3Facade->getfindId3TagValue('year') != null) {
                        $albumDto->setYear(mb_substr($id3Facade->getfindId3TagValue('year'), 0, 10));
                    }

                    $findAlbumDto = $albumDao->findAlbum($albumDto);
                    if($findAlbumDto === false) {
                        $albumDao->insert($albumDto);
                        $soundLinkDto->setAlbumHash($albumDto->getAlbumKey());
                        $soundLinkDto->setAlbumTitle($albumDto->getTitle());
                    } else {
                        $soundLinkDto->setAlbumHash($findAlbumDto->getAlbumKey());
                        $soundLinkDto->setAlbumTitle($findAlbumDto->getTitle());
                    }
                }
            }
            {
                $lyrics = $id3Facade->getfindId3TagValue('lyrics');
                
                if($lyrics !== false) {
                    $soundLinkDto->setLyrics($lyrics);
                }
            }
            {
                $genre = $id3Facade->getfindId3TagValue('genre');
                if($genre === false) {
                    $soundLinkDto->setGenre('');
                } else {
                    $soundLinkDto->setGenre($genre);
                }
            }
            {
                $track = $id3Facade->getfindId3TagValue('track_number');
                if($track !== false) {
                    $soundLinkDto->setTrackNo($track);
                }
            }
            {
                $soundLinkDto->setDataLink($file);
                $soundLinkDto->setSoundHash(sha1($file));
            }
            $soundDtos = $soundDao->find(sha1($file));
            if(count($soundDtos) == 0){
                $soundLinkDto->setPlayCount(0);
                $soundLinkDto->setAddTime(date("Y-m-d H:i:s", filemtime($file)));
                $soundDao->insert($soundLinkDto);
            } else {
                $soundLinkDto->setPlayCount($soundDtos[0]->getPlayCount());
                $soundDao->update($soundLinkDto);
            }
            $jobData = json_encode(['file_path' => $file,'hash'=>$soundLinkDto->getSoundHash()]);
            $predis->lpush('queue:audio-processing', [$jobData]);
        }
        if(isset($_GET['soundhash'])) {
            $decompless = ComplessUtil::decompless($_GET['soundhash']);
            $soundLinkDto = $soundDao->find($decompless);
            registSoundData($soundLinkDto[0]->getDataLink());
        } else {
            FileUtil::fileListAction(SOUND_DIRECTORY, function ($file){
                if(!hasRegistedSound($file)){
                    registSoundData($file);
                }
            }, EXCLUSION_PATHS);
        }
    } finally {
        unlink(LOCK_PATH);
    }
}

$soundDao = new SoundLinkDao();
echo json_encode(array(
    'count'=>$soundDao->count($soundDao->countQuery())
));
