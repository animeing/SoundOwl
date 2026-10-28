import { MessageButtonWindow } from '../../base';

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