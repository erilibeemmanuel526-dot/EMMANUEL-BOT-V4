const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const express = require('express')
const QRCode = require('qrcode')

const app = express()
let qrImage = 'Starting bot... wait 30s and refresh page...'
let isConnected = false

app.get('/', (req,res) => {
  res.send(`
    <h1>${isConnected ? '✅ BOT CONNECTED!' : 'Scan QR to Link Bot'}</h1>
    ${isConnected ? '<h2 style="color:green">Bot is live! You can close this page</h2>' : `<img src="${qrImage}" style="width:300px;border:5px solid black" /><br><br><button onclick="location.reload()" style="padding:15px;font-size:20px">Refresh QR</button><p>WhatsApp > Linked Devices > Link a device</p>`}
  `)
})
app.listen(process.env.PORT || 10000, ()=>console.log('Web up'))

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
        browser: ["Emmanuel-Bot","Chrome","1.0"]
    })
    sock.ev.on('creds.update', saveCreds)
    
    sock.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect, qr } = u
        if(qr){
            console.log("NEW QR GENERATED")
            qrImage = await QRCode.toDataURL(qr)
            isConnected = false
        }
        if(connection === 'open'){
            console.log('✅ CONNECTED! BOT IS LIVE!')
            isConnected = true
            qrImage = ''
        }
        if(connection === 'close'){
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('Connection closed, reconnecting:', shouldReconnect)
            if(shouldReconnect) startBot()
        }
    })

    // BOT COMMANDS
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if(!msg.message || msg.key.fromMe) return
        const from = msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
        
        console.log("New message:", text)

        if(text.toLowerCase() === '.menu' || text.toLowerCase() === 'menu'){
            await sock.sendMessage(from, { text: `*EMMANUEL BOT V4 🔥*

*Commands:*
• .menu - Show this menu
• .ping - Check bot speed
• .sticker - Reply to image to make sticker
• .alive - Bot is alive?
• .owner - My owner

Bot is working 100% ✅` })
        }
        if(text.toLowerCase() === '.ping'){
            await sock.sendMessage(from, { text: 'Pong! 🏓 Bot speed: Fast!' })
        }
        if(text.toLowerCase() === '.alive'){
            await sock.sendMessage(from, { text: 'Yes boss! Emmanuel Bot V4 is alive and active ✅' })
        }
        if(text.toLowerCase() === '.owner'){
            await sock.sendMessage(from, { text: 'Owner: Emmanuel 👑' })
        }
    })
}
startBot()
