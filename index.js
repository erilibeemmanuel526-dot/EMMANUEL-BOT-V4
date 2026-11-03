const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const express = require('express')

const app = express()
app.get('/', (req, res) => res.send('Bot Alive'))
app.listen(process.env.PORT || 10000)

async function startBot() {
    // Clear bad auth if exist
    if(fs.existsSync('auth/creds.json') && fs.statSync('auth/creds.json').size < 100){
        fs.rmSync('auth', {recursive:true, force:true})
    }
    
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({ 
        auth: state, 
        logger: P({ level: 'silent' }), 
        browser: ["Chrome","Chrome","1.0"],
        printQRInTerminal: false 
    })
    
    sock.ev.on('creds.update', saveCreds)

    if(!sock.authState.creds.registered){
        let num = "2349137142411"
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(num)
                console.log("YOUR NEW PAIR CODE IS: " + code)
            } catch(e){
                console.log("Error: " + e.message)
                // If error, delete auth and retry
                if(fs.existsSync('auth')) fs.rmSync('auth', {recursive:true, force:true})
                console.log("Cleared bad auth, please redeploy")
            }
        }, 5000)
    }
    
    sock.ev.on('connection.update', (s) => {
        if(s.connection === 'open') console.log('CONNECTED SUCCESSFULLY!')
    })
}
startBot()
