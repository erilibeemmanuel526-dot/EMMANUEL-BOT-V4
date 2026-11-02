const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const express = require("express")
const app = express()
const PORT = process.env.PORT || 10000
const PHONE = process.env.PHONE_NUMBER || "" // Set this for Render

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth")
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ["EMMANUEL-BOT-V4", "Chrome", "1.0"]
    })

    // Pair code logic
    if (!sock.authState.creds.registered && PHONE) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(PHONE.replace(/[^0-9]/g, ""))
                console.log(`YOUR PAIR CODE: ${code}`)
            } catch(e){ console.log("Pair error", e) }
        }, 3000)
    }

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            console.log("Connection closed, reconnecting:", shouldReconnect)
            if (shouldReconnect) startBot()
        } else if (connection === "open") {
            console.log("✅ EMMANUEL-BOT-V4 CONNECTED!")
        }
    })

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return
        
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || ""
        if (!body.startsWith(".")) return

        const args = body.slice(1).trim().split(/ +/)
        const command = args.shift().toLowerCase()
        const from = msg.key.remoteJid

        console.log(`Command: ${command} from ${from}`)

        if (command === "ping") {
            await sock.sendMessage(from, { text: `🏓 *Pong!* _EMMANUEL-BOT-V4_ is Active ⚡\nSpeed: ${Date.now() - Math.floor(msg.messageTimestamp*1000)}ms` })
        }
        if (command === "menu") {
            await sock.sendMessage(from, { text: `*🤖 EMMANUEL-BOT-V4 MENU 🤖*\n\n*MAIN:*\n.ping - Check speed\n.alive - Bot status\n.menu - This list\n\n*FUN:*\n.sticker - How: Send photo, reply .sticker\n.owner - Show owner\n.joke - Random joke\n\n*AI:*\n.ai + question - Chat with AI\n\n*Creator: Emmanuel - Real Dev!* 🔥` })
        }
        if (command === "alive") {
            await sock.sendMessage(from, { text: `*EMMANUEL-BOT-V4 IS ALIVE!* ✅\n\n🤖 *Bot:* Emmanuel-Bot-V4\n👑 *Owner:* Emmanuel\n⚡ *Status:* Online 24/7\n💯 *Uptime:* 100%` })
        }
        if (command === "owner") {
            await sock.sendMessage(from, { text: `*👑 BOT OWNER 👑*\nName: Emmanuel\nBot: EMMANUEL-BOT-V4\nStatus: Real Developer ✅` })
        }
        if (command === "joke") {
            const jokes = ["Why did dev go broke? He used up all his cache! 😂", "My bot no dey sleep! 😴", "Emmanuel na real developer! 🔥"]
            await sock.sendMessage(from, { text: jokes[Math.floor(Math.random()*jokes.length)] })
        }
        if (command === "ai") {
            const q = args.join(" ")
            if (!q) return await sock.sendMessage(from, { text: "Use: .ai who is Ronaldo?" })
            await sock.sendMessage(from, { text: `🤖 You asked: ${q}\n\nI be EMMANUEL-BOT-V4 AI! You be boss! 🔥` })
        }
    })
}

app.get("/", (req, res) => res.send("EMMANUEL-BOT-V4 IS ALIVE ✅ - Go to /logs for pair code"))
app.listen(PORT, () => console.log(`Server on ${PORT}`))

startBot()
