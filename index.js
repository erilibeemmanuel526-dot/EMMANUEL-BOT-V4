// V8 ULTIMATE - FIXED SESSION + PAUSE/RESUME
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const fs = require('fs')
const app = express()
const PORT = process.env.PORT || 3000

let BOT_PAUSED = false
let sock = null

// === SESSION SETUP ===
async function getAuth() {
    if (process.env.SESSION_ID) {
        try {
            const data = Buffer.from(process.env.SESSION_ID, 'base64').toString()
            fs.mkdirSync('./auth_info', { recursive: true })
            fs.writeFileSync('./auth_info/creds.json', data)
            console.log('✅ Session loaded from ENV')
        } catch (e) { console.log('Session ENV error:', e) }
    }
    return await useMultiFileAuthState('./auth_info')
}

async function startBot() {
    const { state, saveCreds } = await getAuth()
    sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
        browser: ['V8 Ultimate', 'Chrome', '1.0']
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'open') {
            console.log('✅ V8 LIVE')
            // AUTO SEND SESSION TO OWNER
            try {
                if (fs.existsSync('./auth_info/creds.json')) {
                    const creds = fs.readFileSync('./auth_info/creds.json')
                    const sessionID = Buffer.from(creds).toString('base64')
                    const owner = process.env.OWNER_NUMBER || sock.user.id
                    await sock.sendMessage(owner, { text: `✅ YOUR SESSION_ID - SAVE AM FOR RENDER ENV:\n\n${sessionID}\n\nAdd to Render as SESSION_ID` })
                }
            } catch(e){}
        }
        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                startBot()
            }
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return
        const from = msg.key.remoteJid
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
        if (!body.startsWith('.')) return
        
        const isCommand = body.startsWith('.')
        // FIXED: Allow commands even if fromMe
        if (msg.key.fromMe && !isCommand) return
        if (BOT_PAUSED && !body.startsWith('.resume')) return

        if (body.startsWith('.ping')) {
            await sock.sendMessage(from, { text: '🏓 Pong! V8 Ultimate Active' })
        }
        if (body.startsWith('.pause')) {
            BOT_PAUSED = true
            await sock.sendMessage(from, { text: '⏸️ Bot Paused. Type .resume to continue' })
        }
        if (body.startsWith('.resume')) {
            BOT_PAUSED = false
            await sock.sendMessage(from, { text: '▶️ Bot Resumed!' })
        }
        if (body.startsWith('.session')) {
            try {
                const creds = fs.readFileSync('./auth_info/creds.json')
                const sessionID = Buffer.from(creds).toString('base64')
                await sock.sendMessage(from, { text: sessionID })
            } catch(e){ await sock.sendMessage(from, { text: 'No session yet, scan first' }) }
        }
    })
}

// WEB SERVER FOR QR AND SESSION
app.get('/', (req, res) => {
    if (fs.existsSync('./auth_info/creds.json')) {
        res.send('✅ V8 LIVE - Bot Connected')
    } else {
        res.send('Scan first - QR will show in Render logs')
    }
})
app.get('/session', (req, res) => {
    try {
        if (fs.existsSync('./auth_info/creds.json')) {
            const creds = fs.readFileSync('./auth_info/creds.json')
            const sessionID = Buffer.from(creds).toString('base64')
            res.send(sessionID)
        } else {
            res.send('Scan first')
        }
    } catch(e){ res.send('Scan first') }
})

app.listen(PORT, () => console.log('Web running on ' + PORT))
startBot()
