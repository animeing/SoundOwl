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
  `artist_id` text NOT NULL,
  `album_art` longblob NOT NULL,
  `art_mime` text NOT NULL,
  `art_length` bigint(255) NOT NULL DEFAULT 0
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
  `title` text NOT NULL,
  `genre` text NOT NULL,
  `lyrics` text NOT NULL,
  `album_hash` text NOT NULL,
  `album_title` text NOT NULL,
  `artist_id` text NOT NULL,
  `artist_name` text NOT NULL,
  `track_no` text NOT NULL,
  `play_count` int(11) NOT NULL,
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
-- ダンプしたテーブルの AUTO_INCREMENT
--

--
-- テーブルの AUTO_INCREMENT `sound_play_history`
--
ALTER TABLE `sound_play_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
