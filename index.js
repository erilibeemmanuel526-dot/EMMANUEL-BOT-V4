const express = require('express');
const QRCode = require('qrcode');
const app = express();
let qrDataUrl = null;

app.get('/', async (req, res) => {
  if(qrDataUrl) res.send(`<h2>SCAN THIS QR</h2><img src="${qrDataUrl}" width="350"/><p>Open WhatsApp > Linked Devices > Link a device > Scan<br>Refresh every 30s</p><script>setTimeout(()=>location.reload(),30000)</script>`);
  else res.send('<h2>Waiting for QR...</h2><p>Refresh in 10 seconds</p><script>setTimeout(()=>location.reload(),10000)</script>');
});

app.get('/qr', (req,res) => res.redirect('/'));

app.listen(10000, () => console.log('WEB READY'));

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');

async function bot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({ auth: state, logger: P({level:'silent'}), printQRInTerminal: true, browser: ['EMMANUEL','Chrome','1.0'] });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u) => {
    const { qr, connection } = u;
    if(qr) { qrDataUrl = await QRCode.toDataURL(qr); console.log('QR READY - Go to website'); }
    if(connection === 'open') { console.log('CONNECTED SUCCESS!'); qrDataUrl = null; }
    if(connection === 'close') { console.log('Closed, restarting...'); setTimeout(bot, 5000); }
  });
}
bot();
