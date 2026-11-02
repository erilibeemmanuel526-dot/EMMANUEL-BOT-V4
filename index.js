const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('EMMANUEL-BOT-V4 IS LIVE!');
}).listen(process.env.PORT || 10000, () => {
  console.log('Server listening on port 10000');
});

console.log('Starting EMMANUEL-BOT-V4...');

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');

const PHONE_NUMBER = '2349137142411';

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['EMMANUEL-BOT-V4', 'Chrome', '1.0']
  });

  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(PHONE_NUMBER);
        console.log('\n\n========================================');
        console.log(`🔑 YOUR PAIRING CODE FOR ${PHONE_NUMBER}: ${code}`);
        console.log('========================================');
        console.log('Go to WhatsApp > Settings > Linked Devices');
        console.log('> Link a Device > Link with phone number');
        console.log(`> Enter this code: ${code}`);
        console.log('========================================\n\n');
      } catch (e) {
        console.log('Failed to get pairing code:', e.message);
      }
    }, 5000);
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed, reconnecting:', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ BOT CONNECTED SUCCESSFULLY! - EMMANUEL-BOT-V4 LIVE!');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message) return;
    const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
    if (text.toLowerCase() === 'hi') {
      await sock.sendMessage(m.key.remoteJid, { text: 'Hello! Emmanuel Bot V4 is live! 🚀' });
    }
  });
}

startBot();
