import { MessageButtonWindow } from '../../base';

/**
 * 登録完了を通知し、失敗ファイルがあれば件数・対象・処理段階も表示する。
 * @param {{failedCount?:number,failures?:Array<{target:string,reason:string}>}|null|undefined} response 登録 API の応答。
 * @returns {void} 完了または部分失敗の通知を表示する。
 */
export function showSoundRegistrationResult(response) {
  const failedCount = Number(response?.failedCount) || 0;
  const failures = Array.isArray(response?.failures) ? response.failures : [];
  const notification = new MessageButtonWindow();
  notification.value = failedCount > 0
    ? `Sound registration finished with ${failedCount} incomplete file(s).`
    : 'Sound Registed.';
  let failureList;
  if (failedCount > 0) {
    // HTTP 200 でも一部のファイルが失敗し得る。成功通知には失敗一覧を付けない。
    notification.setAttribute('role', 'alert');
    notification.classList.add('sound-registration-failure-list');
    failureList = document.createElement('ul');
    failureList.setAttribute('aria-label', 'Incomplete files');
    failureList.tabIndex = 0;
    for (const { target, reason } of failures) {
      const failureItem = document.createElement('li');
      failureItem.textContent = `${target}: ${reason}`;
      failureList.appendChild(failureItem);
    }
  }
  notification.addItem('Close', () => notification.close());
  notification.open();
  if (failureList) {
    // 共通通知の親要素は load 時まで未接続の場合があるため、接続後に本文とボタンの間へ配置する。
    const attachFailureList = () => {
      notification.insertBefore(failureList, notification.buttonFrame);
      if (failureList.scrollHeight > failureList.clientHeight) {
        const scrollHint = document.createElement('p');
        scrollHint.className = 'sound-registration-scroll-hint';
        scrollHint.textContent = 'Scroll the list to view all incomplete files.';
        notification.insertBefore(scrollHint, failureList);
      }
    };
    if (notification.isConnected) attachFailureList();
    else window.addEventListener('load', attachFailureList, { once: true });
  }
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
