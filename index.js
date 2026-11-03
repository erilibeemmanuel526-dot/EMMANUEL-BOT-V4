const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 10000;

if (process.env.SESSION_ID) {
  try {
    if (!fs.existsSync('./auth')) fs.mkdirSync('./auth');
    fs.writeFileSync('./auth/creds.json', Buffer.from(process.env.SESSION_ID,'base64').toString());
    console.log("✅ Session OK");
  } catch(e){console.log(e)}
}

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({ auth: state, logger: P({level:'silent'}), browser:['V8 Ultimate','Chrome','1.0.0'] });
  sock.ev.on('creds.update', saveCreds);
  
  console.log("Bot starting...");

  sock.ev.on('messages.upsert', async (mUp)=>{
    console.log("EVENT FIRED! Message received!");
    const messages = mUp.messages;
    for(const msg of messages){
      if(!msg.message) continue;
      const from = msg.key.remoteJid;
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "no text";
      console.log(`From: ${from} Text: ${text} fromMe:${msg.key.fromMe}`);
      
      try{
        // FORCE REPLY TO EVERY MESSAGE FOR TEST!
        await sock.sendMessage(from, {text: `🤖 FORCE REPLY: I see you said "${text}" - BOT IS LIVE! ✅`});
        console.log("Reply sent!");
      }catch(e){
        console.log("Reply error:", e);
      }
    }
  });

  sock.ev.on('connection.update', (u)=>{
    console.log("Connection:", u.connection);
    if(u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
    if(u.connection === 'open') console.log("✅ Connected to WhatsApp!");
  });
}

startBot();
app.get('/', (req,res)=>res.send('DEBUG BOT LIVE'));
app.listen(PORT, ()=>console.log("Server on "+PORT));
