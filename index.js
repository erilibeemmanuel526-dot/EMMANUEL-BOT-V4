const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys')
const P = require('pino')
async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const sock = makeWASocket({
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({level:'silent'}).child({})) },
        logger: P({level:'silent'}),
        printQRInTerminal: false,
        browser: ["Ubuntu","Chrome","20.0.04"]
    })
    sock.ev.on('creds.update', saveCreds)
    if (!sock.authState.creds.registered) {
        await new Promise(r=>setTimeout(r,4000))
        const code = await sock.requestPairingCode("2349137142411")
        console.log(`CODE FOR 2349137142411: ${code}`)
    }
    sock.ev.on('connection.update', ({connection})=>{ if(connection==='open') console.log('CONNECTED!') })
}
start()
