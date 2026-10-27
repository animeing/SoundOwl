import fs from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

// アップロード・一覧・配信で同じ形式定義を使い、未対応形式への暗黙のフォールバックを防ぎます。
const PULSE_FORMATS = new Map([
  ['.wav', { contentType: 'audio/wav', uploadMimes: ['audio/wav', 'audio/wave', 'audio/x-wav'] }],
  ['.mp3', { contentType: 'audio/mpeg', uploadMimes: ['audio/mpeg'] }],
]);
const INVALID_PULSE_FILENAME = /[\\/\x00-\x1f\x7f]/;
const INVALID_WINDOWS_PULSE_FILENAME = /[<>:"|?*]/;

/**
 * @typedef {{filename:string,mime:string,buffer:Buffer}} UploadedPulseFile
 * audio_pulse_data_upload.php 相当 API で受け取るアップロード済み音声ファイルです。
 */

/**
 * 音声波形プリセット用ファイルを保存・一覧・削除するストアです。
 */
class PulseStore {
  /**
   * 保存先ディレクトリを指定して PulseStore を初期化します。
   * @param {string} directory wav/mp3 プリセットファイルを保存するディレクトリ。
   */
  constructor(directory) {
    this.directory = directory;
  }

  /**
   * 保存済みの wav/mp3 プリセットファイル名を一覧します。
   * @returns {Promise<string[]>} 保存先ディレクトリ内のプリセットファイル名一覧。
   */
  async list() {
    await fs.mkdir(this.directory, { recursive: true });
    const entries = await fs.readdir(this.directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && isSafePulseFilename(entry.name))
      .map((entry) => entry.name);
  }

  /**
   * アップロードされた wav/mp3 プリセットを保存します。
   * @param {UploadedPulseFile|null|undefined} file multipart から抽出したファイル。
   * @returns {Promise<{status:'success'|'error',message:string}>} 保存可否を表す API 応答。
   */
  async upload(file) {
    if (!file?.buffer || !isSupportedPulse(file.filename, file.mime)) {
      return { status: 'error', message: 'unsupported pulse file.' };
    }
    await fs.mkdir(this.directory, { recursive: true });
    const target = path.join(this.directory, file.filename);
    const temporary = path.join(this.directory, '.' + randomUUID() + '.upload');
    try {
      await fs.writeFile(temporary, file.buffer, { flag: 'wx' });
      await fs.rename(temporary, target);
    } finally {
      await fs.rm(temporary, { force: true });
    }
    return { status: 'success', message: 'pulse file uploaded.' };
  }

  /**
   * 保存済みの音声ファイルだけを取得します。シンボリックリンクは配信しません。
   * @param {string} filename URL デコード後のファイル名。
   * @returns {Promise<{stream:import('node:stream').Readable,size:number,mime:string}|null>} 存在しない場合は null。
   */
  async read(filename) {
    if (!isSafePulseFilename(filename)) {
      return null;
    }
    const target = path.join(this.directory, filename);
    try {
      const pathMetadata = await fs.lstat(target);
      if (!pathMetadata.isFile()) {
        return null;
      }
      const file = await fs.open(target, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0));
      try {
        const openedFileMetadata = await file.stat();
        if (!openedFileMetadata.isFile()) {
          await file.close();
          return null;
        }
        return {
          stream: file.createReadStream({ autoClose: true }),
          size: openedFileMetadata.size,
          mime: pulseFormat(filename).contentType,
        };
      } catch (error) {
        await file.close();
        throw error;
      }
    } catch (error) {
      if (['ENOENT', 'ENOTDIR', 'ELOOP'].includes(error.code)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 指定されたプリセットファイルを削除します。
   * @param {string} preset 削除するプリセットファイル名。
   * @returns {Promise<{status:'success'|'error',message:string}>} 削除結果を表す API 応答。
   */
  async delete(preset) {
    if (!isSafePulseFilename(preset)) {
      return { status: 'error', message: 'pulse file not found.' };
    }
    const target = path.join(this.directory, preset);
    try {
      await fs.unlink(target);
      return { status: 'success', message: 'pulse file deleted.' };
    } catch (error) {
      return { status: 'error', message: 'pulse file not found.' };
    }
  }
}

/**
 * audio_pulse に保存できる拡張子と MIME type か判定します。
 * @param {string} filename アップロードファイル名。
 * @param {string} mime multipart の Content-Type。
 * @returns {boolean} wav/mp3 として許可する場合は true。
 */
function isSupportedPulse(filename, mime) {
  return isSafePulseFilename(filename)
    && pulseFormat(filename).uploadMimes.includes(String(mime || '').toLowerCase());
}

/**
 * URL 上の1セグメントと保存ディレクトリ直下のファイル名として安全か判定します。
 * @param {string} filename URL デコード後のファイル名。
 * @returns {boolean} wav/mp3 ファイル名の場合は true。
 */
function isSafePulseFilename(filename) {
  return typeof filename === 'string'
    && pulseFormat(filename) !== undefined
    && !INVALID_PULSE_FILENAME.test(filename)
    && !(process.platform === 'win32' && INVALID_WINDOWS_PULSE_FILENAME.test(filename));
}

/**
 * 許可した拡張子に対応する配信形式とアップロード MIME を返します。
 * @param {string} filename IR ファイル名。
 * @returns {{contentType:string,uploadMimes:string[]}|undefined} wav/mp3 以外は undefined。
 */
function pulseFormat(filename) {
  return PULSE_FORMATS.get(path.extname(filename).toLowerCase());
}

export {
  PulseStore,
  isSafePulseFilename,
  isSupportedPulse,
};
