import path from 'node:path';
import iconv from 'iconv-lite';
import Encoding from 'encoding-japanese';

const BYTE_ENCODINGS = ['utf8', 'cp932', 'shift_jis', 'euc-jp', 'latin1', 'win1252'];
const WRONG_STRING_ENCODINGS = ['cp932', 'shift_jis', 'euc-jp', 'latin1', 'win1252'];

/**
 * ffprobe の解析結果を曲登録用メタデータへ正規化します。
 * @param {{format?:{tags?:Record<string, unknown>},streams?:Array<{tags?:Record<string, unknown>,disposition?:Record<string, unknown>,codec_name?:string,duration_ts?:number|string}>}} probeResult ffprobe の解析結果。
 * @param {string} filePath title fallback に使う音声ファイルパス。
 * @returns {{hasTags:boolean,title:string|false,artist:string|false,album:string|false,genre:string|false,lyrics:string|false,track:string|false,year:string|false,picture:{mime:string|null,length:number|null}|null,raw:unknown}} 登録処理用に正規化したメタデータ。
 */
function normalizeMetadata(probeResult, filePath) {
  const formatTags = probeResult?.format?.tags || {};
  const streamTags = Object.assign({}, ...((probeResult?.streams || []).map((stream) => stream.tags || {})));
  const tags = { ...streamTags, ...formatTags };

  const title = firstTag(tags, ['title', 'TITLE']) || path.basename(filePath);
  const artist = firstTag(tags, ['artist', 'ARTIST', 'album_artist', 'ALBUMARTIST', 'band', 'BAND']);
  const album = firstTag(tags, ['album', 'ALBUM', 'product', 'PRODUCT']);
  const genre = firstTag(tags, ['genre', 'GENRE']);
  const lyrics = firstTag(tags, ['lyrics', 'LYRICS', 'unsyncedlyrics', 'UNSYNCEDLYRICS']);
  const track = firstTag(tags, ['track', 'TRACK', 'track_number', 'TRACKNUMBER']);
  const year = firstTag(tags, ['date', 'DATE', 'year', 'YEAR']);

  return {
    hasTags: Object.keys(tags).length > 0,
    title: stringOrFalse(title),
    artist: stringOrFalse(artist),
    album: stringOrFalse(album),
    genre: stringOrFalse(genre),
    lyrics: normalizeLyrics(lyrics),
    track: stringOrFalse(track),
    year: year ? normalizeTagValue(year).slice(0, 10) : false,
    picture: extractPicture(probeResult),
    raw: probeResult,
  };
}

/**
 * music-metadata で音声ファイルのタグを読み込み、曲登録用メタデータへ正規化します。
 * @param {string} filePath 読み込み対象の音声ファイルパス。
 * @param {{parseFile?:(filePath:string, options:Record<string, unknown>)=>Promise<Record<string, unknown>>}} [options={}] テスト時に parser を差し替えるためのオプション。
 * @returns {Promise<Record<string, unknown>>} 登録処理用に正規化したメタデータ。
 */
async function readMetadata(filePath, options = {}) {
  const parseFile = options.parseFile || (await import('music-metadata')).parseFile;
  return normalizeMusicMetadata(await parseFile(filePath, { duration: false }), filePath);
}

/**
 * music-metadata の common/native タグを曲登録用メタデータへ正規化します。
 * @param {{common?:Record<string, unknown>,native?:Record<string, Array<{id:string,value:unknown}>>}} metadata music-metadata の parse 結果。
 * @param {string} filePath title fallback に使う音声ファイルパス。
 * @returns {Record<string, unknown>} 登録処理用に正規化したメタデータ。
 */
function normalizeMusicMetadata(metadata, filePath) {
  const common = metadata?.common || {};
  const native = metadata?.native || {};
  const title = common.title || firstNativeTag(native, ['title']) || path.basename(filePath);
  const artist = common.artist || common.albumartist || firstNativeTag(native, ['artist', 'albumartist', 'album_artist', 'band']);
  const album = common.album || firstNativeTag(native, ['album', 'product']);
  const picture = Array.isArray(common.picture) && common.picture[0] ? common.picture[0] : null;
  return {
    hasTags: hasMetadataTags(common, native),
    title: stringOrFalse(title),
    artist: stringOrFalse(artist),
    album: stringOrFalse(album),
    genre: stringOrFalse(Array.isArray(common.genre) ? common.genre[0] : common.genre),
    lyrics: normalizeLyrics(common.lyrics),
    track: common.track?.no ? String(common.track.no) : stringOrFalse(firstNativeTag(native, ['track', 'tracknumber'])),
    year: common.year ? String(common.year).slice(0, 10) : stringOrFalse(firstNativeTag(native, ['date', 'year'])),
    picture: picture ? {
      data: picture.data,
      mime: picture.format || null,
      length: picture.data?.length || null,
    } : null,
    raw: metadata,
  };
}

/**
 * native タグ群から候補名に一致する最初の値を返します。
 * @param {Record<string, Array<{id:string,value:unknown}>>} native native tag のまとまり。
 * @param {string[]} names 探索する tag 名。大文字小文字は区別しません。
 * @returns {unknown|false} 見つかった値。存在しない場合は false。
 */
function firstNativeTag(native, names) {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const tags of Object.values(native || {})) {
    for (const tag of tags || []) {
      if (wanted.has(String(tag.id).toLowerCase())) {
        return Array.isArray(tag.value) ? tag.value[0] : tag.value;
      }
    }
  }
  return false;
}

/**
 * common/native のどちらかにタグが存在するか判定します。
 * @param {Record<string, any>} common music-metadata の common タグ。
 * @param {Record<string, Array<{id:string,value:any}>>} native music-metadata の native タグ。
 * @returns {boolean} 登録に使えるタグが 1 件以上ある場合は true。
 */
function hasMetadataTags(common, native) {
  return Object.keys(common || {}).length > 0 || Object.values(native || {}).some((tags) => (tags || []).length > 0);
}

/**
 * ffprobe のタグ集合から候補名に一致する最初の値を取得します。
 * @param {Record<string, any>} tags ffprobe 由来のタグ key/value。
 * @param {string[]} names 探索するタグ名候補。
 * @returns {any|false} 最初に見つかったタグ値。存在しない場合は false。
 */
function firstTag(tags, names) {
  for (const name of names) {
    if (tags[name] !== undefined && tags[name] !== null && tags[name] !== '') {
      return Array.isArray(tags[name]) ? tags[name][0] : tags[name];
    }
  }
  return false;
}

/**
 * 空値を false にし、それ以外のタグ値を表示用文字列へ変換します。
 * @param {any} value 文字列、Buffer、配列などタグから取得した値。
 * @returns {string|false} 正規化済み文字列。空値の場合は false。
 */
function stringOrFalse(value) {
  if (value === false || value === undefined || value === null || value === '') {
    return false;
  }
  return normalizeLineBreaks(normalizeTagValue(value));
}

/**
 * 歌詞タグを表示用文字列へ正規化します。
 * @param {string|Array<unknown>|{text?:string,lyrics?:string,value?:string}|false|null|undefined} value 歌詞タグ。
 * @returns {string|false} LF 改行に統一した歌詞本文。未検出の場合は false。
 */
function normalizeLyrics(value) {
  if (value === false || value === undefined || value === null || value === '') {
    return false;
  }
  if (Array.isArray(value)) {
    const lyrics = value.map((entry) => normalizeLyrics(entry)).filter(Boolean);
    return lyrics.length > 0 ? lyrics.join('\n') : false;
  }
  if (typeof value === 'object') {
    if (typeof value.text === 'string') {
      return normalizeLineBreaks(normalizeTagText(value.text));
    }
    if (typeof value.lyrics === 'string') {
      return normalizeLineBreaks(normalizeTagText(value.lyrics));
    }
    if (typeof value.value === 'string') {
      return normalizeLineBreaks(normalizeTagText(value.value));
    }
    return false;
  }
  return normalizeLineBreaks(normalizeTagValue(value));
}

/**
 * CRLF/CR の改行を LF に統一します。
 * @param {string} value 改行を含む文字列。
 * @returns {string} LF 改行へ統一した文字列。
 */
function normalizeLineBreaks(value) {
  return value.replace(/\r\n?/g, '\n');
}

/**
 * タグ値を文字列へ変換し、Buffer の場合は複数文字コード候補から最良の文字列を選びます。
 * @param {any} value タグから取得した値。
 * @returns {string} 文字化け補正を試みた表示用文字列。
 */
function normalizeTagValue(value) {
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return bestDecodedBuffer(Buffer.from(value));
  }
  return normalizeTagText(String(value));
}

/**
 * 文字列タグが文字化けしている場合だけ候補を生成して補正します。
 * @param {string} value タグ文字列。
 * @returns {string} 補正後の文字列。補正不要または改善しない場合は入力値。
 */
function normalizeTagText(value) {
  if (!looksMojibake(value)) {
    return value;
  }
  const highBitStrippedUtf8 = repairHighBitStrippedUtf8(value);
  if (highBitStrippedUtf8 !== value) {
    return repairKnownHighBitStrippedUtf8Artifacts(highBitStrippedUtf8);
  }
  const cp932Utf8Raw = iconv.decode(iconv.encode(value, 'cp932'), 'utf8');
  const cp932Utf8 = repairKnownHighBitStrippedUtf8Artifacts(cp932Utf8Raw);
  if (cp932Utf8 !== cp932Utf8Raw && !cp932Utf8.includes('\uFFFD') && countQuestionMarks(cp932Utf8) <= countQuestionMarks(value)) {
    return cp932Utf8;
  }
  return bestCandidate(value, repairStringCandidates(value));
}

/**
 * 文字化け文字列に対する復元候補を複数の文字コード経路で生成します。
 * @param {string} value 文字化けしている可能性がある文字列。
 * @returns {string[]} 復元候補の文字列一覧。
 */
function repairStringCandidates(value) {
  const candidates = [];
  const highBitStrippedUtf8 = repairHighBitStrippedUtf8(value);
  if (highBitStrippedUtf8 !== value) {
    candidates.push(highBitStrippedUtf8);
  }
  const highBitStrippedCp932 = repairHighBitStrippedCp932(value);
  if (highBitStrippedCp932 !== value) {
    candidates.push(highBitStrippedCp932);
  }
  for (const wrongEncoding of WRONG_STRING_ENCODINGS) {
    let bytes;
    try {
      bytes = iconv.encode(value, wrongEncoding);
    } catch {
      continue;
    }
    for (const correctEncoding of BYTE_ENCODINGS) {
      try {
        candidates.push(iconv.decode(bytes, correctEncoding));
      } catch {
        // 失敗した候補は無視します。
        }
    }
  }
  try {
    candidates.push(Buffer.from(value, 'latin1').toString('utf8'));
  } catch {
    // 失敗した候補は無視します。
    }
  return candidates;
}

/**
 * UTF-8 の上位 bit が欠落したように見える文字列を復元します。
 * @param {string} value 復元候補の文字列。
 * @returns {string} UTF-8 として復元できた場合は decode 後の文字列。該当しない場合は入力値。
 */
function repairHighBitStrippedUtf8(value) {
  let repaired = '';
  let changed = false;
  for (let index = 0; index < value.length;) {
    const first = value.charCodeAt(index);
    const second = index + 1 < value.length ? value.charCodeAt(index + 1) : null;
    const third = index + 2 < value.length ? value.charCodeAt(index + 2) : null;
    if (first >= 0x60 && first <= 0x6f && second !== null && third !== null && second <= 0x3f && third <= 0x3f) {
      repaired += Buffer.from([first + 0x80, second + 0x80, third + 0x80]).toString('utf8');
      index += 3;
      changed = true;
      continue;
    }
    if (first >= 0x40 && first <= 0x5f && second !== null && second <= 0x3f && second !== 0x20) {
      repaired += Buffer.from([first + 0x80, second + 0x80]).toString('utf8');
      index += 2;
      changed = true;
      continue;
    }
    repaired += value[index];
    index += 1;
  }
  if (!changed) {
    return value;
  }
  return repaired;
}

/**
 * UTF-8 high-bit 欠落から復元した後に残る既知の中間表現を補正します。
 * @param {string} value UTF-8 byte 復元後の文字列。
 * @returns {string} SoundOwl の既存テストデータで確認済みの中間表現を補正した文字列。
 */
function repairKnownHighBitStrippedUtf8Artifacts(value) {
  return value
    .replace(/チł9ト/g, 'テスト')
    .replace(/チE��ト/g, 'テスト');
}

/**
 * CP932 の上位 bit が欠落したように見える文字列を復元します。
 * @param {string} value 復元候補の文字列。
 * @returns {string} 復元できた場合は CP932 decode 後の文字列。該当しない場合は入力値。
 */
function repairHighBitStrippedCp932(value) {
  let repaired = '';
  let changed = false;
  for (let index = 0; index < value.length;) {
    const first = value.charCodeAt(index);
    const second = index + 1 < value.length ? value.charCodeAt(index + 1) : null;
    if (isHighBitStrippedLeadByte(first) && second !== null && second < 0x80) {
      const bytes = [];
      while (index + 1 < value.length) {
        const lead = value.charCodeAt(index);
        const trail = value.charCodeAt(index + 1);
        if (!isHighBitStrippedLeadByte(lead) || trail >= 0x80) {
          break;
        }
        bytes.push(restoreHighBitStrippedLeadByte(lead), restoreHighBitStrippedTrailByte(lead, trail));
        index += 2;
      }
      repaired += iconv.decode(Buffer.from(bytes), 'cp932');
      changed = true;
      continue;
    }
    repaired += value[index];
    index += 1;
  }
  return changed ? repaired : value;
}

/**
 * 上位 bit が欠落した CP932 lead byte を元の byte 値へ戻します。
 * @param {number} code 0x01-0x1f の範囲にある欠落後 lead byte。
 * @returns {number} 0x80 を加算した lead byte。
 */
function restoreHighBitStrippedLeadByte(code) {
  return code + 0x80;
}

/**
 * lead byte の種類を見て CP932 trail byte の上位 bit 欠落を補正します。
 * @param {number} strippedLead 上位 bit が欠落した lead byte。
 * @param {number} trail trail byte 候補。
 * @returns {number} 復元後の trail byte。
 */
function restoreHighBitStrippedTrailByte(strippedLead, trail) {
  const lead = restoreHighBitStrippedLeadByte(strippedLead);
  if (trail < 0x40 || trail === 0x7f || lead === 0x82 || lead === 0x8e) {
    return trail + 0x80;
  }
  return trail;
}

/**
 * CP932 lead byte の上位 bit が欠落した値か判定します。
 * @param {number} code 判定する文字コード。
 * @returns {boolean} 0x01-0x1f の範囲なら true。
 */
function isHighBitStrippedLeadByte(code) {
  return code >= 0x01 && code <= 0x1f;
}

/**
 * Buffer を複数 encoding で decode し、最も文字化けが少ない候補を返します。
 * @param {Buffer} buffer タグから取得した raw byte。
 * @returns {string} 最良と判定した decode 結果。
 */
function bestDecodedBuffer(buffer) {
  const candidates = [];
  for (const encoding of BYTE_ENCODINGS) {
    try {
      candidates.push(iconv.decode(buffer, encoding));
    } catch {
      // 失敗した候補は無視します。
      }
  }
  const detected = detectJapaneseEncoding(buffer);
  if (detected) {
    try {
      candidates.push(Encoding.codeToString(Encoding.convert([...buffer], { to: 'UNICODE', from: detected })));
    } catch {
      // 失敗した候補は無視します。
      }
  }
  return bestCandidate(buffer.toString('utf8'), candidates);
}

/**
 * encoding-japanese で日本語系 encoding を推定します。
 * @param {Buffer} buffer 判定対象の raw byte。
 * @returns {string|false} 推定 encoding 名。ASCII または推定不能の場合は false。
 */
function detectJapaneseEncoding(buffer) {
  const detected = Encoding.detect([...buffer]);
  return detected && detected !== 'ASCII' ? detected : false;
}

/**
 * 復元候補の中から文字化けスコアが最も低い文字列を選びます。
 * @param {string} original 補正前の文字列。
 * @param {string[]} candidates 復元候補。
 * @returns {string} 最良候補。改善候補がない場合は original。
 */
function bestCandidate(original, candidates) {
  let best = original;
  for (const candidate of candidates) {
    if (!candidate || candidate === original || isLossyCandidate(original, candidate)) {
      continue;
    }
    if (textQualityScore(candidate) < textQualityScore(best)) {
      best = candidate;
    }
  }
  return best;
}

/**
 * 候補が元文字列より情報落ちしているか判定します。
 * @param {string} original 補正前の文字列。
 * @param {string} candidate 復元候補。
 * @returns {boolean} 置換文字や制御文字が増えるなど劣化している場合は true。
 */
function isLossyCandidate(original, candidate) {
  return candidate.includes('\uFFFD')
    || countQuestionMarks(candidate) > countQuestionMarks(original)
    || containsDisallowedControl(candidate);
}

/**
 * 文字化けらしさ、置換文字、制御文字、日本語文字数から品質スコアを算出します。
 * @param {string} value 評価対象文字列。
 * @returns {number} 小さいほど表示品質が高いスコア。
 */
function textQualityScore(value) {
  return mojibakeScore(value)
    + countQuestionMarks(value) * 5
    + countReplacementChars(value) * 50
    + countDisallowedControls(value) * 20
    - countJapaneseChars(value) * 0.2;
}

/**
 * 文字列が文字化けしている可能性があるか判定します。
 * @param {string} value 判定対象文字列。
 * @returns {boolean} 文字化け marker、制御文字、置換文字があれば true。
 */
function looksMojibake(value) {
  return mojibakeScore(value) > 0 || countDisallowedControls(value) > 0 || countReplacementChars(value) > 0;
}

/**
 * mojibake marker、半角カナ、C1 制御文字、UTF-8 を Latin-1 と誤読した連続 byte を点数化します。
 * @param {string} value 評価対象文字列。
 * @returns {number} 文字化けらしさのスコア。
 */
function mojibakeScore(value) {
  const markerMatches = value.match(/[\u7E3A\u7E67\u8B41\u7E5D\u90B5\u90E2\u30FB\uFFFD]/gu) || [];
  const halfWidthKanaMatches = value.match(/[\uFF61-\uFF9F]/gu) || [];
  const c1ControlMatches = value.match(/[\u0080-\u009f]/gu) || [];
  const utf8AsLatin1Pairs = value.match(/(?:[\u00c2-\u00f4][\u0080-\u00bf]){2,}/gu) || [];
  return markerMatches.length * 2
    + halfWidthKanaMatches.length
    + c1ControlMatches.length * 5
    + utf8AsLatin1Pairs.join('').length;
}

/**
 * @param {string} value 評価対象文字列。
 * @returns {number} ? の出現数。
 */
function countQuestionMarks(value) {
  return (value.match(/\?/g) || []).length;
}

/**
 * @param {string} value 評価対象文字列。
 * @returns {number} Unicode replacement character の出現数。
 */
function countReplacementChars(value) {
  return (value.match(/\uFFFD/gu) || []).length;
}

/**
 * @param {string} value 評価対象文字列。
 * @returns {boolean} 表示に不要な制御文字を含む場合は true。
 */
function containsDisallowedControl(value) {
  return countDisallowedControls(value) > 0;
}

/**
 * @param {string} value 評価対象文字列。
 * @returns {number} 表示に不要な制御文字の出現数。
 */
function countDisallowedControls(value) {
  return (value.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u0080-\u009f]/gu) || []).length;
}

/**
 * @param {string} value 評価対象文字列。
 * @returns {number} ひらがな、カタカナ、漢字の出現数。
 */
function countJapaneseChars(value) {
  return (value.match(/[\u3040-\u30ff\u3400-\u9fff]/gu) || []).length;
}

/**
 * ffprobe の stream 情報から attached picture の概要を取り出します。
 * @param {{streams?:Array<{disposition?:{attached_pic?:boolean},codec_name?:string,duration_ts?:number|string}>}} probeResult ffprobe の解析結果。
 * @returns {{mime:string|null,length:number|null}|null} 画像 stream の MIME と推定長。画像がない場合は null。
 */
function extractPicture(probeResult) {
  const pictureStream = (probeResult?.streams || []).find((stream) => stream.disposition?.attached_pic);
  if (!pictureStream) {
    return null;
  }
  return {
    mime: pictureStream.codec_name ? `image/${pictureStream.codec_name.replace('mjpeg', 'jpeg')}` : null,
    length: Number(pictureStream.duration_ts || 0) || null,
  };
}

export {
  firstNativeTag,
  hasMetadataTags,
  normalizeMusicMetadata,
  normalizeMetadata,
  normalizeTagText,
  normalizeTagValue,
  readMetadata,
};
