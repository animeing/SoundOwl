const fs = require('node:fs/promises');
const path = require('node:path');

const PULSE_EXTENSIONS = /\.(wav|mp3)$/i;
const PULSE_MIME = /^(audio\/wav|audio\/wave|audio\/x-wav|audio\/mpeg)$/i;

/**
 * audio_pulseディレクトリを扱うstore。
 */
class PulseStore {
  /**
   * @param {string} directory audio_pulseディレクトリ。
   */
  constructor(directory) {
    this.directory = directory;
  }

  /**
   * wav/mp3のpulse file basenameを列挙する。
   *
   * @returns {Promise<string[]>} 対応ファイル名配列。
   */
  async list() {
    await fs.mkdir(this.directory, { recursive: true });
    const entries = await fs.readdir(this.directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && PULSE_EXTENSIONS.test(entry.name))
      .map((entry) => entry.name);
  }

  /**
   * pulse fileを保存する。
   *
   * @param {{filename:string,mime:string,buffer:Buffer}} file multipartから取り出したfile。
   * @returns {Promise<{status:'success'|'error',message:string}>} 保存結果。
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
   * pulse fileを削除する。
   *
   * @param {string} preset 削除対象ファイル名。
   * @returns {Promise<{status:'success'|'error',message:string}>} 削除結果。
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
 * pulse fileとして受け入れ可能か判定する。
 *
 * @param {string} filename ファイル名。
 * @param {string} mime MIME。
 * @returns {boolean} wav/mp3として許可する場合true。
 */
function isSupportedPulse(filename, mime) {
  return PULSE_EXTENSIONS.test(filename || '') && PULSE_MIME.test(mime || '');
}

module.exports = {
  PULSE_EXTENSIONS,
  PULSE_MIME,
  PulseStore,
  isSupportedPulse,
};
