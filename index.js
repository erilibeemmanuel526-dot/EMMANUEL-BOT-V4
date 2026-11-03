const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const express = require('express')
const QRCode = require('qrcode')
const axios = require('axios')
const app = express()

let qrImage='Starting...'; let isConnected=false;
let AUTO_REPLY=true, ANTI_LINK=true, ANTI_STATUS=true, ANTI_DELETE=true, AUTO_VIEW_STATUS=true;
let BOT_PAUSED=false;
const msgCache = new Map();

app.get('/', (req,res)=>{
  if(isConnected) res.send(`<h1>✅ V8 ULTIMATE LIVE 24/7</h1><p>Pause: ${BOT_PAUSED?'PAUSED':'ACTIVE'}</p><p>AutoReply:${AUTO_REPLY?'ON':'OFF'}</p>`);
  else res.send(`<h1>Scan QR V8</h1><img src="${qrImage}" width="300">`);
})
app.get('/session', (req,res)=>{
  try{
    const b64=Buffer.from(fs.readFileSync('./auth/creds.json')).toString('base64');
    res.send(`<h2>COPY ALL!</h2><textarea style="width:100%;height:300px">${b64}</textarea>`);
  }catch(e){res.send('Scan first')}
})
app.listen(process.env.PORT||10000, ()=>console.log('Server live'))
setInterval(()=>console.log('V8 Keep-alive'), 1000*60*4)

async function startBot(){
  if(process.env.SESSION_ID && !fs.existsSync('./auth/creds.json')){
    if(!fs.existsSync('./auth')) fs.mkdirSync('./auth',{recursive:true})
    fs.writeFileSync('./auth/creds.json', Buffer.from(process.env.SESSION_ID,'base64').toString())
  }
  const { state, saveCreds } = await useMultiFileAuthState('./auth')
  const sock = makeWASocket({ auth: state, logger: P({level:'silent'}), browser: ['V8 Ultimate','Chrome','1.0'] })
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', async (u)=>{
    if(u.qr) qrImage=await QRCode.toDataURL(u.qr)
    if(u.connection==='open'){isConnected=true; console.log('✅ CONNECTED V8')}
    if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode != 401){ startBot() }
  })

  // Anti-delete detection
  sock.ev.on('messages.update', async (updates)=>{
    for(const upd of updates){
      if(upd.update?.status===2) continue;
      if(upd.key && msgCache.has(upd.key.id)){
        const oldMsg = msgCache.get(upd.key.id);
        if(upd.update?.message === null){
          const from = oldMsg.from;
          await sock.sendMessage(from, {text:`🚫 *ANTI-DELETE*\n\n👤 ${oldMsg.senderName} deleted: \n${oldMsg.text}`});
          if(oldMsg.media) await sock.sendMessage(from, {forward: oldMsg.media})
          console.log('Recovered deleted msg')
        }
      }
    }
  })

  sock.ev.on('messages.upsert', async (m)=>{
    const msg=m.messages[0]; if(!msg.message) return;

    // === STATUS ===
    if(msg.key.remoteJid === 'status@broadcast'){
      if(AUTO_VIEW_STATUS) await sock.readMessages([msg.key]);
      if(ANTI_STATUS){
        try{ 
          const media = await downloadMediaMessage(msg, 'buffer', {}, {logger: P({level:'silent'})});
          const type = msg.message.imageMessage ? 'image' : msg.message.videoMessage ? 'video' : 'text';
          if(type!=='text') await sock.sendMessage(sock.user.id, {image: type==='image'?media:undefined, video: type==='video'?media:undefined, caption:`*STATUS SAVED from ${msg.pushName}*`})
        }catch{}
      }
      return;
    }

    if(msg.key.fromMe) return;
    const from=msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us')
    const text=(msg.message.conversation||msg.message.extendedTextMessage?.text||'').trim();
    const sender = isGroup ? msg.key.participant : from;
    const senderName = msg.pushName||'User'

    // === GLOBAL PAUSE CHECK ===
    if(BOT_PAUSED && text !== '.resume') return;

    // === VIEW-ONCE SAVER V8 ===
    let viewOnce = msg.message?.viewOnceMessageV2?.message || msg.message?.viewOnceMessage?.message;
    if(viewOnce){
      try{
        const vType = Object.keys(viewOnce)[0];
        const vMsg = {key: msg.key, message: viewOnce};
        const buffer = await downloadMediaMessage(vMsg, 'buffer', {}, {logger: P({level:'silent'})});
        const caption = viewOnce[vType]?.caption || '';
        await sock.sendMessage(sock.user.id, {
          image: vType.includes('image')?buffer:undefined,
          video: vType.includes('video')?buffer:undefined,
          caption:`🔓 *VIEW-ONCE SAVED*\n\n👤 From: ${senderName}\n📱 Chat: ${from}\n\n${caption}`
        })
      }catch(e){console.log('ViewOnce error', e)}
    }

    // Save for anti-delete (save all non-commands)
    if(!text.startsWith('.') && ANTI_DELETE){
      msgCache.set(msg.key.id, {from, senderName, text, media: msg.message});
      if(msgCache.size>150) { const first=msgCache.keys().next().value; msgCache.delete(first) }
    }

    // === MENU ===
    if(text.toLowerCase()==='.menu'){
      return sock.sendMessage(from,{text:`*V8 ULTIMATE MENU* 🤖

.ping - speed
.alive - bot status
.pause - PAUSE bot (when you dey chat)
.resume - RESUME bot
.ai question - ask AI anything!
.play song name - download music
.autoreply on/off
.antilink on/off
.antistatus on/off
.antidelete on/off
.autoviewstatus on/off

*STATUS:*
Bot:${BOT_PAUSED?'PAUSED⏸️':'ACTIVE✅'}
Auto:${AUTO_REPLY?'ON✅':'OFF❌'}
AntiLink:${ANTI_LINK?'ON✅':'OFF❌'}
AntiStatus:${ANTI_STATUS?'ON✅':'OFF❌'}
AntiDelete:${ANTI_DELETE?'ON✅':'OFF❌'}
AutoViewStatus:${AUTO_VIEW_STATUS?'ON✅':'OFF❌'}

24/7 LIVE! No sleep!`});
    }

    if(text=='.ping') return sock.sendMessage(from,{text:`Pong! ⚡ V8 LIVE`})
    if(text=='.alive') return sock.sendMessage(from,{text:`I dey alive 24/7 ✅ Paused: ${BOT_PAUSED}`})
    if(text=='.pause') { BOT_PAUSED=true; return sock.sendMessage(from,{text:'⏸️ *BOT PAUSED*\nI no go reply any message again until you send .resume'})}
    if(text=='.resume') { BOT_PAUSED=false; return sock.sendMessage(from,{text:'▶️ *BOT RESUMED*\nI don back! I go dey reply again!'})}
    if(text.startsWith('.autoreply')){ AUTO_REPLY=text.includes('on'); return sock.sendMessage(from,{text:`Autoreply ${AUTO_REPLY?'ON':'OFF'}`})}
    if(text.startsWith('.antilink')){ ANTI_LINK=text.includes('on'); return sock.sendMessage(from,{text:`Antilink ${ANTI_LINK?'ON':'OFF'}`})}
    if(text.startsWith('.antidelete')){ ANTI_DELETE=text.includes('on'); return sock.sendMessage(from,{text:`Antidelete ${ANTI_DELETE?'ON':'OFF'}`})}
    if(text.startsWith('.antistatus')){ ANTI_STATUS=text.includes('on'); return sock.sendMessage(from,{text:`Antistatus ${ANTI_STATUS?'ON':'OFF'}`})}
    if(text.startsWith('.autoviewstatus')){ AUTO_VIEW_STATUS=text.includes('on'); return sock.sendMessage(from,{text:`AutoViewStatus ${AUTO_VIEW_STATUS?'ON':'OFF'}`})}

    // === AI ASK ===
    if(text.toLowerCase().startsWith('.ai')){
      const q=text.slice(4);
      if(!q) return sock.sendMessage(from,{text:'Ask something! .ai who is Wizkid?'})
      try{
        await sock.sendMessage(from,{text:'_Thinking..._'})
        const res=await axios.get(`https://api.giftedtech.web.id/api/ai/gpt?apikey=gifted&q=${encodeURIComponent(q)}`);
        const ans=res.data?.message || res.data?.result || 'No answer';
        return sock.sendMessage(from,{text:ans});
      }catch(e){
        try{
          const res2=await axios.get(`https://api.ryzendesu.vip/api/ai/openai?text=${encodeURIComponent(q)}`);
          return sock.sendMessage(from,{text:res2.data?.result||'AI error'});
        }catch(err){ return sock.sendMessage(from,{text:'AI down, try later'})}
      }
    }

    // === PLAY SONG ===
    if(text.toLowerCase().startsWith('.play')){
      const song=text.slice(6);
      if(!song) return sock.sendMessage(from,{text:'Song name? .play Calm Down'})
      try{
        await sock.sendMessage(from,{text:`_Searching ${song}..._`})
        const dl=await axios.get(`https://api.giftedtech.web.id/api/download/ytplay?apikey=gifted&query=${encodeURIComponent(song)}`);
        const audioUrl=dl.data?.result?.url || dl.data?.url;
        if(audioUrl){
          await sock.sendMessage(from,{audio:{url:audioUrl}, mimetype:'audio/mpeg'});
          return sock.sendMessage(from,{text:`✅ *${song}* downloaded`})
        }else{
          return sock.sendMessage(from,{text:`Found: ${dl.data?.result?.title||song}\nLink: ${dl.data?.result?.url||'No link'}`})
        }
      }catch(e){
        console.log(e);
        return sock.sendMessage(from,{text:'Music API down, try later'});
      }
    }

    // Anti-link
    if(ANTI_LINK && isGroup && /(https?:\/\/|www\.|wa\.me)/i.test(text)){
      try{
        const meta=await sock.groupMetadata(from);
        const botAdmin=meta.participants.find(p=>p.id===sock.user.id)?.admin;
        const senderAdmin=meta.participants.find(p=>p.id===sender)?.admin;
        if(botAdmin && !senderAdmin){
          await sock.sendMessage(from,{delete: msg.key});
          await sock.sendMessage(from,{text:`@ ${sender.split('@')[0]} link not allowed!`, mentions:[sender]});
        }
      }catch(e){}
      return;
    }

    // Auto-reply ONLY if not a command and not group and not paused
    if(AUTO_REPLY && !isGroup && !text.startsWith('.')){
      if(['hi','hello','hey'].includes(text.toLowerCase())){
        return sock.sendMessage(from,{text:'Hello 👋 I be bot! Send .menu for commands'});
      }
      await new Promise(r=>setTimeout(r,1000));
      return sock.sendMessage(from,{text:`I'm bot 🤖 Currently ${BOT_PAUSED?'paused':'active'}. Send .menu`});
    }
  })
}
startBot()
