import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { BASE } from '../utilization/path';
import { BaseFrameWork } from '../base';

let cacheList = new BaseFrameWork.LimitedList(7);

class CacheStruct{
  constructor(url, convert, objectUrl) {
    this.url = url;
    this.convert = convert;
    this.objectUrl = objectUrl;
  }
}

let ffmpegInitializationPromise;

/**
 * 変換が必要になった時だけFFmpegを読み込む。同時呼び出しは同じ初期化を待ち、
 * 失敗時はworkerを破棄して次回の再生操作で再試行できるようにする。
 * @returns {Promise<FFmpeg>}
 */
export function initializeFFmpeg() {
  if (ffmpegInitializationPromise) {
    return ffmpegInitializationPromise;
  }

  const ffmpeg = new FFmpeg();
  ffmpegInitializationPromise = (async () => {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${BASE.FRONT_HOME}js/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${BASE.FRONT_HOME}js/ffmpeg-core.wasm`, 'application/wasm')
    });
    cacheList.addEventListener('delete', data => {
      void ffmpeg.deleteFile(data.detail.value.convert).catch(error => console.error('FFmpeg cache cleanup failed', error));
      URL.revokeObjectURL(data.detail.value.objectUrl);
    });
    return ffmpeg;
  })().catch(error => {
    ffmpeg.terminate();
    ffmpegInitializationPromise = undefined;
    throw error;
  });
  return ffmpegInitializationPromise;
}

/**
 * 
 * @param {string} url 
 * @returns {CacheStruct}
 */
function findConvertedCacheData(url) {
  for (const cache of cacheList) {
    if(cache.url == url) {
      return cache;
    }
  }
  return false;
}

/**
 * ファイルをWAVに変換してObjectURLを返します。
 * @param {string} url 
 * @returns {string}
 */
export async function conversionToWav(url) {
  let cache = findConvertedCacheData(url);
  if(cache !== false) {
    return cache.objectUrl;
  }
  let urlFile = await fetchFile(url);
  const ffmpeg = await initializeFFmpeg();
  let filename = url.split('/').pop();
  await ffmpeg.writeFile(filename, urlFile);
  let convertFileName = filename+'.wav';
  await ffmpeg.exec(['-i', filename, convertFileName]);
  const data = await ffmpeg.readFile(convertFileName);
  ffmpeg.deleteFile(filename);
  let objectUrl = URL.createObjectURL(new Blob([data.buffer], { type: 'audio/wav' }));
  cacheList.add(new CacheStruct(url, convertFileName, objectUrl));
  return objectUrl;
}
