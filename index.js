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
const readline = require('readline');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['EMMANUEL-BOT-V4', 'Chrome', '1.0']
  });

  // Handle QR / Pairing Code
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log('\n\n=== QR CODE GENERATED ===');
      console.log(qr);
      console.log('Copy this QR string and convert to image, OR use pairing code below\n');
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed, reconnecting:', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ BOT CONNECTED SUCCESSFULLY!');
    }
  });

  // Ask for pairing code after 3 seconds
  setTimeout(async () => {
    if (!sock.authState.creds.registered) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question('Enter your WhatsApp number with country code (e.g 2348012345678): ', async (number) => {
        const code = await sock.requestPairingCode(number.trim());
        console.log(`\n🔑 YOUR PAIRING CODE: ${code}`);
        console.log(`Go to WhatsApp > Linked Devices > Link with phone number > Enter code: ${code}\n`);
        rl.close();
      });
    }
  }, 5000);

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
