DELETE FROM sound_play_history;
DELETE FROM playlist;
DELETE FROM playlist_data;
DELETE FROM sound_link;
DELETE FROM album;
DELETE FROM artist;

INSERT INTO artist (artist_id, artist_name) VALUES
  ('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'Alpha Artist'),
  ('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'Beta Artist'),
  ('cccccccccccccccccccccccccccccccccccccccc', 'Gamma Artist'),
  ('dddddddddddddddddddddddddddddddddddddddd', 'No Art Artist');

INSERT INTO album (album_key, album_id, title, artist_id, album_art, art_mime, art_length, year) VALUES
  ('1111111111111111111111111111111111111111', 'album-id-one', 'Fixture Album One', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0x89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082, 'image/png', 67, '2024'),
  ('2222222222222222222222222222222222222222', 'album-id-two', 'Fixture Album Two', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', NULL, NULL, NULL, '2025'),
  ('3333333333333333333333333333333333333333', 'album-id-three', 'Shared Search Album', 'cccccccccccccccccccccccccccccccccccccccc', 0x89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082, 'image/png', 67, '2026');

INSERT INTO sound_link
  (sound_hash, add_time, title, genre, lyrics, album_hash, album_title, artist_id, artist_name, track_no, play_count, data_link, loudness_target)
VALUES
  ('8e002bf5f50db0553d82bc67e9225ef2b7ab1611', '2026-05-01 10:00:00', 'Alpha Track One', 'Rock', 'alpha lyrics', '1111111111111111111111111111111111111111', 'Fixture Album One', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'Alpha Artist', '1', 2, '/music/contract-fixture/track-01.wav', -1.25),
  ('206f8970206ca2be1c578654d323c4783e58b5bb', '2026-05-02 10:00:00', 'Alpha Track Two', 'Rock', NULL, '1111111111111111111111111111111111111111', 'Fixture Album One', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'Alpha Artist', '2', 7, '/music/contract-fixture/track-02.wav', -2.50),
  ('8ee9a84fa1a11e5dcf6598db5f013c492e3c0dd6', '2026-05-03 10:00:00', 'Alpha Track Ten', 'Rock', NULL, '1111111111111111111111111111111111111111', 'Fixture Album One', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'Alpha Artist', '10', 3, '/music/contract-fixture/track-03.wav', 0.00),
  ('6f73891510e6784d079b2d85a65fdd0853c17ce8', '2026-05-04 10:00:00', 'Beta Exact Match', 'Jazz', 'beta lyrics', '2222222222222222222222222222222222222222', 'Fixture Album Two', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'Beta Artist', '1', 11, '/music/contract-fixture/track-04.wav', -3.75),
  ('3bc9837935760d7094815b18a6fd929a7a133ff8', '2026-05-05 10:00:00', 'Needle Song One', 'Pop', NULL, '3333333333333333333333333333333333333333', 'Shared Search Album', 'cccccccccccccccccccccccccccccccccccccccc', 'Gamma Artist', '1', 5, '/music/contract-fixture/track-05.wav', -4.00),
  ('fd72d48dc615f30ace4105d753fc261dadd2d029', '2026-05-06 10:00:00', 'Needle Song Two', 'Pop', NULL, '3333333333333333333333333333333333333333', 'Shared Search Album', 'cccccccccccccccccccccccccccccccccccccccc', 'Gamma Artist', '2', 1, '/music/contract-fixture/track-06.wav', -5.00),
  ('08fac533681b60e6edc3035652833f49096529c4', '2026-05-07 10:00:00', 'No Album Song', NULL, NULL, NULL, NULL, 'dddddddddddddddddddddddddddddddddddddddd', 'No Art Artist', NULL, 0, '/music/contract-fixture/track-07.wav', 0.00),
  ('9ce0b98bbf081981bf7b7c990723e7c582c7a44e', '2026-05-08 10:00:00', 'Orphan Artist Song', 'Ambient', NULL, NULL, NULL, NULL, NULL, 'A1', 9, '/music/contract-fixture/track-08.wav', -6.00);

INSERT INTO sound_play_history (id, sound_hash, play_date) VALUES
  (1, '8e002bf5f50db0553d82bc67e9225ef2b7ab1611', '2026-05-10 10:00:00'),
  (2, '6f73891510e6784d079b2d85a65fdd0853c17ce8', '2026-05-11 10:00:00');

INSERT INTO playlist_data (play_list, art, create_datetime, update_datetime) VALUES
  ('fixture-list', 0x89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082, '2026-05-12 10:00:00', '2026-05-12 10:00:00');

INSERT INTO playlist (play_list, sound_point, sound_hash) VALUES
  ('fixture-list', 0, '206f8970206ca2be1c578654d323c4783e58b5bb'),
  ('fixture-list', 1, '3bc9837935760d7094815b18a6fd929a7a133ff8');
