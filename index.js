// EMMANUEL-BOT-V4 - ULTIMATE FINAL - ALL FEATURES TOGETHER
// QR WEBSITE + AUTO REPLY + ANTI-DELETE + COMMANDS
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');
const express = require('express');
const QRCode = require('qrcode');
const yts = require('yt-search');

const app = express();
let qrData = null;
let isConnected = false;
let messageStore = {};

app.get('/', async (req, res) => {
    if (isConnected) {
        res.send(`<html><body style="text-align:center; font-family:sans-serif; padding:40px; background:#000; color:#0f0;"><h1>✅ EMMANUEL-BOT-V4 CONNECTED! ✅</h1><h2 style="color:white;">Bot is LIVE!</h2><hr><div style="text-align:left; max-width:450px; margin:auto; background:#111; padding:20px; border-radius:10px; color:white;"><h3 style="color:cyan;">🔥 COMMANDS:</h3><p><b>.menu</b> - Show all commands</p><p><b>.ping</b> - Check speed</p><p><b>.alive</b> - Bot status</p><p><b>.owner</b> - Owner info</p><p><b>.song [name]</b> - Search song</p><p><b>.play [name]</b> - Play music</p><p><b>.sticker</b> - Image to sticker</p><h3 style="color:cyan;">💬 AUTO REPLY:</h3><p>Bot auto replies to: hello, hi, hey, thanks, ANY message!</p><h3 style="color:cyan;">🚫 ANTI-DELETE:</h3><p>Bot catches deleted messages & recovers them!</p></div><p style="color:white;">Test: Use another phone send .menu to your number!</p></body></html>`);
    } else if (qrData) {
        try {
            const qrImage = await QRCode.toDataURL(qrData);
            res.send(`<html><body style="text-align:center; padding:30px; background:black; color:white;"><h1 style="color:cyan;">EMMANUEL-BOT-V4 QR</h1><p>WhatsApp > Settings > Linked devices > Link a device</p><img src="${qrImage}" style="width:350px; border:5px solid cyan;"><br><br><p style="color:red;">QR expires 30sec - Auto refresh</p><script>setTimeout(()=>location.reload(),25000)</script></body></html>`);
        } catch (e) { res.send('Error: ' + e.message); }
    } else {
        res.send('<html><body style="text-align:center; padding:50px; background:black; color:cyan;"><h1>⏳ EMMANUEL-BOT-V4 Starting... Refresh in 5 sec</h1><script>setTimeout(()=>location.reload(),5000)</script></body></html>');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`EMMANUEL-BOT-V4 Website running on ${PORT}`));

async function startBot() {
    console.log("Starting EMMANUEL-BOT-V4 ULTIMATE...");
    if (process.env.SESSION_ID) {
        try {
            const creds = JSON.parse(Buffer.from(process.env.SESSION_ID, 'base64').toString());
            if (!fs.existsSync('./auth_info_baileys')) fs.mkdirSync('./auth_info_baileys', { recursive: true });
            fs.writeFileSync('./auth_info_baileys/creds.json', JSON.stringify(creds, null, 2));
            console.log("Session restored!");
        } catch (e) { console.log("No SESSION_ID, QR will show on website"); }
    }
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), printQRInTerminal: false, browser: ["EMMANUEL-BOT-V4", "Chrome", "4.0"] });
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            try {
                const { key, update: upd } = update;
                if (upd && upd.message && upd.message.protocolMessage && upd.message.protocolMessage.type === 0) {
                    const deletedKey = upd.message.protocolMessage.key;
                    const originalId = deletedKey.id;
                    const from = deletedKey.remoteJid;
                    const savedMsg = messageStore[originalId];
                    if (savedMsg) {
                        const deleter = key.participant || key.remoteJid;
                        const isGroup = from.endsWith('@g.us');
                        let antiDeleteText = `*🚫 ANTI-DELETE - EMMANUEL-BOT-V4 🚫*\n\n*Someone deleted a message!*\n\n`;
                        if (isGroup) {
                            antiDeleteText += `*Group:* ${from}\n*Deleter:* @${deleter.split('@')[0]}\n\n`;
                        } else {
                            antiDeleteText += `*Chat:* Private\n*Deleter:* @${deleter.split('@')[0]}\n\n`;
                        }
                        antiDeleteText += `*Deleted Message:*\n${savedMsg.text || 'Media'}\n\n*Time:* ${new Date().toLocaleString()}\n*EMMANUEL-BOT-V4 ✅*`;
                        await sock.sendMessage(from, { text: antiDeleteText, mentions: [deleter] });
                        if (savedMsg.hasMedia && savedMsg.buffer) {
                            try {
                                if (savedMsg.type === 'image') await sock.sendMessage(from, { image: savedMsg.buffer, caption: `*🚫 Deleted Image Recovered by EMMANUEL-BOT-V4*` });
                                else if (savedMsg.type === 'video') await sock.sendMessage(from, { video: savedMsg.buffer, caption: `*🚫 Deleted Video Recovered*` });
                            } catch (e) {}
                        }
                    }
                }
            } catch (e) { console.log("Anti-delete error:", e); }
        }
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) { qrData = qr; isConnected = false; console.log("QR Generated - Check Website!"); }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) { qrData = null; isConnected = false; startBot(); }
        } else if (connection === 'open') { console.log('✅ EMMANUEL-BOT-V4 CONNECTED!'); isConnected = true; qrData = null; }
    });

    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;
            const from = msg.key.remoteJid;
            if (from === 'status@broadcast') return;
            const type = Object.keys(msg.message)[0];
            const body = (type === 'conversation') ? msg.message.conversation : (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text : (type === 'imageMessage' && msg.message.imageMessage.caption) ? msg.message.imageMessage.caption : (type === 'videoMessage' && msg.message.videoMessage.caption) ? msg.message.videoMessage.caption : "";
            if (!body) return;
            console.log(`Message: ${body} | From: ${from}`);

            try {
                messageStore[msg.key.id] = {
                    text: body, from: from, sender: msg.key.participant || from,
                    timestamp: Date.now(), type: type,
                    hasMedia: type === 'imageMessage' || type === 'videoMessage', buffer: null
                };
                if (type === 'imageMessage' || type === 'videoMessage') {
                    try {
                        const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: P({level:'silent'}), reuploadRequest: sock.updateMediaMessage });
                        messageStore[msg.key.id].buffer = buffer;
                    } catch (e) {}
                }
                const keys = Object.keys(messageStore);
                if (keys.length > 100) delete messageStore[keys[0]];
            } catch (e) {}

            const prefix = ".";
            const isCommand = body.startsWith(prefix);

            if (!isCommand) {
                const lower = body.toLowerCase();
                if (lower.includes('hello') || lower === 'hi' || lower.includes('hey')) {
                    await sock.sendMessage(from, { text: `*👋 Hello! I'm EMMANUEL-BOT-V4! 🤖*\n\nI'm online and active!\n\nType *.menu* to see my commands!\n\n*V4 | LIVE ✅*` });
                    return;
                }
                if (lower.includes('thank')) {
                    await sock.sendMessage(from, { text: `*You're welcome! 😊 - EMMANUEL-BOT-V4*` });
                    return;
                }
                await sock.sendMessage(from, { text: `*🤖 EMMANUEL-BOT-V4 HERE!*\n\nYou said: "${body}"\n\nI'm your WhatsApp assistant!\n\n*Type .menu for all commands!*` });
                return;
            }

            const args = body.slice(prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();
            const q = args.join(" ");

            if (command === 'menu' || command === 'help') {
                await sock.sendMessage(from, { text: `*🤖 EMMANUEL-BOT-V4 MENU 🤖*\n\n*🔥 MAIN:*\n- .menu\n- .ping\n- .alive\n- .owner\n\n*🎵 MUSIC:*\n- .song [name]\n- .play [name]\n- .video [name]\n\n*🛠️ TOOLS:*\n- .sticker\n\n*💬 AUTO REPLY:* hello, hi, thanks, ANY message\n\n*🚫 ANTI-DELETE:* catches deleted messages\n\n*V4 | ONLINE ✅*` });
            }
            else if (command === 'ping') {
                const start = Date.now();
                await sock.sendMessage(from, { text: '*Testing...*' });
                await sock.sendMessage(from, { text: `*🏓 PONG!*\n*Speed:* ${Date.now() - start}ms\n*EMMANUEL-BOT-V4: Active ✅*` });
            }
            else if (command === 'alive') {
                await sock.sendMessage(from, { text: `*🤖 EMMANUEL-BOT-V4 ALIVE! ✅*\n\n*Version:* V4 Ultimate\n*Status:* ONLINE\n*Uptime:* ${Math.floor(process.uptime()/60)} min\n*Features:* QR Website, Auto Reply, Anti-Delete, Music\n\n*Type .menu*` });
            }
            else if (command === 'owner') {
                await sock.sendMessage(from, { text: `*👑 EMMANUEL-BOT-V4 OWNER*\n\n*Bot:* EMMANUEL-BOT-V4\n*Developer:* Emmanuel\n*Status:* Active ✅` });
            }
            else if (command === 'song' || command === 'play' || command === 'video') {
                if (!q) return await sock.sendMessage(from, { text: `*Example:* .song Faded Alan Walker` });
                await sock.sendMessage(from, { text: `*🎵 Searching ${q}...*` });
                try {
                    const search = await yts(q);
                    const video = search.videos[0];
                    if (!video) return await sock.sendMessage(from, { text: `No result for ${q}` });
                    await sock.sendMessage(from, { text: `*🎵 FOUND*\n\n*Title:* ${video.title}\n*Duration:* ${video.timestamp}\n*Views:* ${video.views}\n*Url:* ${video.url}` });
                } catch (e) { await sock.sendMessage(from, { text: `Error: ${e.message}` }); }
            }
            else if (command === 'sticker' || command === 's') {
                await sock.sendMessage(from, { text: `*Sticker:* Send image with caption .sticker` });
            }
            else {
                await sock.sendMessage(from, { text: `*Unknown: ${command}*\nType *.menu*` });
            }
        } catch (e) { console.log("Handler Error:", e); }
    });
}
startBot();
