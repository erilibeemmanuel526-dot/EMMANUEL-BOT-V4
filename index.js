const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const express = require('express')
const QRCode = require('qrcode')

const app = express()
let qrImage = 'QR not ready yet... deploying... wait 30s and refresh'

app.get('/', (req,res) => {
  res.send(`
    <h1>Scan QR to Link Bot</h1>
    <p>Open WhatsApp > Linked devices > Link a device > Scan:</p>
    <img src="${qrImage}" style="width:300px;border:5px solid black" />
    <br><br><button onclick="location.reload()">Refresh QR</button>
    <p>${qrImage.includes('data:') ? 'QR IS READY - SCAN NOW!' : qrImage}</p>
  `)
})

app.listen(process.env.PORT || 10000, ()=>console.log('Web up'))

async function startBot() {
    if(fs.existsSync('auth')) fs.rmSync('auth', {recursive:true, force:true})
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
        browser: ["Bot","Chrome","1.0"]
    })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async (u) => {
        const { connection, qr } = u
        if(qr){
            console.log("NEW QR GENERATED")
            qrImage = await QRCode.toDataURL(qr)
        }
        if(connection === 'open'){
            console.log('✅ CONNECTED! BOT IS LIVE!')
            qrImage = '<h1 style="color:green">✅ BOT CONNECTED! You can close this</h1>'
        }
    })
}
startBot()
