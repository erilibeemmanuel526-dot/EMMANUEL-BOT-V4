// Fix for Render port binding - EMMANUEL-BOT-V4
const http = require('http');
http.createServer((req, res) => {
  res.end('EMMANUEL-BOT-V4 is LIVE!');
}).listen(process.env.PORT || 3000);

console.log('Starting EMMANUEL-BOT-V4...');

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ EMMANUEL-BOT-V4 Connected!');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    const from = msg.key.remoteJid;
    if (text.toLowerCase() === 'hi') {
      await sock.sendMessage(from, { text: 'Hello! 👋 EMMANUEL-BOT-V4 is LIVE! 🚀' });
    }
  });
}

startBot();
