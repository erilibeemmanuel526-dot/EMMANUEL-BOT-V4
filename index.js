const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const express = require('express')
const QRCode = require('qrcode')
const axios = require('axios')
const app = express()

let qrImage='Starting...'; let isConnected=false;
let AUTO_REPLY=true, ANTI_LINK=true, ANTI_STATUS=true, AUTO_VIEW_STATUS=true, ANTI_DELETE=true;
const msgCache = new Map(); // for anti-delete

app.get('/', (req,res)=>{
  if(isConnected) res.send(`<h1>✅ V7 ULTIMATE LIVE 🔥</h1>AI | Play | AntiDelete | AutoReply | 24/7<br><br><a href="/session" style="padding:12px;background:green;color:white;text-decoration:none">GET SESSION CODE</a>`);
  else res.send(`<h1>Scan QR V7</h1><img src="${qrImage}" style="width:300px"><br><button onclick="location.reload()">Refresh</button>`);
})
app.get('/session', (req,res)=>{
  try{
    const b64=Buffer.from(fs.readFileSync('./auth/creds.json','utf8')).toString('base64');
    res.send(`<h2>COPY ALL!</h2><textarea style="width:95%;height:400px">${b64}</textarea>`);
  }catch(e){res.send('Scan first')}
})
app.listen(process.env.PORT||10000, ()=>console.log('V7 Server live'))
setInterval(()=>console.log('V7 Keep-alive'), 4*60*1000)

async function startBot(){
    if(process.env.SESSION_ID && !fs.existsSync('./auth/creds.json')){
      if(!fs.existsSync('./auth')) fs.mkdirSync('./auth');
      fs.writeFileSync('./auth/creds.json', Buffer.from(process.env.SESSION_ID,'base64').toString('utf8'));
    }
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({ auth: state, logger: P({level:'silent'}), browser: ["Emmanuel-Bot","Chrome","1.0"] })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async (u)=>{
        if(u.qr){qrImage=await QRCode.toDataURL(u.qr); isConnected=false}
        if(u.connection==='open'){isConnected=true; console.log('V7 CONNECTED - ALL FEATURES LIVE');}
        if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
    })

    // Anti-delete detection
    sock.ev.on('messages.update', async (updates)=>{
      for(const upd of updates){
        if(upd.update?.status===2) continue;
        if(upd.key && msgCache.has(upd.key.id) && ANTI_DELETE){
          const oldMsg = msgCache.get(upd.key.id);
          if(upd.update?.message === null){ // deleted
            const from = oldMsg.from;
            await sock.sendMessage(from, {text:`*🚫 ANTI-DELETE*\n@${oldMsg.sender.split('@')[0]} deleted:`, mentions:[oldMsg.sender]});
            await sock.sendMessage(from, {forward: oldMsg.msg});
            console.log('Recovered deleted msg');
          }
        }
      }
    })

    sock.ev.on('messages.upsert', async (m)=>{
        const msg=m.messages[0]; if(!msg.message) return;
        
        // Status
        if(msg.key.remoteJid === 'status@broadcast'){
          if(AUTO_VIEW_STATUS) await sock.readMessages([msg.key]);
          if(ANTI_STATUS){
            try{ await sock.sendMessage(sock.user.id, {forward: msg, caption: `Anti-Status from ${msg.key.participant}`}) }catch(e){}
          }
          return;
        }

        if(msg.key.fromMe) return;
        const from=msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const text=(msg.message.conversation||msg.message.extendedTextMessage?.text||"").trim();
        const sender = isGroup ? msg.key.participant : from;

        // Save for anti-delete (save all non-commands)
        if(!text.startsWith('.') && ANTI_DELETE){
          msgCache.set(msg.key.id, {from, sender, msg, time: Date.now()});
          if(msgCache.size>100) { const first=msgCache.keys().next().value; msgCache.delete(first) }
        }

        // MENU
        if(text.toLowerCase()==='.menu'){
          return sock.sendMessage(from,{text:`*EMMANUEL BOT V7 🔥 ULTIMATE*

*COMMANDS:*
.menu - this menu
.ping - speed
.alive - status
.ai question - ask AI anything!
.play song name - download music
.autoreply on/off
.antilink on/off
.antistatus on/off
.antidelete on/off

*STATUS:*
Auto:${AUTO_REPLY?'ON✅':'OFF❌'}
AntiLink:${ANTI_LINK?'ON✅':'OFF❌'}
AntiStatus:${ANTI_STATUS?'ON✅':'OFF❌'}
AntiDelete:${ANTI_DELETE?'ON✅':'OFF❌'}

24/7 LIVE! No sleep!`});
        }

        if(text=='.ping') return sock.sendMessage(from,{text:'Pong V7 🏓'});
        if(text=='.alive') return sock.sendMessage(from,{text:'V7 ULTIMATE Alive ✅\nAI + Play + AntiDelete Ready'});
        if(text.startsWith('.autoreply')){ AUTO_REPLY=text.includes('on'); return sock.sendMessage(from,{text:`AutoReply ${AUTO_REPLY?'ON':'OFF'}`})}
        if(text.startsWith('.antilink')){ ANTI_LINK=text.includes('on'); return sock.sendMessage(from,{text:`AntiLink ${ANTI_LINK?'ON':'OFF'}`})}
        if(text.startsWith('.antidelete')){ ANTI_DELETE=text.includes('on'); return sock.sendMessage(from,{text:`AntiDelete ${ANTI_DELETE?'ON':'OFF'} - Bot go recover deleted msgs!`})}

        // === AI ASK ===
        if(text.toLowerCase().startsWith('.ai ')){
          const q=text.slice(4);
          if(!q) return sock.sendMessage(from,{text:'Use: .ai who is Wizkid?'});
          try{
            await sock.sendMessage(from,{text:'🤖 AI dey think...'});
            // Free AI API
            const res=await axios.get(`https://api.ferdev.my.id/api/ai/chat?message=${encodeURIComponent(q)}`);
            const ans=res.data?.message || res.data?.result || "AI no reply";
            return sock.sendMessage(from,{text:`*AI ANSWER:*\n\n${ans}`});
          }catch(e){
            try{
              const res2=await axios.get(`https://api.siputzx.my.id/api/ai/gpt3?prompt=${encodeURIComponent(q)}`);
              return sock.sendMessage(from,{text:`*AI:*\n${res2.data.data}`});
            }catch(err){ return sock.sendMessage(from,{text:'AI busy now, try again later'}) }
          }
        }

        // === PLAY SONG ===
        if(text.toLowerCase().startsWith('.play ')){
          const song=text.slice(6);
          if(!song) return sock.sendMessage(from,{text:'Use: .play Calm Down Rema'});
          try{
            await sock.sendMessage(from,{text:`🎵 Searching *${song}*...`});
            const search=await axios.get(`https://api.ferdev.my.id/api/search/yt?query=${encodeURIComponent(song)}`);
            const video=search.data?.result?.[0] || search.data?.data?.[0];
            if(!video) return sock.sendMessage(from,{text:'Song not found'});
            
            const dl=await axios.get(`https://api.ferdev.my.id/api/downloader/ytmp3?url=${video.url || video.link}`);
            const audioUrl=dl.data?.result?.url || dl.data?.url;
            if(audioUrl){
              await sock.sendMessage(from,{audio:{url:audioUrl}, mimetype:'audio/mpeg', fileName:`${song}.mp3`});
              return sock.sendMessage(from,{text:`✅ Downloaded: ${video.title}`});
            }else{
              return sock.sendMessage(from,{text:`Found: ${video.title}\nLink: ${video.url}\n\nAudio download busy, try .play again`});
            }
          }catch(e){
            console.log(e);
            return sock.sendMessage(from,{text:'Play service busy, try again or use full link with .play2'});
          }
        }

        // Anti-link
        if(ANTI_LINK && isGroup && /(https?:\/\/|www\.|chat.whatsapp.com|wa.me|t.me|discord.gg)/i.test(text)){
           try{
             const meta=await sock.groupMetadata(from);
             const botAdmin=meta.participants.find(p=>p.id===sock.user.id)?.admin;
             const senderAdmin=meta.participants.find(p=>p.id===sender)?.admin;
             if(botAdmin && !senderAdmin){
               await sock.sendMessage(from,{delete: msg.key});
               await sock.sendMessage(from,{text:`@${sender.split('@')[0]} Link blocked! ⚠️`, mentions:[sender]});
             }
           }catch(e){}
           return;
        }

        // Auto-reply
        if(AUTO_REPLY && !isGroup && !text.startsWith('.')){
           if(['hi','hello','hey'].includes(text.toLowerCase())){
             return sock.sendMessage(from,{text:'Hello! 👋 I am V7 ULTIMATE.\nTry .ai, .play, .menu'});
           }
           await new Promise(r=>setTimeout(r,800));
           return sock.sendMessage(from,{text:'*Auto:* Boss go reply soon. Try .ai your question or .play song name 🤖'});
        }
    })
}
startBot()
