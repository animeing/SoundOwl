import { SoundOwlRepository } from './soundOwlRepository.js';

/**
 * @deprecated 新規コードでは `SoundOwlRepository` を利用する。
 *
 * 旧名との互換 export。PHP contract 移行中の import を壊さないために残している。
 */
const SoundRepository = SoundOwlRepository;

export { SoundOwlRepository, SoundRepository };
