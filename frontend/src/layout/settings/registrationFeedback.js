import { MessageButtonWindow } from '../../base';

/**
 * 登録結果を短く通知し、失敗ファイルの詳細は操作したときだけ表示する。
 * @param {{failedCount?:number,failures?:Array<{target:string,reason:string}>,historyUnavailable?:boolean}|null|undefined} response 登録 API の応答。
 * @returns {void} 完了または部分失敗の通知を表示する。
 */
export function showSoundRegistrationResult(response) {
  const failedCount = Number(response?.failedCount) || 0;
  const failures = Array.isArray(response?.failures) ? response.failures : [];
  const historyUnavailable = response?.historyUnavailable === true;
  const notification = new MessageButtonWindow();
  const resultText = failedCount > 0
    ? `Sound registration finished with ${failedCount} incomplete ${failedCount === 1 ? 'file' : 'files'}.`
    : 'Sound Registed.';
  notification.value = historyUnavailable
    ? `${failedCount > 0 ? resultText : 'Sound registration finished.'} Failure history could not be saved; keep this result and retry later.`
    : resultText;
  if (failedCount > 0 || historyUnavailable) {
    // HTTP 200 でも一部のファイル失敗や履歴保存失敗があり得る。
    notification.setAttribute('role', 'alert');
  }
  if (failedCount > 0) {
    notification.classList.add('sound-registration-summary');
    notification.addItem('Details', () => showSoundRegistrationFailures(failures, failedCount));
  }
  notification.addItem('Close', () => notification.close());
  notification.open();
}

/**
 * 部分失敗の対象と公開用の理由を、利用者が要求したときに詳細ダイアログへ表示する。
 * @param {Array<{target:string,reason:string}>} failures 今回の登録で完了しなかったファイル。
 * @param {number} failedCount 登録 API が返した失敗件数。
 * @returns {void} 閉じるまで表示する詳細ダイアログを開く。
 */
function showSoundRegistrationFailures(failures, failedCount) {
  const dialog = document.createElement('dialog');
  dialog.className = 'sound-registration-details';
  dialog.setAttribute('aria-label', 'Incomplete sound files');

  const heading = document.createElement('h2');
  heading.textContent = 'Incomplete sound files';
  const count = document.createElement('p');
  count.textContent = `${failedCount} ${failedCount === 1 ? 'file needs' : 'files need'} attention.`;
  dialog.append(heading, count);

  let failureList;
  if (failures.length > 0) {
    failureList = document.createElement('ol');
    failureList.tabIndex = 0;
    for (const { target, reason } of failures) {
      const failureItem = document.createElement('li');
      const path = document.createElement('code');
      path.textContent = target;
      const explanation = document.createElement('span');
      explanation.textContent = reason;
      failureItem.append(path, explanation);
      failureList.appendChild(failureItem);
    }
    dialog.appendChild(failureList);
  } else {
    const missingDetails = document.createElement('p');
    missingDetails.textContent = 'The server did not provide file details.';
    dialog.appendChild(missingDetails);
  }

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = 'Close';
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.appendChild(closeButton);
  document.body.appendChild(dialog);
  dialog.showModal();
  if (failureList && failureList.scrollHeight > failureList.clientHeight) {
    const scrollHint = document.createElement('p');
    scrollHint.className = 'sound-registration-scroll-hint';
    scrollHint.textContent = 'Scroll to see all incomplete files.';
    dialog.insertBefore(scrollHint, failureList);
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
