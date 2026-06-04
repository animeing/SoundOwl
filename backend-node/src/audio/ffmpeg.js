import { execFile } from 'node:child_process';

/**
 * @typedef {Object} LoudnessAnalysis
 * @property {number|null} mean_volume ffmpeg volumedetectの平均音量dB。解析できない場合はnull。
 * @property {number|null} max_volume ffmpeg volumedetectの最大音量dB。解析できない場合はnull。
 * @property {string} raw ffmpeg stdout/stderrの生出力。診断用。
 */

/**
 * ffmpeg `volumedetect`で音源の音量を解析する。
 *
 * @param {string} filePath 解析対象音源ファイルパス。
 * @param {{execFileImpl?:Function}} [options] テスト時に差し替えるexecFile実装。
 * @returns {Promise<LoudnessAnalysis>} mean/max volumeを含む解析結果。
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
 * ffprobeで音源メタデータをJSONとして取得する。
 *
 * @param {string} filePath 解析対象音源ファイルパス。
 * @param {{execFileImpl?:Function}} [options] テスト時に差し替えるexecFile実装。
 * @returns {Promise<Object>} ffprobeの`-show_format -show_streams` JSON。
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
