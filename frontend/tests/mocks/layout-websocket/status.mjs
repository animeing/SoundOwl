// 本番WebSocketと同じ形で、レイアウト検証用の固定状態を返す。
const LAYOUT_WEBSOCKET_STATUS = Object.freeze({
  time: 0,
  context: Object.freeze({
    regist_status: false,
    regist_status_step1: false,
    regist_status_step2: false,
    regist_data_count: Object.freeze({
      sound: 8,
      artist: 4,
      album: 3,
      analysis_sound: 6,
    }),
    websocket: Object.freeze({
      retry_count: 2,
      retry_interval: 2500,
    }),
  }),
});

export { LAYOUT_WEBSOCKET_STATUS };
