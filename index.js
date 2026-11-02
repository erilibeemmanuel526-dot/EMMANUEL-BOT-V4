const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys')
const P = require('pino')

const PHONE_NUMBER = process.env.PHONE_NUMBER

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' }))
        },
        browser: ['EMMANUEL-BOT-V4', 'Chrome', '1.0.0']
    })

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let phoneNumber = PHONE_NUMBER.replace(/[^0-9]/g, '')
                const code = await sock.requestPairingCode(phoneNumber)
                console.log(`\nYOUR PAIR CODE: ${code}\n`)
            } catch (err) {
                console.log('Error:', err.message)
            }
        }, 3000)
    }

    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) startBot()
        } else if (connection === 'open') {
            console.log('BOT CONNECTED!')
        }
    })
}
startBot()
