const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const store = new Map();
global.paused = false;

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
    if(global.paused) return;
    for(let m of messages){
      if(!m.message) continue;
      const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
      const from = m.key.remoteJid;
      store.set(m.key.id, m);
      
      if(m.key.fromMe) continue;
      
      // AUTO REPLY - this go work now!
      if(text.toLowerCase() === 'hii' || text.toLowerCase() === 'hi') {
        await sock.sendMessage(from, {text:'Hello Boss! 👋 V8 dey active! Auto-reply don work!'});
        continue;
      }
      if(text.toLowerCase() === 'hello') {
        await sock.sendMessage(from, {text:'Hello! How you dey? 😊'});
        continue;
      }

      if(text === '.ping') await sock.sendMessage(from, {text:'🏓 Pong! V8 Active ✅'});
      if(text === '.pause') {global.paused=true; await sock.sendMessage(from, {text:'⏸️ Paused'});}
      if(text === '.resume') {global.paused=false; await sock.sendMessage(from, {text:'▶️ Resumed! I dey back!'});}
      if(text === '.menu') {
        await sock.sendMessage(from, {text:`🔥 V8 V2 MENU 🔥\n.ping\n.song Burna Boy\nHi/Hello (auto reply)\nAnti-delete Active ✅`});
      }
      if(text.startsWith('.song ')){
        const q = text.slice(6);
        await sock.sendMessage(from, {text:`🔍 Searching song: ${q}...`});
        try{
          // Use free API
          const res = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=1`);
          const song = res.data.results[0];
          if(song) await sock.sendMessage(from, {text:`🎵 *${song.trackName}*\n👤 ${song.artistName}\n💿 ${song.collectionName}\n🔗 ${song.previewUrl}`});
          else await sock.sendMessage(from, {text:'Song not found'});
        }catch{ await sock.sendMessage(from, {text:'Search error'}); }
      }
    }
  });

  // ANTI-DELETE
  sock.ev.on('messages.update', async (updates)=>{
    for(let u of updates){
      if(u.update && Object.keys(u.update).length === 0){ // deleted
        const old = store.get(u.key.id);
        if(old){
          const txt = old.message.conversation || old.message.extendedTextMessage?.text || "Media";
          await sock.sendMessage(old.key.remoteJid, {text:`🚨 ANTI-DELETE 🚨\nUser deleted: ${txt}`});
        }
      }
    }
  });

  sock.ev.on('connection.update', (u)=>{
    if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
  });
}
startBot();
app.get('/', (req,res)=>res.send('✅ V8 V2 LIVE - AutoReply + AntiDelete + Song'));
app.get('/session', (req,res)=>{
  try{ res.send(Buffer.from(fs.readFileSync('./auth/creds.json')).toString('base64')); }catch{res.send('Not ready');}
});
app.listen(PORT);
