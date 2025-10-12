import { readFileSync } from 'fs';
import path from 'path';
import ini from 'ini';

export function loadWebsocketSettings(rootDir) {
  const iniPath = path.join(rootDir, 'parts', 'setting.ini');

  try {
    const parsed = ini.parse(readFileSync(iniPath, 'utf8'));
    return {
      retryCount: parseInt(parsed.websocket_retry_count || 0, 10),
      retryInterval: parseInt(parsed.websocket_retry_interval || 10000, 10),
    };
  } catch (err) {
    console.warn('Could not read setting.ini:', err.message);
    return { retryCount: 0, retryInterval: 10000 };
  }
}
