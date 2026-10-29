import { MessageButtonWindow } from '../../base';

/**
 * 登録結果に失敗ファイルが含まれるとき、件数・対象・処理段階を表示する。
 * @param {{failedCount?:number,failures?:Array<{target:string,reason:string}>}|null|undefined} response 登録 API の応答。
 * @returns {void} 完了または部分失敗の通知を表示する。
 */
export function showSoundRegistrationResult(response) {
  const failedCount = Number(response?.failedCount) || 0;
  const failures = Array.isArray(response?.failures) ? response.failures : [];
  const notification = new MessageButtonWindow();
  notification.value = failedCount > 0
    ? `Sound registration finished with ${failedCount} incomplete file(s).\n${failures.map(({ target, reason }) => `${target}: ${reason}`).join('\n')}`
    : 'Sound Registed.';
  if (failedCount > 0) {
    notification.setAttribute('role', 'alert');
    notification.classList.add('sound-registration-failures');
  }
  notification.addItem('Close', () => notification.close());
  notification.open();
}

/**
 * 音源登録 API の失敗を設定画面で読めるメッセージとして表示する。
 * 公開用 detail がない予期しない失敗では内部エラーをそのまま出さない。
 * @param {{detail?:string}|null|undefined} response API のエラー応答。
 * @returns {void} 確認ボタン付きの通知を表示する。
 */
export function showSoundRegistrationError(response) {
  const detail = response?.detail;
  const message = typeof detail === 'string' && detail.trim()
    ? detail
    : 'Could not register sounds. Check the Sound Directory and try again.';
  const notification = new MessageButtonWindow();
  notification.value = message;
  notification.addItem('Close', () => notification.close());
  notification.open();
}
