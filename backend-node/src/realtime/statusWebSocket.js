import { WebSocketServer } from 'ws';

/**
 * @typedef {Object} StatusWebSocketOptions
 * @property {() => Promise<Object>|Object} statusProvider 現在の登録/解析statusを返す関数。
 * @property {number} [intervalMs=5000] PHP WebSocket serverと同じ定期配信間隔ms。
 * @property {typeof WebSocketServer} [WebSocketServerImpl] テストで差し替えるWebSocketServer実装。
 * @property {() => number} [clock=Date.now] message header用の現在時刻msを返す関数。
 * @property {Function} [setIntervalImpl=setInterval] 定期配信用timer関数。
 * @property {Function} [clearIntervalImpl=clearInterval] timer停止関数。
 */

/**
 * PHPの`api/sw/server.php`相当のWebSocket broadcasterを作成する。
 *
 * 接続直後と定期timerで`{time, context}`形式のstatusを送信し、clientからmessageを受けた場合は
 * PHPと同じくstatusへ`message`を追加して全clientへbroadcastする。
 *
 * @param {StatusWebSocketOptions & ({server: import('node:http').Server}|{port:number, host?:string})} options WebSocket server設定。
 * @returns {{server:Object,start:()=>void,stop:()=>Promise<void>,broadcastStatus:(message?:unknown)=>Promise<string>,formatPayload:(context:Object)=>string}} WebSocket runtime。
 */
function createStatusWebSocket(options) {
  const {
    statusProvider,
    intervalMs = 5000,
    WebSocketServerImpl = WebSocketServer,
    clock = Date.now,
    setIntervalImpl = setInterval,
    clearIntervalImpl = clearInterval,
  } = options;
  const server = new WebSocketServerImpl(options.server ? { server: options.server } : { port: options.port, host: options.host });
  let timer = null;

  const formatPayload = (context) => JSON.stringify({ time: clock(), context });

  const broadcastStatus = async (message) => {
    const context = await statusProvider();
    if (message !== undefined) {
      context.message = message;
    }
    const payload = formatPayload(context);
    for (const client of server.clients || []) {
      if (client.readyState === 1 || client.readyState === undefined) {
        client.send(payload);
      }
    }
    return payload;
  };

  server.on('connection', async (connection) => {
    connection.send(formatPayload(await statusProvider()));
    connection.on('message', async (message) => {
      const text = Buffer.isBuffer(message) ? message.toString('utf8') : String(message);
      let parsed = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
      await broadcastStatus(parsed);
    });
  });

  return {
    server,
    formatPayload,
    broadcastStatus,
    start() {
      if (!timer) {
        timer = setIntervalImpl(() => {
          broadcastStatus().catch(() => {});
        }, intervalMs);
      }
    },
    stop() {
      if (timer) {
        clearIntervalImpl(timer);
        timer = null;
      }
      return new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

export { createStatusWebSocket };
