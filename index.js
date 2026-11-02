const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const app = express();
let qrDataUrl = null;
let isConnected = false;

// WEB SERVER FOR QR
app.get('/', async (req, res) => {
  if(isConnected){
    res.send('<h1>✅ EMMANUEL-BOT-V4 IS ACTIVE!</h1><p>Bot is online and working.</p><p>Device: Google Chrome (EMMANUEL)</p>');
  } else if(qrDataUrl){
    res.send(`<h2>SCAN THIS QR - EMMANUEL BOT V4</h2><img src="${qrDataUrl}" width="350"/><p>WhatsApp > Linked Devices > Link a device</p><p>Refresh every 30s</p><script>setTimeout(()=>location.reload(),30000)</script>`);
  } else {
    res.send('<h2>Starting Bot...</h2><p>Waiting for QR... Refresh in 5 sec</p><script>setTimeout(()=>location.reload(),5000)</script>');
  }
});
app.listen(10000, () => console.log('WEB READY ON 10000'));

// WHATSAPP BOT
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({ 
    auth: state, 
    logger: P({level:'silent'}), 
    printQRInTerminal: false,
    browser: ['EMMANUEL','Chrome','1.0'],
    markOnlineOnConnect: true
  });

  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('connection.update', async (u) => {
    const { qr, connection, lastDisconnect } = u;
    if(qr){
      qrDataUrl = await QRCode.toDataURL(qr);
      console.log('QR READY - Go to website https://emmanuel-bot-v4.onrender.com');
      isConnected = false;
    }
    if(connection === 'open'){
      console.log('CONNECTED SUCCESS! EMMANUEL-BOT-V4 ACTIVE!');
      qrDataUrl = null;
      isConnected = true;
    }
    if(connection === 'close'){
      isConnected = false;
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed, reconnecting:', shouldReconnect);
      if(shouldReconnect) setTimeout(startBot, 5000);
      else console.log('Logged out, need new QR');
    }
  });

  // COMMANDS
  sock.ev.on('messages.upsert', async (m) => {
    try{
      const msg = m.messages[0];
      if(!msg.message || msg.key.fromMe) return;
      const from = msg.key.remoteJid;
      const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';
      const prefix = '.';
      if(!body.startsWith(prefix)) return;
      const args = body.slice(1).trim().split(/ +/);
      const command = args.shift().toLowerCase();

      if(command === 'ping'){
        await sock.sendMessage(from, {text: '🏓 Pong! *EMMANUEL-BOT-V4* is Active ⚡\nSpeed: Fast'});
      }
      else if(command === 'menu' || command === 'help'){
        await sock.sendMessage(from, {text: `*🤖 EMMANUEL-BOT-V4 MENU 🤖*

*MAIN*
.ping - Check bot speed
.alive - Check bot alive
.menu - This menu

*MORE COMING SOON...*
Bot by Emmanuel
Active ✅`});
      }
      else if(command === 'alive'){
        await sock.sendMessage(from, {text: '*EMMANUEL-BOT-V4 is ALIVE and ACTIVE!* ✅🔥\n\nLinked Device: Google Chrome (EMMANUEL)\nStatus: Active\n\nDeployed on Render'});
      }
    }catch(e){ console.log('Msg error', e)}
  });
}

startBot();
