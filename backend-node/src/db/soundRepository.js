const { SoundOwlRepository } = require('./soundOwlRepository');

/**
 * @deprecated Use `SoundOwlRepository`.
 *
 * 旧名との互換export。PHP contract移行中のimportを壊さないために残している。
 */
module.exports = {
  SoundOwlRepository,
  SoundRepository: SoundOwlRepository,
};
