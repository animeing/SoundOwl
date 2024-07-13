-- MariaDB dump 10.19  Distrib 10.6.7-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: sound
-- ------------------------------------------------------
-- Server version	10.6.7-MariaDB-2ubuntu1.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `album`
--

DROP TABLE IF EXISTS `album`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `album` (
  `album_key` varchar(255) NOT NULL,
  `album_id` text NOT NULL,
  `title` text NOT NULL,
  `artist_id` text DEFAULT NULL,
  `album_art` longblob DEFAULT NULL,
  `art_mime` text DEFAULT NULL,
  `art_length` bigint(255) DEFAULT NULL,
  UNIQUE KEY `album_key` (`album_key`),
  KEY `artist_id` (`artist_id`(768))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `artist`
--

DROP TABLE IF EXISTS `artist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `artist` (
  `artist_id` text NOT NULL,
  `artist_name` text NOT NULL,
  UNIQUE KEY `artist_id` (`artist_id`) USING HASH
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `playlist`
--

DROP TABLE IF EXISTS `playlist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `playlist` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `play_list` varchar(255) NOT NULL,
  `sound_point` int(11) NOT NULL,
  `sound_hash` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Uni_Playlist` (`play_list`,`sound_point`),
  KEY `play_list` (`play_list`),
  KEY `sound_hash` (`sound_hash`),
  KEY `idx_playlist_play_list` (`play_list`),
  CONSTRAINT `playlist_ibfk_1` FOREIGN KEY (`sound_hash`) REFERENCES `sound_link` (`sound_hash`) ON DELETE CASCADE,
  CONSTRAINT `playlist_ibfk_2` FOREIGN KEY (`play_list`) REFERENCES `playlist_data` (`play_list`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1743 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `playlist_data`
--

DROP TABLE IF EXISTS `playlist_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `playlist_data` (
  `play_list` varchar(255) NOT NULL,
  `art` longblob DEFAULT NULL,
  `create_datetime` datetime NOT NULL DEFAULT current_timestamp(),
  `update_datetime` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`play_list`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sound_link`
--

DROP TABLE IF EXISTS `sound_link`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sound_link` (
  `sound_hash` varchar(255) NOT NULL,
  `add_time` datetime NOT NULL DEFAULT '1970-01-01 00:00:00',
  `title` text NOT NULL,
  `genre` text DEFAULT NULL,
  `lyrics` text DEFAULT NULL,
  `album_hash` text DEFAULT NULL,
  `album_title` text DEFAULT NULL,
  `artist_id` text DEFAULT NULL,
  `artist_name` text DEFAULT NULL,
  `track_no` text DEFAULT NULL,
  `play_count` int(11) NOT NULL DEFAULT 0,
  `data_link` varchar(4351) NOT NULL,
  `loudness_target` decimal(5,2) NOT NULL DEFAULT 0,
  UNIQUE KEY `sound_hash` (`sound_hash`),
  KEY `play_count` (`play_count`),
  KEY `album_title` (`album_title`(768)),
  KEY `artist_name` (`artist_name`(768)),
  KEY `lyrics` (`lyrics`(768)),
  KEY `data_link` (`data_link`(768))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sound_play_history`
--

DROP TABLE IF EXISTS `sound_play_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sound_play_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sound_hash` varchar(255) NOT NULL,
  `play_date` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sound_hash` (`sound_hash`),
  CONSTRAINT `sound_play_history_ibfk_1` FOREIGN KEY (`sound_hash`) REFERENCES `sound_link` (`sound_hash`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `v_playlist`
--

DROP TABLE IF EXISTS `v_playlist`;
/*!50001 DROP VIEW IF EXISTS `v_playlist`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE TABLE `v_playlist` (
  `play_list` tinyint NOT NULL,
  `sound_point` tinyint NOT NULL,
  `sound_hash` tinyint NOT NULL,
  `title` tinyint NOT NULL,
  `genre` tinyint NOT NULL,
  `lyrics` tinyint NOT NULL,
  `album_hash` tinyint NOT NULL,
  `album_title` tinyint NOT NULL,
  `artist_id` tinyint NOT NULL,
  `artist_name` tinyint NOT NULL,
  `track_no` tinyint NOT NULL,
  `play_count` tinyint NOT NULL,
  `data_link` tinyint NOT NULL
) ENGINE=MyISAM */;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `v_playlist`
--

/*!50001 DROP TABLE IF EXISTS `v_playlist`*/;
/*!50001 DROP VIEW IF EXISTS `v_playlist`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`sound`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_playlist` AS select `playlist`.`play_list` AS `play_list`,`playlist`.`sound_point` AS `sound_point`,`sound_link`.`sound_hash` AS `sound_hash`,`sound_link`.`title` AS `title`,`sound_link`.`genre` AS `genre`,`sound_link`.`lyrics` AS `lyrics`,`sound_link`.`album_hash` AS `album_hash`,`sound_link`.`album_title` AS `album_title`,`sound_link`.`artist_id` AS `artist_id`,`sound_link`.`artist_name` AS `artist_name`,`sound_link`.`track_no` AS `track_no`,`sound_link`.`play_count` AS `play_count`,`sound_link`.`data_link` AS `data_link` from (`playlist` left join `sound_link` on(`sound_link`.`sound_hash` = `playlist`.`sound_hash`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-11-24 20:04:11


SELECT * FROM non_existing_table;
