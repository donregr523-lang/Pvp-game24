const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const MAX_IN_ROOM = 8;
const wss = new WebSocketServer({ port: PORT });
const rooms = {};

function send(ws, obj) { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); }

wss.on('connection', ws => {
  ws.room = null;
  ws.id = null;

  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }

    if (m.type === 'join') {
      if (ws.room) return;
      const room = String(m.room || '').slice(0, 12);
      if (!room) return;
      rooms[room] ||= new Set();
      if (rooms[room].size >= MAX_IN_ROOM) { send(ws, { type: 'full' }); return; }
      ws.room = room;
      ws.id = Math.random().toString(36).slice(2, 8);
      rooms[room].add(ws);
      send(ws, { type: 'joined', id: ws.id });
      return;
    }

    if (!ws.room) return;
    for (const other of rooms[ws.room]) {
      if (other !== ws) send(other, { ...m, from: ws.id });
    }
  });

  ws.on('close', () => {
    if (!ws.room || !rooms[ws.room]) return;
    rooms[ws.room].delete(ws);
    for (const other of rooms[ws.room]) send(other, { type: 'left', from: ws.id });
    if (rooms[ws.room].size === 0) delete rooms[ws.room];
  });
});

console.log('Сервер запущен на порту', PORT);
