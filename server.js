// server.js
const WebSocket = require('ws');
const port = process.env.PORT || 3000;

const wss = new WebSocket.Server({ port });

const rooms = {}; // roomId -> Set of clients

wss.on('connection', ws => {
  ws.on('message', msg => {
    let data;
    try { data = JSON.parse(msg); } catch(e) { return; }

    const { type, roomId, payload } = data;

    if (type === 'join') {
      ws.roomId = roomId;
      if (!rooms[roomId]) rooms[roomId] = new Set();
      rooms[roomId].add(ws);
      console.log(`User joined room: ${roomId}`);
    }

    if (type === 'signal') {
      // Relay signaling data to all other clients in the room
      const clients = rooms[ws.roomId];
      if (!clients) return;
      clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'signal', payload }));
        }
      });
    }
  });

  ws.on('close', () => {
    if (ws.roomId && rooms[ws.roomId]) {
      rooms[ws.roomId].delete(ws);
      if (rooms[ws.roomId].size === 0) delete rooms[ws.roomId];
    }
  });
});

console.log(`WebRTC signaling server running on port ${port}`);
