const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');
const ytSearch = require('yt-search');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const messageStore = new Map();
global.paused = false;

const autoReplies = {
  "hi": "Hello Boss! 👋 V8 dey active!",
  "hello": "Hello! How you dey?",
  "bot": "Yes boss? V8 dey hear you!"
};

// --- RESTORE SESSION FROM ENV ---
if (process.env.SESSION_ID) {
  try {
    const authPath = './auth';
    if (!fs.existsSync(authPath)) fs.mkdirSync(authPath);
    const creds = Buffer.from(process.env.SESSION_ID, 'base64').toString();
    fs.writeFileSync(path.join(authPath, 'creds.json'), creds);
    console.log("✅ Session restored from ENV");
  } catch (e) {
    console.log("❌ Failed to restore session", e);
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    browser: ['V8 Ultimate', 'Chrome', '1.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    if (global.paused) return;
    for (let msg of messages) {
      if (!msg.message) continue;
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      if (!text || msg.key.fromMe) {
        // still store for anti-delete
        if (!msg.key.fromMe) messageStore.set(msg.key.id, msg);
        continue;
      }
      const from = msg.key.remoteJid;
      const lower = text.toLowerCase();
      
      // store
      messageStore.set(msg.key.id, msg);

      // auto reply
      for (let k in autoReplies) {
        if (lower.includes(k)) {
          await sock.sendMessage(from, { text: autoReplies[k] });
          break;
        }
      }

      if (text === '.ping') await sock.sendMessage(from, { text: '🏓 Pong! V8 Active' });
      if (text === '.pause') { global.paused = true; await sock.sendMessage(from, { text: '⏸️ Paused' }); }
      if (text === '.resume') { global.paused = false; await sock.sendMessage(from, { text: '▶️ Resumed! I dey back!' }); }
      if (text === '.menu') {
        await sock.sendMessage(from, { text: `V8 MENU 🔥:\n.ping\n.pause / .resume\n.song <name>\nAnti-delete ✅\nAuto-reply ✅` });
      }
      if (text.startsWith('.song ')) {
        const query = text.slice(6);
        await sock.sendMessage(from, { text: `🔍 Searching ${query}...` });
        try {
          const r = await ytSearch(query);
          const v = r.videos[0];
          if (!v) return sock.sendMessage(from, { text: 'Not found' });
          await sock.sendMessage(from, { image: { url: v.thumbnail }, caption: `🎵 ${v.title}\n${v.url}` });
        } catch {}
      }
    }
  });

  sock.ev.on('messages.update', async (updates) => {
    for (let u of updates) {
      if (u.update?.message === null) { // deleted for everyone
        const old = messageStore.get(u.key.id);
        if (old) {
          const from = old.key.remoteJid;
          const txt = old.message.conversation || old.message.extendedTextMessage?.text || "Media";
          await sock.sendMessage(from, { text: `🚨 *ANTI-DELETE* 🚨\nDeleted: ${txt}` });
        }
      }
    }
  });

  sock.ev.on('connection.update', (u) => {
    if (u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
  });
}

startBot();

app.get('/', (req, res) => res.send('✅ V8 ULTIMATE LIVE'));
app.get('/session', (req, res) => {
  try {
    const creds = fs.readFileSync('./auth/creds.json');
    res.send(Buffer.from(creds).toString('base64'));
  } catch { res.send('Not connected yet'); }
});
app.listen(PORT);
