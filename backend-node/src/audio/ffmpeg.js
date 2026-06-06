import { execFile } from 'node:child_process';

/**
 * ffmpeg の volumedetect を実行し、音声ファイルの平均音量と最大音量を解析します。
 * @param {string} filePath 解析対象の音声ファイルパス。
 * @param {{execFileImpl?: typeof import('node:child_process').execFile}} [options] ffmpeg 実行関数を差し替えるためのオプション。通常は node:child_process の execFile を使います。
 * @param {typeof import('node:child_process').execFile} [options.execFileImpl] テスト時に注入する ffmpeg 実行関数。
 * @returns {Promise<{mean_volume:number|null,max_volume:number|null,raw:string}>} mean_volume は平均音量 dB、max_volume は最大音量 dB、raw は ffmpeg の stdout/stderr 全文です。値を抽出できない項目は null になります。
 */
function analyzeLoudness(filePath, { execFileImpl = execFile } = {}) {
  return new Promise((resolve, reject) => {
    execFileImpl('ffmpeg', ['-i', filePath, '-filter:a', 'volumedetect', '-f', 'null', '-'], (error, stdout, stderr) => {
      const output = `${stdout || ''}\n${stderr || ''}`;
      const mean = output.match(/mean_volume:\s+([-\d.]+)\s+dB/);
      const max = output.match(/max_volume:\s+([-\d.]+)\s+dB/);
      if (error && !mean) {
        reject(new Error(output.trim() || error.message));
        return;
      }
      resolve({
        mean_volume: mean ? Number(mean[1]) : null,
        max_volume: max ? Number(max[1]) : null,
        raw: output,
      });
    });
  });
}

/**
 * ffprobe を実行し、音声ファイルの format と stream 情報を JSON として取得します。
 * @param {string} filePath メタデータを取得する音声ファイルパス。
 * @param {{execFileImpl?: typeof import('node:child_process').execFile}} [options] ffprobe 実行関数を差し替えるためのオプション。
 * @param {typeof import('node:child_process').execFile} [options.execFileImpl] テスト時に注入する ffprobe 実行関数。
 * @returns {Promise<Record<string, unknown>>} ffprobe の JSON 出力を parse したオブジェクト。
 */
function probeMetadata(filePath, { execFileImpl = execFile } = {}) {
  return new Promise((resolve, reject) => {
    execFileImpl(
      'ffprobe',
      ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath],
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        try {
          resolve(JSON.parse(stdout || '{}'));
        } catch (parseError) {
          reject(parseError);
        }
      },
    );
  });
}

export {
  analyzeLoudness,
  probeMetadata,
};
