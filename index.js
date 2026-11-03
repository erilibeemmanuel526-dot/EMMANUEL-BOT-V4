const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const express = require('express')

const app = express()
app.get('/', (req,res) => res.send('Bot QR Ready - Check Logs'))
app.listen(process.env.PORT || 10000)

async function startBot() {
    if(fs.existsSync('auth')) fs.rmSync('auth', {recursive:true, force:true})
    
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
        browser: ["Bot","Chrome","1.0"]
    })
    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (u) => {
        const { connection, qr } = u
        if(qr){
            console.log("QR CODE GENERATED - SCAN IT IN LOGS!")
        }
        if(connection === 'open'){
            console.log('✅ CONNECTED! BOT IS LIVE!')
        }
    })
}
startBot()
