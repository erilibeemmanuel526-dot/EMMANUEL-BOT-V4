const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')

const BOT_NAME = '❄️🌹 EMMANUEL-BOT-V4 🌹❄️'
const OWNER = '234913714241'

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    browser: [BOT_NAME, 'Chrome', '1.0']
  })
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if(connection === 'close'){
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      if(shouldReconnect) start()
    }
    if(connection === 'open') console.log(BOT_NAME + ' Connected')
  })
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if(!msg.message || msg.key.fromMe) return
    const from = msg.key.remoteJid
    const sender = msg.key.participant || from
    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim()
    const lower = text.toLowerCase()
    const isOwner = sender.includes(OWNER) || from.includes(OWNER)

    if(lower === '.menu'){
      await sock.sendMessage(from, { text: `┌─ ${BOT_NAME} ─┐\n│ .menu - menu\n│ .ping - speed\n│ .alive - check bot\n│ .owner - owner only\n└───────────────` })
    }
    if(lower === '.ping'){
      await sock.sendMessage(from, { text: `Pong! 🏓 ${BOT_NAME} Fast!` })
    }
    if(lower === '.alive'){
      await sock.sendMessage(from, { text: `✅ ${BOT_NAME} is Alive!` })
    }
    if(lower === '.owner'){
      if(!isOwner){
        await sock.sendMessage(from, { text: `❌ Owner only!\nCreate Your Free Bot: https://wa.me/${OWNER}` })
        return
      }
      await sock.sendMessage(from, { text: `✅ Yes Boss! ${BOT_NAME} at your service!` })
    }
  })
}
start()
