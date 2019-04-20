const WebSocket = require('ws');

const ws = new WebSocket.Server({ port: process.env.PORT });

ws.on('connection', (conn) => {
  conn.on('message', (data) => {
    ws.clients.forEach((client) => {
      if (client !== conn && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });
});
