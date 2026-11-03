const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const qrcode = require('qrcode-terminal')

const app = express()
app.get('/', (req, res) => res.send('Bot is Alive! Deploy OK - Nov 3'))
app.listen(process.env.PORT || 10000, () => console.log('Server running'))

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    const sock = makeWASocket({ 
        auth: state, 
        logger: P({ level: 'silent' }), 
        browser: ["LOVLY","Chrome","1.0"] 
    })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', ({ connection, qr, lastDisconnect }) => {
        if(qr){
            console.log('=== SCAN THIS QR ===')
            qrcode.generate(qr, {small: true})
        }
        if(connection === 'close'){
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if(shouldReconnect) startBot()
        } else if(connection === 'open'){
            console.log('BOT CONNECTED SUCCESSFULLY!')
        }
    })
}
startBot()
