import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { fetchFile } from '@ffmpeg/util';
import { BASE } from '../utilization/path';
import { BaseFrameWork } from '../base';


let isLoaded = false;
const ffmpeg = new FFmpeg();
export async function ffmpegInitalize() {
  await ffmpeg.load({
    coreURL: await toBlobURL(`${BASE.HOME+'js'}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${BASE.HOME+'js'}/ffmpeg-core.wasm`, 'application/wasm')
  });
  isLoaded = true;
}


/**
 * ファイルをWAVに変換してObjectURLを返します。
 * @param {string} url 
 * @returns {string}
 */
export async function conversionToWav(url) {
  let urlFile = await fetchFile(url);
  await BaseFrameWork.waitForValue(()=>isLoaded, true, 50000);
  let filename = url.split('/').pop();
  await ffmpeg.writeFile(filename, urlFile);
  await ffmpeg.exec(['-i', filename, 'convertWav.wav']);
  const data = await ffmpeg.readFile('convertWav.wav');
  ffmpeg.deleteFile(filename);
  return URL.createObjectURL(new Blob([data.buffer], { type: 'audio/wav' }));
}
