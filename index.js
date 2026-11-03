const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')

const app = express()
app.get('/', (req, res) => res.send('Bot Alive'))
app.listen(process.env.PORT || 3000)

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), printQRInTerminal: false })
    sock.ev.on('creds.update', saveCreds)
    
    if(!sock.authState.creds.registered){
        let num = "234" // CHANGE TO YOUR WHATSAPP NUMBER 2349137142411
        let code = await sock.requestPairingCode(num)
        console.log("YOUR PAIR CODE IS: " + code)
    }
    
    sock.ev.on('connection.update', (s) => {
        if(s.connection === 'open') console.log('CONNECTED!')
    })
}
startBot()
