const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');
const ytSearch = require('yt-search');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Store messages for anti-delete
const messageStore = new Map();

// AUTO REPLY LIST - You fit add more!
const autoReplies = {
  "hi": "Hello Boss! 👋 V8 dey active!",
  "hello": "Hello! How you dey? 😊",
  "bot": "Yes boss? V8 dey hear you!",
  "love you": "Love you too ❤️ V8 dey blush",
  "how are you": "I dey fine! Thanks to you wey deploy me ✅"
};

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['V8 Ultimate', 'Chrome', '1.0']
  });

  sock.ev.on('creds.update', saveCreds);

  // SAVE MESSAGE FOR ANTI-DELETE
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (let msg of messages) {
      if (!msg.key.fromMe) {
        const id = msg.key.id;
        messageStore.set(id, msg);
      }
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
      const lowerText = text.toLowerCase();
      const from = msg.key.remoteJid;

      if (!text || msg.key.fromMe) continue;

      // --- AUTO REPLY ---
      for (let key in autoReplies) {
        if (lowerText.includes(key)) {
          await sock.sendMessage(from, { text: autoReplies[key] });
          break;
        }
      }

      // --- COMMANDS ---
      if (text === '.ping') {
        await sock.sendMessage(from, { text: '🏓 Pong! V8 Active - 42ms' });
      }
      if (text === '.pause') {
        global.paused = true;
        await sock.sendMessage(from, { text: '⏸️ V8 Paused' });
      }
      if (text === '.resume') {
        global.paused = false;
        await sock.sendMessage(from, { text: '▶️ V8 Resumed! I dey back!' });
      }
      if (text === '.menu') {
        await sock.sendMessage(from, { text: `V8 MENU 🔥:
.ping - Check bot
.pause / .resume
.song <name> - Search songs
.menu - This menu
Anti-delete ✅ Active
Auto-reply ✅ Active` });
      }

      // --- SONG SEARCH ---
      if (text.startsWith('.song ')) {
        const query = text.replace('.song ', '');
        if (!query) return sock.sendMessage(from, { text: 'Type song name! Eg: .song Burna Boy Last Last' });
        await sock.sendMessage(from, { text: `🔍 Searching "${query}"...` });
        try {
          const r = await ytSearch(query);
          const video = r.videos[0];
          if (!video) return sock.sendMessage(from, { text: 'Song not found 😢' });
          
          await sock.sendMessage(from, {
            image: { url: video.thumbnail },
            caption: `🎵 *${video.title}*\n\n👤 ${video.author.name}\n⏱️ ${video.timestamp}\n👁️ ${video.views} views\n\n🔗 ${video.url}\n\n*Send .ytmp3 ${video.url} soon to download (coming)*`
          });
        } catch (e) {
          await sock.sendMessage(from, { text: 'Error searching song!' });
        }
      }
    }
  });

  // --- ANTI-DELETE LOGIC ---
  sock.ev.on('messages.update', async (updates) => {
    for (let update of updates) {
      if (update.update?.status === 4 || update.keyId) { // Deleted
        const id = update.keyId || update.key?.id;
        const oldMsg = messageStore.get(id);
        if (oldMsg) {
          const from = oldMsg.key.remoteJid;
          const sender = oldMsg.key.participant || from;
          const content = oldMsg.message?.conversation || oldMsg.message?.extendedTextMessage?.text || "Media message";
          
          await sock.sendMessage(from, {
            text: `🚨 *ANTI-DELETE* 🚨\n\n👤 @${sender.split('@')[0]} deleted:\n\n💬 ${content}\n\n_V8 caught am!_`,
            mentions: [sender]
          });
        }
      }
    }
  });

  // Keep for older Baileys versions
  sock.ev.on('messages.delete', async (item) => {
     // Some versions use this
     console.log("Delete detected", item);
  });

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
      startBot();
    }
  });
}

startBot();

// Web server
app.get('/', (req, res) => res.send('✅ V8 ULTIMATE LIVE - AntiDelete + AutoReply + Song Search Active!'));
app.get('/session', (req, res) => {
  try {
    const creds = fs.readFileSync('./auth/creds.json');
    res.send(Buffer.from(creds).toString('base64'));
  } catch { res.send('Bot not connected yet, scan QR first'); }
});

app.listen(PORT, () => console.log(`Server on ${PORT}`));
