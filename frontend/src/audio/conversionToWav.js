import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { fetchFile } from '@ffmpeg/util';
import { BASE } from '../utilization/path';
import { BaseFrameWork } from '../base';

let cacheList = new BaseFrameWork.LimitedList(7);

class CacheStruct{
  constructor(url, convert) {
    this.url = url;
    this.convert = convert;
  }
}

let isLoaded = false;
const ffmpeg = new FFmpeg();
export async function ffmpegInitalize() {
  await ffmpeg.load({
    coreURL: await toBlobURL(`${BASE.HOME+'js'}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${BASE.HOME+'js'}/ffmpeg-core.wasm`, 'application/wasm')
  });
  isLoaded = true;

  cacheList.addEventListener('delete',data=>{
    ffmpeg.deleteFile(data.detail.value);
  });
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
    const data = await ffmpeg.readFile(cache.convert);
    return URL.createObjectURL(new Blob([data.buffer], {type:'audio/wav'}));
  }
  let urlFile = await fetchFile(url);
  await BaseFrameWork.waitForValue(()=>isLoaded, true, 50000);
  let filename = url.split('/').pop();
  await ffmpeg.writeFile(filename, urlFile);
  let convertFileName = filename+'.wav';
  await ffmpeg.exec(['-i', filename, convertFileName]);
  const data = await ffmpeg.readFile(convertFileName);
  cacheList.add(new CacheStruct(url, convertFileName));
  ffmpeg.deleteFile(filename);
  return URL.createObjectURL(new Blob([data.buffer], { type: 'audio/wav' }));
}
