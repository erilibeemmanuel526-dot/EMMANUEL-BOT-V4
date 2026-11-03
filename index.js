const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const express = require('express')
const QRCode = require('qrcode')

const app = express()
let qrImage = 'Bot starting...'
let isConnected = false

app.get('/', (req,res) => {
  res.send(`<h1>${isConnected ? '✅ BOT CONNECTED & WORKING!' : 'Scan QR'}</h1>${isConnected ? '<h2>Bot dey work!</h2>' : `<img src="${qrImage}" style="width:300px" /><br><button onclick="location.reload()">Refresh</button>`}`)
})
app.listen(process.env.PORT || 10000, ()=>console.log('Web up'))

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), browser: ["Emmanuel-Bot","Chrome","1.0"] })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async (u) => {
        if(u.qr){ qrImage = await QRCode.toDataURL(u.qr); isConnected=false; console.log("NEW QR") }
        if(u.connection === 'open'){ isConnected=true; console.log('CONNECTED!') }
        if(u.connection === 'close'){
            if(u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot()
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if(!msg.message) return
        // Allow messages from you too for testing
        const from = msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
        console.log("MSG:", text, "FROM:", from)

        if(!text) return

        if(text.toLowerCase().trim() === '.menu' || text.toLowerCase().trim() === 'menu'){
            await sock.sendMessage(from, { text: `*EMMANUEL BOT V4 🔥 IS LIVE!*

.menu - this menu
.ping - check speed
.alive - bot active?
.owner - owner info

You connected successfully ✅` })
        }
        if(text.toLowerCase().trim() === '.ping'){
            await sock.sendMessage(from, { text: 'Pong! 🏓  Fast!' })
        }
        if(text.toLowerCase().trim() === '.alive'){
            await sock.sendMessage(from, { text: 'Yes boss! I dey alive ✅' })
        }
    })
}
startBot()
