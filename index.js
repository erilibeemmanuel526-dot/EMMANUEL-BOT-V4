const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const express = require("express")
const app = express()
const PORT = process.env.PORT || 10000
const PREFIX = "."

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth")
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ["EMMANUEL-BOT-V4", "Chrome", "1.0"]
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) startBot()
        } else if (connection === "open") {
            console.log("✅ EMMANUEL-BOT-V4 CONNECTED!")
        }
    })

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return
        
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || ""
        if (!body.startsWith(PREFIX)) return

        const args = body.slice(1).trim().split(/ +/)
        const command = args.shift().toLowerCase()
        const from = msg.key.remoteJid

        // PING
        if (command === "ping") {
            await sock.sendMessage(from, { text: `🏓 *Pong!* _EMMANUEL-BOT-V4_ is Active ⚡\nSpeed: ${Date.now() - msg.messageTimestamp * 1000}ms` })
        }
        // MENU
        if (command === "menu") {
            await sock.sendMessage(from, { text: `*🤖 EMMANUEL-BOT-V4 MENU 🤖*\n\n*MAIN:*\n.ping - Check speed\n.alive - Bot status\n.menu - This list\n\n*FUN:*\n.sticker - Reply to photo with .sticker to make sticker\n.owner - Show owner\n.joke - Random joke\n\n*AI:*\n.ai + question - Chat with AI\n\n*MEDIA:*\n.play + song name - Search song (soon)\n\n*Creator: Emmanuel - Real Dev!* 🔥` })
        }
        // ALIVE
        if (command === "alive") {
            await sock.sendMessage(from, { text: `*EMMANUEL-BOT-V4 IS ALIVE!* ✅\n\n🤖 *Bot:* Emmanuel-Bot-V4\n👑 *Owner:* Emmanuel\n⚡ *Status:* Online 24/7\n🌐 *Host:* Render + UptimeRobot\n💯 *Uptime:* 100%\n\n_Type .menu for commands_` })
        }
        // OWNER
        if (command === "owner") {
            await sock.sendMessage(from, { text: `*👑 BOT OWNER 👑*\n\n*Name:* Emmanuel\n*Bot:* EMMANUEL-BOT-V4\n*Status:* Real Bot Developer ✅\n*Contact:* wa.me/${sock.user.id.split(":")[0]}` })
        }
        // STICKER
        if (command === "sticker" || command === "s") {
            const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage
            const imageMsg = quoted?.imageMessage || msg.message.imageMessage
            if (imageMsg) {
                await sock.sendMessage(from, { text: "⏳ Creating sticker..." })
                // Simple sticker - Baileys will auto convert
                await sock.sendMessage(from, { sticker: { url: imageMsg.url || "" } } , { quoted: msg }).catch(async () => {
                    await sock.sendMessage(from, { text: "❌ Reply to an image with .sticker. Send image then reply .sticker" })
                })
            } else {
                await sock.sendMessage(from, { text: "📸 *How to use .sticker:*\n1. Send a photo\n2. Reply that photo with .sticker" })
            }
        }
        // JOKE
        if (command === "joke") {
            const jokes = ["Why did the developer go broke? Because he used up all his cache! 😂", "My bot no dey sleep, but I dey sleep! 😴", "Emmanuel na real developer now! 🔥"]
            await sock.sendMessage(from, { text: jokes[Math.floor(Math.random()*jokes.length)] })
        }
        // AI
        if (command === "ai") {
            const q = args.join(" ")
            if (!q) return await sock.sendMessage(from, { text: "❓ Use: .ai who is Ronaldo?" })
            await sock.sendMessage(from, { text: `🤖 *AI Thinking...*\n\nYou asked: ${q}\n\nThis is EMMANUEL-BOT-V4 AI! I'm working! Soon I go connect real ChatGPT. But for now, I know say you be boss! 🔥` })
        }
    })
}

app.get("/", (req, res) => res.send("EMMANUEL-BOT-V4 IS ALIVE - 24/7 - 100% Uptime ✅"))
app.listen(PORT, () => console.log(`Server on ${PORT}`))

startBot()
