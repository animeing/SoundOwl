import fs from 'node:fs/promises';
import path from 'node:path';

const PULSE_EXTENSIONS = /\.(wav|mp3)$/i;
const PULSE_MIME = /^(audio\/wav|audio\/wave|audio\/x-wav|audio\/mpeg)$/i;

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
      .filter((entry) => entry.isFile() && PULSE_EXTENSIONS.test(entry.name))
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
    await fs.writeFile(path.join(this.directory, path.basename(file.filename)), file.buffer);
    return { status: 'success', message: 'pulse file uploaded.' };
  }

  /**
   * 指定されたプリセットファイルを削除します。
   * @param {string} preset 削除するプリセットファイル名。
   * @returns {Promise<{status:'success'|'error',message:string}>} 削除結果を表す API 応答。
   */
  async delete(preset) {
    const target = path.join(this.directory, path.basename(preset));
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
  return PULSE_EXTENSIONS.test(filename || '') && PULSE_MIME.test(mime || '');
}

export {
  PULSE_EXTENSIONS,
  PULSE_MIME,
  PulseStore,
  isSupportedPulse,
};
