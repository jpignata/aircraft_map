const WebSocket = require('ws');
const fetch = require('node-fetch');

const ws = new WebSocket(`ws://${process.env.DEST}`);
const endpoint = `http://${process.env.SRC}/data.json`;

ws.on('open', () => {
  const poll = async function() {
    const resp = await fetch(endpoint);
    const body = await resp.text();

    ws.send(body);
  }

	setInterval(poll, 200);
});
