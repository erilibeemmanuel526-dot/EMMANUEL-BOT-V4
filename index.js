const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')

const app = express()
app.get('/', (req, res) => res.send('Bot Alive - 2349137142411'))
app.listen(process.env.PORT || 10000, () => console.log('Server running'))

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({ 
        auth: state, 
        logger: P({ level: 'silent' }), 
        printQRInTerminal: false 
    })
    
    sock.ev.on('creds.update', saveCreds)

    if(!sock.authState.creds.registered){
        let num = "2349137142411"
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(num)
                console.log("YOUR PAIR CODE IS: " + code)
            } catch(e){
                console.log("Failed to get code:", e.message)
            }
        }, 3000)
    }
    
    sock.ev.on('connection.update', (s) => {
        if(s.connection === 'open'){
            console.log('CONNECTED! Bot is live for 2349137142411')
        }
    })
}

startBot()
