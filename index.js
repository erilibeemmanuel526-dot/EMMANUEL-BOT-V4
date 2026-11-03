const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const store = new Map();

if (process.env.SESSION_ID) {
  try {
    const p = './auth'; if (!fs.existsSync(p)) fs.mkdirSync(p);
    fs.writeFileSync(path.join(p,'creds.json'), Buffer.from(process.env.SESSION_ID,'base64').toString());
    console.log("✅ Session restored");
  } catch(e){}
}

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({ auth: state, logger: P({level:'silent'}), browser:['V8 Ultimate','Chrome','1.0'] });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({messages})=>{
    for(let m of messages){
      if(!m.message) continue;
      const text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || "";
      if(!text) continue;
      const from = m.key.remoteJid;
      const isMe = m.key.fromMe;
      console.log(`Message: ${text} from ${from} isMe:${isMe}`);
      
      store.set(m.key.id, m);
      
      // FOR TEST - REPLY EVEN TO YOURSELF!
      const low = text.toLowerCase().trim();
      
      if(low === 'hii' || low === 'hi' || low === 'hello' || low.includes('hii')) {
        await sock.sendMessage(from, {text:'✅ AUTO-REPLY WORKING! Hello! V8 don reply you! 🔥'});
        continue;
      }
      if(low === '.ping') {
        await sock.sendMessage(from, {text:'🏓 Pong! V8 Active ✅ NEW CODE LIVE!'});
        continue;
      }
      if(low.startsWith('.song ')){
        const q = text.slice(6);
        try{
          const res = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=1`);
          const song = res.data.results[0];
          if(song) await sock.sendMessage(from, {text:`🎵 ${song.trackName} - ${song.artistName}\n${song.previewUrl}`});
        }catch{}
      }
      if(low === '.menu'){
        await sock.sendMessage(from, {text:`🔥 V8 V3 FORCED MENU 🔥\n.hii -> auto reply\n.ping -> new code\n.song name\nTHIS IS NEW CODE!`});
      }
    }
  });

  sock.ev.on('connection.update', (u)=>{
    if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
  });
}
startBot();
app.get('/', (req,res)=>res.send('✅ V8 V3 FORCED LIVE'));
app.listen(PORT, ()=>console.log("Live on "+PORT));
