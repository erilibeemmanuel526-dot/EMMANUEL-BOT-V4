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
try{ if(fs.existsSync('./paused.json')) BOT_PAUSED=JSON.parse(fs.readFileSync('./paused.json')).paused }catch{}
const msgCache = new Map();

app.get('/', (req,res)=>{
  if(isConnected) res.send(`<h1>✅ V8 LIVE</h1> PAUSED:${BOT_PAUSED} AUTO:${AUTO_REPLY}`);
  else res.send(`<h1>Scan QR V8</h1><img src="${qrImage}" width="300">`);
})
app.get('/session', (req,res)=>{ try{ res.send(`<textarea style="width:100%;height:300px">${Buffer.from(fs.readFileSync('./auth/creds.json')).toString('base64')}</textarea>`) }catch{ res.send('Scan first')} })
app.listen(process.env.PORT||10000, ()=>console.log('Server live'))
setInterval(()=>console.log('Keep-alive'), 1000*60*4)

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
    if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode != 401) startBot()
  })
  sock.ev.on('messages.upsert', async (m)=>{
    const msg=m.messages[0]; if(!msg.message) return;
    if(msg.key.remoteJid === 'status@broadcast'){
      if(AUTO_VIEW_STATUS) await sock.readMessages([msg.key]);
      return;
    }
    const from=msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us')
    const text=(msg.message.conversation||msg.message.extendedTextMessage?.text||'').trim();
    const senderName = msg.pushName||'User'
    const isCommand = text.startsWith('.')
    if(msg.key.fromMe && !isCommand) return;
    if(BOT_PAUSED && text !== '.resume'){
      console.log('Paused, ignoring', text)
      return;
    }
    if(text.toLowerCase()==='.menu'){
      return await sock.sendMessage(from,{text:`*V8 MENU*\n\n.ping\n.alive\n.pause - PAUSE bot\n.resume - RESUME bot\n.ai question\n.play song\n\nPAUSED:${BOT_PAUSED}\nAUTO:${AUTO_REPLY}`});
    }
    if(text=='.ping') return await sock.sendMessage(from,{text:`Pong! ⚡`})
    if(text=='.alive') return await sock.sendMessage(from,{text:`Alive ✅ Paused:${BOT_PAUSED}`})
    if(text=='.pause') { BOT_PAUSED=true; fs.writeFileSync('./paused.json', JSON.stringify({paused:true})); return await sock.sendMessage(from,{text:'⏸️ BOT PAUSED - I no go reply again'})}
    if(text=='.resume') { BOT_PAUSED=false; fs.writeFileSync('./paused.json', JSON.stringify({paused:false})); return await sock.sendMessage(from,{text:'▶️ BOT RESUMED - I don back!'})}
    if(AUTO_REPLY && !isGroup && !isCommand){
      return await sock.sendMessage(from,{text:`Hello ${senderName} 👋 Bot dey here! Send .menu`});
    }
  })
}
startBot()
