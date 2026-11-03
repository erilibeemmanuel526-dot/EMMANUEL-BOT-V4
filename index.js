const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

if (process.env.SESSION_ID) {
  try {
    if (!fs.existsSync('./auth')) fs.mkdirSync('./auth');
    fs.writeFileSync('./auth/creds.json', Buffer.from(process.env.SESSION_ID, 'base64').toString());
    console.log("Session OK");
  } catch(e){ console.log(e); }
}

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({ auth: state, logger: P({level:'silent'}), browser:['Emmanuel Bot','Chrome','1.0'] });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({messages})=>{
    for(let m of messages){
      if(!m.message) continue;
      const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
      if(!text) continue;
      const from = m.key.remoteJid;
      const low = text.toLowerCase().trim();
      console.log("Got:", low);

      if(low === 'hii' || low === 'hi' || low === 'hello'){
        await sock.sendMessage(from, {text: "✅ AUTO-REPLY WORKING! Hello, V8 don reply you! 🔥"});
      }
      if(low === '.ping'){
        await sock.sendMessage(from, {text: "🏓 Pong! NEW CODE LIVE! Deploy don work!"});
      }
      if(low === '.menu'){
        await sock.sendMessage(from, {text: "🔥 NEW MENU 🔥\n.ping\nHii/Hi/Hello auto reply\nBot dey work now!"});
      }
    }
  });

  sock.ev.on('connection.update', (u)=>{
    if(u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
  });
}

startBot();
app.get('/', (req,res)=>res.send('BOT LIVE V3'));
app.listen(PORT, ()=>console.log("Server on "+PORT));
