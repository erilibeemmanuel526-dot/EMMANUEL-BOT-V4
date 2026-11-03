const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const fs = require('fs')
const QRCode = require('qrcode')
const app = express()
const PORT = process.env.PORT || 3000

let lastQR = null
let BOT_PAUSED = false
let sock = null

async function getAuth() {
    if (process.env.SESSION_ID) {
        try {
            fs.mkdirSync('./auth', { recursive: true })
            const buff = Buffer.from(process.env.SESSION_ID, 'base64').toString()
            fs.writeFileSync('./auth/creds.json', buff)
            console.log('✅ Session from ENV loaded')
        } catch (e) {}
    }
    return await useMultiFileAuthState('./auth')
}

async function start() {
    const { state, saveCreds } = await getAuth()
    sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), browser: ['V8 Ultimate','Chrome','1.0'] })
    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect, qr } = u
        if (qr) { lastQR = qr; console.log('New QR generated') }
        if (connection === 'open') {
            console.log('✅ BOT CONNECTED')
            lastQR = null
            // Send session to you automatically
            try {
                const data = fs.readFileSync('./auth/creds.json')
                const sess = Buffer.from(data).toString('base64')
                await sock.sendMessage(sock.user.id, { text: `✅ SAVE THIS SESSION_ID FOR RENDER:\n\n${sess}` })
            } catch {}
        }
        if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) start()
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message) return
        const from = m.key.remoteJid
        const body = m.message.conversation || m.message.extendedTextMessage?.text || ""
        if (!body.startsWith('.')) return
        
        // FIXED PAUSE/RESUME - Bot self commands must work
        if (BOT_PAUSED && !body.startsWith('.resume')) return

        if (body === '.ping') await sock.sendMessage(from, { text: '🏓 Pong! V8 Active' })
        if (body === '.pause') { BOT_PAUSED = true; await sock.sendMessage(from, { text: '⏸️ Paused. Type .resume' }) }
        if (body === '.resume') { BOT_PAUSED = false; await sock.sendMessage(from, { text: '▶️ Resumed! I dey active' }) }
        if (body === '.session') {
            try {
                const d = fs.readFileSync('./auth/creds.json')
                const s = Buffer.from(d).toString('base64')
                await sock.sendMessage(from, { text: s })
            } catch { await sock.sendMessage(from, { text: 'No session yet' }) }
        }
        if (body === '.menu') await sock.sendMessage(from, { text: 'V8 MENU:\n.ping\n.pause\n.resume\n.session\n.menu' })
    })
}

app.get('/', async (req, res) => {
    if (fs.existsSync('./auth/creds.json')) return res.send('<h1>✅ V8 ULTIMATE LIVE</h1>')
    if (lastQR) {
        const img = await QRCode.toDataURL(lastQR)
        return res.send(`<h2>Scan QR</h2><img src="${img}" width="300"><br><br><a href="/">Refresh</a>`)
    }
    res.send('<h2>Waiting for QR... Refresh after 10 seconds</h2><a href="/">Refresh</a>')
})

app.get('/session', (req, res) => {
    try {
        if (fs.existsSync('./auth/creds.json')) {
            const d = fs.readFileSync('./auth/creds.json')
            return res.send(Buffer.from(d).toString('base64'))
        }
        res.send('Scan first')
    } catch { res.send('Scan first') }
})

app.listen(PORT, () => console.log('Server running'))
start()
