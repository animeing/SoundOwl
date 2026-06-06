import { WebSocketServer } from 'ws';

/**
 * WebSocket で状態通知を配信するサーバを作成します。
 * 接続直後に現在状態を送り、以後は interval または受信メッセージを契機に全 client へ配信します。
 * @param {{statusProvider:()=>Promise<Record<string, any>>,intervalMs?:number,WebSocketServerImpl?:typeof WebSocketServer,clock?:()=>number,setIntervalImpl?:(callback:()=>void,delayMs:number)=>any,clearIntervalImpl?:(timer:any)=>void,server?:import('node:http').Server,port?:number,host?:string}} options 状態取得関数、待受設定、テスト差し替え用の WebSocket/timer 実装。
 * @returns {{server:any,formatPayload:(context:Record<string, any>)=>string,broadcastStatus:(message?:any)=>Promise<string>,start:()=>void,stop:()=>Promise<void>}} WebSocket サーバと制御関数。
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
    /** @returns {void} 定期配信 timer を開始します。すでに開始済みの場合は何もしません。 */
    start() {
      if (!timer) {
        timer = setIntervalImpl(() => {
          broadcastStatus().catch(() => {});
        }, intervalMs);
      }
    },
    /** @returns {Promise<void>} 定期配信 timer を止め、WebSocket server を close します。 */
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
