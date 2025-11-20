// server.js
const WebSocket = require('ws');
const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = {}; // roomId => { users: Set(ws), state: { videoId, time, playing } }

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);

      switch (data.type) {
        case 'join':
          const { roomId } = data;
          ws.roomId = roomId;
          if (!rooms[roomId]) rooms[roomId] = { users: new Set(), state: null };
          rooms[roomId].users.add(ws);

          // Send current room state to new user
          if (rooms[roomId].state) {
            ws.send(JSON.stringify({ type: 'sync', state: rooms[roomId].state }));
          }
          break;

        case 'state':
          // Broadcast state to all users in the room
          const room = rooms[ws.roomId];
          if (!room) return;
          room.state = data.state; // { videoId, time, playing }
          room.users.forEach(u => {
            if (u !== ws && u.readyState === WebSocket.OPEN) {
              u.send(JSON.stringify({ type: 'sync', state: data.state }));
            }
          });
          break;
      }
    } catch (e) {
      console.error(e);
    }
  });

  ws.on('close', () => {
    if (ws.roomId && rooms[ws.roomId]) {
      rooms[ws.roomId].users.delete(ws);
      if (rooms[ws.roomId].users.size === 0) delete rooms[ws.roomId];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
