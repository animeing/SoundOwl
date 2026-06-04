import path from 'node:path';
import iconv from 'iconv-lite';
import Encoding from 'encoding-japanese';

const BYTE_ENCODINGS = ['utf8', 'cp932', 'shift_jis', 'euc-jp', 'latin1', 'win1252'];
const WRONG_STRING_ENCODINGS = ['cp932', 'shift_jis', 'euc-jp', 'latin1', 'win1252'];

/**
 * @typedef {Object} NormalizedMetadata
 * @property {boolean} hasTags タグが存在したか。
 * @property {string|false} title タイトル。タグがない場合はファイル名。
 * @property {string|false} artist アーティスト名。未検出の場合は false。
 * @property {string|false} album アルバム名。未検出の場合は false。
 * @property {string|false} genre ジャンル。未検出の場合は false。
 * @property {string|false} lyrics 歌詞。未検出の場合は false。
 * @property {string|false} track トラック番号。未検出の場合は false。
 * @property {string|false} year 年または日付の先頭 10 文字。未検出の場合は false。
 * @property {{mime:string|null,length:number|null,data?:Buffer}|null} picture 埋め込み画像の概要。存在しない場合は null。
 * @property {Object} raw 解析元のメタデータ。
 */

/**
 * ffprobe の解析結果を登録処理で扱いやすいメタデータ DTO に正規化する。
 * 通常は music-metadata を優先するが、ffprobe fallback 用に PHP 版の getID3 利用箇所と近い戻り値へ寄せる。
 *
 * @param {Object} probeResult ffprobe が返した JSON オブジェクト。
 * @param {string} filePath タイトル fallback に使う音源ファイルパス。
 * @returns {NormalizedMetadata} 登録処理が扱う正規化済みメタデータ。
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
 * 音源ファイルからタグを読み取り、登録処理用 DTO へ正規化する。
 * music-metadata の parseFile を使い、テストでは parser を差し替えられる。
 *
 * @param {string} filePath 解析対象の音源ファイルパス。
 * @param {{parseFile?:Function}} [options] テスト時に差し替える parser 実装。
 * @returns {Promise<NormalizedMetadata>} 正規化済みメタデータ。
 */
async function readMetadata(filePath, options = {}) {
  const parseFile = options.parseFile || (await import('music-metadata')).parseFile;
  return normalizeMusicMetadata(await parseFile(filePath, { duration: false }), filePath);
}

/**
 * music-metadata の解析結果を PHP getID3 相当の DTO に変換する。
 * common tag を優先し、欠けている場合は native tag から拾う。native tag が Buffer の場合も文字コード候補から復元する。
 *
 * @param {Object} metadata music-metadata の parse 結果。
 * @param {string} filePath タイトル fallback に使う音源ファイルパス。
 * @returns {NormalizedMetadata} 登録処理で使う正規化済みメタデータ。
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
 * native tag 群から候補名に一致する最初の値を返す。
 *
 * @param {Object.<string, Array<{id:string,value:unknown}>>} native native tag のまとまり。
 * @param {string[]} names 探索する tag 名。大文字小文字は区別しない。
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
 * common/native のどちらかにタグが存在するか判定する。
 *
 * @param {Object} common common tags。
 * @param {Object} native native tags。
 * @returns {boolean} タグが 1 件以上あれば true。
 */
function hasMetadataTags(common, native) {
  return Object.keys(common || {}).length > 0 || Object.values(native || {}).some((tags) => (tags || []).length > 0);
}

/**
 * 複数のタグ名候補から最初に存在する値を返す。
 *
 * @param {Object.<string, unknown>} tags タグ名と値の object。
 * @param {string[]} names 優先順に並べたタグ名候補。
 * @returns {string|false|unknown} 見つかった値。存在しない場合は false。
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
 * 空値を false へ揃え、値がある場合はタグ文字列として正規化する。
 *
 * @param {unknown} value 変換対象の値。
 * @returns {string|false} 正規化済み文字列。値がない場合は false。
 */
function stringOrFalse(value) {
  if (value === false || value === undefined || value === null || value === '') {
    return false;
  }
  return normalizeLineBreaks(normalizeTagValue(value));
}

/**
 * music-metadata が返す歌詞タグを登録用文字列へ正規化する。
 * USLT などは `{ language, descriptor, text }` の object で返るため、通常の `String(value)` に渡すと `[object Object]` になる。
 *
 * @param {unknown} value 歌詞タグ。文字列、object、配列のいずれもあり得る。
 * @returns {string|false} 歌詞本文。未検出の場合は false。
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
 * 歌詞などの複数行テキストの改行コードをブラウザ表示で扱いやすい LF に統一する。
 *
 * @param {string} value 改行コードを含み得る文字列。
 * @returns {string} CRLF/CR を LF に統一した文字列。
 */
function normalizeLineBreaks(value) {
  return value.replace(/\r\n?/g, '\n');
}

/**
 * Buffer/string/数値などのタグ値を登録用文字列へ正規化する。
 * Buffer は複数 encoding 候補から最も文字化けが少ない値を選ぶ。string は正しく読めている値を壊さないよう、文字化け候補に見える場合だけ復元を試す。
 *
 * @param {unknown} value タグ値。
 * @returns {string} 正規化済み文字列。
 */
function normalizeTagValue(value) {
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return bestDecodedBuffer(Buffer.from(value));
  }
  return normalizeTagText(String(value));
}

/**
 * タグ文字列が典型的な文字化けに見える場合だけ UTF-8 へ復元する。
 * 正常な日本語や欧文名を無条件変換すると逆に壊れるため、品質が上がる候補だけ採用する。
 *
 * @param {string} value music-metadata または ffprobe から受け取ったタグ文字列。
 * @returns {string} 必要な場合だけ復元したタグ文字列。判断できない場合は元の値。
 */
function normalizeTagText(value) {
  if (!looksMojibake(value)) {
    return value;
  }
  return bestCandidate(value, repairStringCandidates(value));
}

/**
 * 文字列化済み mojibake から復元候補を作る。
 * PHP 版と同じく「誤った encoding で読まれた byte 列を作り直し、正しい encoding として読み直す」方向で候補を評価する。
 *
 * @param {string} value 文字化けした可能性がある文字列。
 * @returns {string[]} 復元候補の配列。
 */
function repairStringCandidates(value) {
  const candidates = [];
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
        // iconv-lite が未対応の候補は無視する。
      }
    }
  }
  try {
    candidates.push(Buffer.from(value, 'latin1').toString('utf8'));
  } catch {
    // latin1 経由の復元に失敗した候補は無視する。
  }
  return candidates;
}

/**
 * CP932 の各 byte から高 bit だけが落ちた WAV INFO タグを復元する。
 * 例: CP932 の `82 A0 82 C8` が `02 20 02 48` として読まれた場合、byte ごとに `0x80` を戻して CP932 として読み直す。
 * ASCII 部分は壊さないよう、制御文字を含む 2 byte 単位の区間だけ復元対象にする。
 *
 * @param {string} value music-metadata または ffprobe が文字列として返したタグ値。
 * @returns {string} 復元できた文字列。対象パターンでなければ元の値。
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
 * 高 bit が欠落した CP932 lead byte を元に戻す。
 *
 * @param {number} code 高 bit が欠落している可能性がある lead byte。
 * @returns {number} 復元後の CP932 lead byte。
 */
function restoreHighBitStrippedLeadByte(code) {
  return code + 0x80;
}

/**
 * 高 bit が欠落した CP932 trail byte を必要な場合だけ元に戻す。
 * CP932 の trail byte は元から ASCII 範囲のことがあるため、常に `0x80` を足すと `春` が `畳` になるような誤変換が起きる。
 *
 * @param {number} strippedLead 高 bit が欠落した lead byte。
 * @param {number} trail 判定対象の trail byte。
 * @returns {number} 復元後の CP932 trail byte。
 */
function restoreHighBitStrippedTrailByte(strippedLead, trail) {
  const lead = restoreHighBitStrippedLeadByte(strippedLead);
  if (trail < 0x40 || trail === 0x7f || lead === 0x82 || lead === 0x8e) {
    return trail + 0x80;
  }
  return trail;
}

/**
 * 高 bit が欠落した CP932 の先頭 byte らしい値か判定する。
 * CP932 の日本語 2 byte 文字は 0x81-0x9F または 0xE0-0xFC から始まるため、高 bit 欠落後は 0x01-0x1F または 0x60-0x7C に見える。
 *
 * @param {number} code 文字列中の 1 code unit。
 * @returns {boolean} 高 bit 欠落 CP932 の lead byte 候補なら true。
 */
function isHighBitStrippedLeadByte(code) {
  return code >= 0x01 && code <= 0x1f;
}

/**
 * Buffer tag を複数 encoding 候補で decode し、最も自然な文字列を選ぶ。
 *
 * @param {Buffer} buffer タグの生 byte。
 * @returns {string} decode 結果。
 */
function bestDecodedBuffer(buffer) {
  const candidates = [];
  for (const encoding of BYTE_ENCODINGS) {
    try {
      candidates.push(iconv.decode(buffer, encoding));
    } catch {
      // iconv-lite が未対応の候補は無視する。
    }
  }
  const detected = detectJapaneseEncoding(buffer);
  if (detected) {
    try {
      candidates.push(Encoding.codeToString(Encoding.convert([...buffer], { to: 'UNICODE', from: detected })));
    } catch {
      // encoding-japanese の候補変換に失敗した場合は無視する。
    }
  }
  return bestCandidate(buffer.toString('utf8'), candidates);
}

/**
 * encoding-japanese で日本語系 encoding を推定する。
 *
 * @param {Buffer} buffer 推定対象 byte。
 * @returns {string|false} 推定された encoding 名。推定できない場合は false。
 */
function detectJapaneseEncoding(buffer) {
  const detected = Encoding.detect([...buffer]);
  return detected && detected !== 'ASCII' ? detected : false;
}

/**
 * 候補の中から、元の値より文字化けらしさが少なく、変換不能文字が増えない値を選ぶ。
 *
 * @param {string} original 元の文字列。
 * @param {string[]} candidates 変換候補。
 * @returns {string} 採用した候補。良い候補がない場合は元の値。
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
 * 変換不能文字や制御文字が増えた候補を捨てる。
 *
 * @param {string} original 元の文字列。
 * @param {string} candidate 変換候補。
 * @returns {boolean} 採用すべきではない候補なら true。
 */
function isLossyCandidate(original, candidate) {
  return candidate.includes('\uFFFD')
    || countQuestionMarks(candidate) > countQuestionMarks(original)
    || containsDisallowedControl(candidate);
}

/**
 * 文字化けらしさを総合的に数値化する。
 *
 * @param {string} value 評価対象の文字列。
 * @returns {number} 小さいほど自然な文字列。
 */
function textQualityScore(value) {
  return mojibakeScore(value)
    + countQuestionMarks(value) * 5
    + countReplacementChars(value) * 50
    + countDisallowedControls(value) * 20
    - countJapaneseChars(value) * 0.2;
}

/**
 * 文字列が典型的な mojibake を含むか判定する。
 *
 * @param {string} value 判定対象の文字列。
 * @returns {boolean} 復元を試すべき文字化け候補なら true。
 */
function looksMojibake(value) {
  return mojibakeScore(value) > 0 || countDisallowedControls(value) > 0 || countReplacementChars(value) > 0;
}

/**
 * 文字化けらしさを簡易的に数値化する。
 *
 * @param {string} value 評価対象の文字列。
 * @returns {number} 大きいほど文字化けの疑いが強い。
 */
function mojibakeScore(value) {
  const markerMatches = value.match(/[縺繧繝螳蜿謗莨莉譁蟆荳鬆謖莠ÂÃ�]/gu) || [];
  const halfWidthKanaMatches = value.match(/[｡-ﾟ]/gu) || [];
  const c1ControlMatches = value.match(/[\u0080-\u009f]/gu) || [];
  const utf8AsLatin1Pairs = value.match(/(?:[\u00c2-\u00f4][\u0080-\u00bf]){2,}/gu) || [];
  return markerMatches.length * 2
    + halfWidthKanaMatches.length
    + c1ControlMatches.length * 5
    + utf8AsLatin1Pairs.join('').length;
}

/**
 * 疑問符の数を数える。
 *
 * @param {string} value 評価対象の文字列。
 * @returns {number} 疑問符の数。
 */
function countQuestionMarks(value) {
  return (value.match(/\?/g) || []).length;
}

/**
 * Unicode replacement character の数を数える。
 *
 * @param {string} value 評価対象の文字列。
 * @returns {number} replacement character の数。
 */
function countReplacementChars(value) {
  return (value.match(/\uFFFD/gu) || []).length;
}

/**
 * 登録タグに入れたくない制御文字が含まれるか判定する。
 *
 * @param {string} value 評価対象の文字列。
 * @returns {boolean} 許可外制御文字があれば true。
 */
function containsDisallowedControl(value) {
  return countDisallowedControls(value) > 0;
}

/**
 * 登録タグに入れたくない制御文字の数を数える。改行、CR、タブは歌詞などであり得るため許可する。
 *
 * @param {string} value 評価対象の文字列。
 * @returns {number} 許可外制御文字の数。
 */
function countDisallowedControls(value) {
  return (value.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u0080-\u009f]/gu) || []).length;
}

/**
 * 日本語文字の数を数える。候補比較時に、自然な日本語へ戻った値を少し優先するために使う。
 *
 * @param {string} value 評価対象の文字列。
 * @returns {number} 日本語文字の数。
 */
function countJapaneseChars(value) {
  return (value.match(/[\u3040-\u30ff\u3400-\u9fff]/gu) || []).length;
}

/**
 * ffprobe stream 情報から埋め込み画像の概要を取り出す。
 *
 * @param {Object} probeResult ffprobe が返した JSON オブジェクト。
 * @returns {{mime:string|null,length:number|null}|null} 画像概要。存在しない場合は null。
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