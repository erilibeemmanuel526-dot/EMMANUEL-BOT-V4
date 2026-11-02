const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys")
const P = require("pino")

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth")
  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P().child({})),
    },
    logger: P({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["EMMANUEL-BOT-V4", "Chrome", "1.0.0"]
  })

  sock.ev.on("creds.update", saveCreds)

  if (!sock.authState.creds.registered) {
    const phoneNumber = (process.env.PHONE_NUMBER || "").replace(/[^0-9]/g, "")
    console.log("PHONE_NUMBER FROM ENV:", phoneNumber)
    if (phoneNumber) {
      await new Promise(r => setTimeout(r, 3000))
      try {
        const code = await sock.requestPairingCode(phoneNumber)
        console.log("\n====================================")
        console.log("YOUR PAIR CODE:", code)
        console.log("====================================\n")
      } catch (e) {
        console.log("PAIR CODE ERROR:", e.message)
      }
    }
  }

  sock.ev.on("connection.update", (u) => {
    console.log("CONNECTION:", u)
  })
}

startBot()
