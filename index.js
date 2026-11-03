const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')

const app = express()
app.get('/', (req, res) => res.send('Bot Alive!'))
app.listen(process.env.PORT || 3000, () => console.log('Server running'))

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    const sock = makeWASocket({ auth: state, printQRInTerminal: true, logger: P({ level: 'silent' }), browser: ["LOVLY BOT","Chrome","1.0"] })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
        if(connection === 'close'){
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if(shouldReconnect) startBot()
        } else if(connection === 'open'){
            console.log('BOT CONNECTED!')
        }
    })
}
startBot()
