-- phpMyAdmin SQL Dump
-- version 5.1.3
-- https://www.phpmyadmin.net/
--

-- --------------------------------------------------------

--
-- テーブルの構造 `album`
--

CREATE TABLE IF NOT EXISTS `album` (
  `album_key` text NOT NULL,
  `album_id` text NOT NULL,
  `title` text NOT NULL,
  `artist_id` text ,
  `album_art` longblob ,
  `art_mime` text ,
  `art_length` bigint(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- テーブルの構造 `artist`
--

CREATE TABLE IF NOT EXISTS `artist` (
  `artist_id` text NOT NULL,
  `artist_name` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- テーブルの構造 `sound_link`
--

CREATE TABLE IF NOT EXISTS `sound_link` (
  `sound_hash` text NOT NULL,
  `add_time` datetime NOT NULL DEFAULT '1970-01-01 00:00:00',
  `title` text NOT NULL,
  `genre` text ,
  `lyrics` text ,
  `album_hash` text ,
  `album_title` text ,
  `artist_id` text ,
  `artist_name` text ,
  `track_no` text ,
  `play_count` int(11) NOT NULL DEFAULT 0,
  `data_link` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- テーブルの構造 `sound_play_history`
--

CREATE TABLE IF NOT EXISTS `sound_play_history` (
  `id` int(11) NOT NULL,
  `sound_hash` text NOT NULL,
  `play_date` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- テーブルの構造 `playlist`
--

CREATE TABLE  IF NOT EXISTS `playlist` (
  `id` int(11) NOT NULL,
  `play_list` text NOT NULL,
  `sound_point` int(11) NOT NULL,
  `sound_hash` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- ダンプしたテーブルのインデックス
--

--
-- テーブルのインデックス `album`
--
ALTER TABLE `album`
  ADD UNIQUE KEY `album_key` (`album_key`) USING HASH,
  ADD KEY `artist_id` (`artist_id`(768));

--
-- テーブルのインデックス `artist`
--
ALTER TABLE `artist`
  ADD UNIQUE KEY `artist_id` (`artist_id`) USING HASH;

--
-- テーブルのインデックス `sound_link`
--
ALTER TABLE `sound_link`
  ADD UNIQUE KEY `sound_hash` (`sound_hash`) USING HASH,
  ADD KEY `play_count` (`play_count`),
  ADD KEY `album_title` (`album_title`(768)),
  ADD KEY `artist_name` (`artist_name`(768)),
  ADD KEY `lyrics` (`lyrics`(768));

--
-- テーブルのインデックス `sound_play_history`
--
ALTER TABLE `sound_play_history`
  ADD PRIMARY KEY (`id`);

--
-- テーブルの AUTO_INCREMENT `sound_play_history`
--
ALTER TABLE `sound_play_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;


--
-- テーブルのインデックス `playlist`
--
ALTER TABLE `playlist`
  ADD PRIMARY KEY (`id`),
  ADD KEY `play_list` (`play_list`(768));

ALTER TABLE `playlist`
  ADD UNIQUE KEY `Uni_Playlist` (`play_list`,`sound_point`) USING HASH;
--
-- ダンプしたテーブルの AUTO_INCREMENT
--

--
-- テーブルの AUTO_INCREMENT `playlist`
--
ALTER TABLE `playlist`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- ビュー用の構造 `v_playlist`
--
CREATE VIEW v_playlist(play_list,sound_point,sound_hash,title,genre,lyrics,album_hash,album_title,artist_id,artist_name,track_no,play_count,data_link) AS 
SELECT
playlist.play_list,
playlist.sound_point,
sound_link.sound_hash,
sound_link.title,
sound_link.genre,
sound_link.lyrics,
sound_link.album_hash,
sound_link.album_title,
sound_link.artist_id,
sound_link.artist_name,
sound_link.track_no,
sound_link.play_count,
sound_link.data_link
FROM playlist LEFT JOIN sound_link ON sound_link.sound_hash = playlist.sound_hash;


