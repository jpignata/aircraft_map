const WebSocket = require('ws');
const fetch = require('node-fetch');

const ws = new WebSocket(process.env.DEST);

ws.on('open', () => {
  const poll = async function() {
    try {
      const resp = await fetch(process.env.SRC);
      const body = await resp.text();

      ws.send(body);
    } catch (error) {
      console.log(error);
    }
  }

  setInterval(poll, 500);
});
