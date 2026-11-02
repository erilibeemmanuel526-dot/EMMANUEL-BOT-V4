const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Bot is Live!'));
app.listen(PORT, () => console.log(`Port ${PORT} open`));

const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const P = require('pino')

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({
        auth: { creds: state.creds, keys: state.keys },
        logger: P({level: 'silent'}),
        printQRInTerminal: false,
        browser: ["Ubuntu","Chrome","20.0.04"]
    })
    sock.ev.on('creds.update', saveCreds)
    if (!sock.authState.creds.registered) {
        await new Promise(r=>setTimeout(r,4000))
        const code = await sock.requestPairingCode("2349137142411")
        console.log(`CODE FOR 2349137142411: ${code}`)
    }
    sock.ev.on('connection.update', ({connection}) => {
        if(connection === 'open') console.log('Bot Connected!')
    })
}
start()
