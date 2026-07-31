import { 
    makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore, 
    DisconnectReason,
    Browsers,
    downloadMediaMessage,
    jidNormalizedUser
} from 'todleys'

import P from 'pino'
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createInterface } from 'readline'
import chalk from 'chalk'
import CFonts from 'cfonts'
import NodeCache from 'node-cache'

import { config } from './config.js'
import { logger } from './config/print.js'
import { pixelHandler } from './pixel.js'
import { database } from './database.js'
import { loadAllSubBots } from './sockets/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const rl = createInterface({ input: process.stdin, output: process.stdout })

global.commands = new Map()
global.lastMessageMap = new Map()
let startTime = Date.now()
let botPrincipalActivo = false
let subBotsCargados = false
let intentosReconexion = 0
const MAX_INTENTOS = 10

const MAIN_NUMBER = '18294614502'
const msgRetryCounterCache = new NodeCache()

const tmpDir = path.join(__dirname, 'tmp')
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

setInterval(() => {
    try {
        const files = fs.readdirSync(tmpDir)
        const now = Date.now()
        for (const file of files) {
            const filePath = path.join(tmpDir, file)
            const stat = fs.statSync(filePath)
            if (now - stat.mtimeMs > 5 * 60 * 1000) {
                fs.unlinkSync(filePath)
            }
        }
    } catch (e) {}
}, 60 * 1000)

global.db = {
    data: {
        chats: {},
        users: {},
        characters: {},
        settings: {}
    }
}

const loadCommandsRecursive = async (dir, commandsMap) => {
    const items = fs.readdirSync(dir)

    for (const item of items) {
        const itemPath = path.join(dir, item)
        const stat = fs.statSync(itemPath)

        if (stat.isDirectory()) {
            await loadCommandsRecursive(itemPath, commandsMap)
        } else if (item.endsWith('.js')) {
            try {
                const fileUrl = pathToFileURL(itemPath).href
                const module = await import(`${fileUrl}?update=${Date.now()}`)
                if (module.default && module.default.name) {
                    commandsMap.set(module.default.name.toLowerCase(), module.default)
                    if (module.default.alias && Array.isArray(module.default.alias)) {
                        for (const alias of module.default.alias) {
                            if (!commandsMap.has(alias)) {
                                commandsMap.set(alias.toLowerCase(), module.default)
                            }
                        }
                    }
                }
            } catch (err) {
                console.error(chalk.red(`Error cargando comando ${itemPath}:`), err)
            }
        }
    }
}

global.loadCommands = async () => {
    const commandsPath = path.resolve(__dirname, 'comandos')
    if (!fs.existsSync(commandsPath)) {
        fs.mkdirSync(commandsPath, { recursive: true })
    }
    global.commands.clear()
    await loadCommandsRecursive(commandsPath, global.commands)
    console.log(chalk.green(`[COMANDOS] Cargados ${global.commands.size} comandos`))
}

async function startBot() {
    const sessionDir = path.join('./sessions/main', MAIN_NUMBER)
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
    const { version } = await fetchLatestBaileysVersion()

    const conn = makeWASocket({
        version,
        printQRInTerminal: false,
        logger: P({ level: 'silent' }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })),
        },
        browser: Browsers.ubuntu('Chrome'),
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        msgRetryCounterCache,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        defaultQueryTimeoutMs: undefined,
        shouldIgnoreJid: jid => isNaN(jid.split('@')[0]),
        getMessage: async (key) => { return null }
    })

    conn.getAdminStatus = async (groupJid, senderJid) => {
        const botJid = conn.authState?.creds?.me?.id
        const meta = await conn.groupMetadata(groupJid).catch(() => null)
        if (!meta || !Array.isArray(meta.participants)) {
            return { isAdmin: false, isBotAdmin: false }
        }
        const normalize = (j) => j.split('@')[0].split(':')[0]
        const senderNorm = normalize(senderJid)
        const botNorm = normalize(botJid)
        const isAdmin = meta.participants.some(p => normalize(p.id || p.jid) === senderNorm && (p.admin === 'admin' || p.admin === 'superadmin'))
        const isBotAdmin = meta.participants.some(p => normalize(p.id || p.jid) === botNorm && (p.admin === 'admin' || p.admin === 'superadmin'))
        return { isAdmin, isBotAdmin }
    }

    await global.loadCommands()

    if (!conn.authState.creds.registered) {
        setTimeout(async () => {
            let phoneNumber = MAIN_NUMBER.replace(/[^0-9]/g, '')
            try {
                let code = await conn.requestPairingCode(phoneNumber)
                code = code?.match(/.{1,4}/g)?.join('-') || code
                console.log(chalk.black.bgCyan(`\n  CODIGO DE VINCULACIÓN: ${code}  \n`))
            } catch (error) {
                console.error('Error al generar código:', error)
            }
        }, 3000)
    }

    conn.ev.on('creds.update', saveCreds)

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode
            const errorMsg = lastDisconnect?.error?.message || ''

            if (statusCode === 408 || errorMsg.includes('conflict')) {
                console.log(chalk.yellow('[!] Conflicto en bot principal, esperando 30s...'))
                botPrincipalActivo = false
                setTimeout(() => {
                    intentosReconexion = 0
                    startBot()
                }, 30000)
                return
            }

            if (statusCode === DisconnectReason.loggedOut) {
                console.log(chalk.red('[!] Sesión principal cerrada. Los sub-bots siguen activos.'))
                botPrincipalActivo = false
            } else {
                console.log(chalk.yellow('[!] Bot principal desconectado. Los sub-bots siguen activos.'))
                botPrincipalActivo = false
                if (intentosReconexion < MAX_INTENTOS) {
                    intentosReconexion++
                    console.log(chalk.yellow(`[SISTEMA] Intento ${intentosReconexion}/${MAX_INTENTOS} de reconexión...`))
                    setTimeout(() => {
                        startBot()
                    }, 5000 * intentosReconexion)
                } else {
                    console.log(chalk.red('[SISTEMA] Máximo de intentos alcanzado. El bot principal permanecerá caído. Los sub-bots siguen activos.'))
                }
            }
        } else if (connection === 'open') {
            botPrincipalActivo = true
            intentosReconexion = 0
            
            process.stdout.write('\x1Bc')
            
            CFonts.say('KAZUMA', {
                font: 'block',
                align: 'center',
                colors: ['cyan', 'magenta']
            })
            
            console.log(chalk.greenBright.bold(`\n  [✨] KAZUMA CONECTADO!`))
            console.log(chalk.green(`  [⌚] Tiempo de carga: ${((Date.now() - startTime) / 1000).toFixed(2)}s`))

            if (!subBotsCargados) {
                subBotsCargados = true
                console.log(chalk.blue('[SISTEMA] Cargando sub-bots...'))
                loadAllSubBots(null).catch(e => console.error('[SUB-BOTS] Error:', e))
                console.log(chalk.green('[SISTEMA] Sub-bots cargados exitosamente.'))
            }
            
            console.log(chalk.magenta(`  [📋] Comandos: ${global.commands.size}`))
        }
    })

    conn.ev.on('messages.upsert', async (chatUpdate) => {
        if (!botPrincipalActivo) return
        if (chatUpdate.type !== 'notify') return

        const m = chatUpdate.messages[0]
        if (!m || !m.message) return
        if (m.key.remoteJid === 'status@broadcast') return

        const messageTimestamp = (m.messageTimestamp?.low || m.messageTimestamp || Date.now()) * 1000
        if ((Date.now() - messageTimestamp) > 180000) return

        m.chat = jidNormalizedUser(m.key.remoteJid)
        m.sender = jidNormalizedUser(m.key.participant || m.key.remoteJid)
        const isGroup = m.chat.endsWith('@g.us')

        let dbUser = await database.getUser(m.sender)
        if (!dbUser) {
            dbUser = { wallet: 0, bank: 0, genre: 'No definido', marry: null, last_claim: '1970-01-01T00:00:00.000Z', last_crime: '1970-01-01T00:00:00.000Z', last_work: '1970-01-01T00:00:00.000Z', last_slut: '1970-01-01T00:00:00.000Z', last_flip: '1970-01-01T00:00:00.000Z', last_rob: '1970-01-01T00:00:00.000Z' }
            await database.saveUser(m.sender, dbUser)
        }
        global.db.data.users[m.sender] = dbUser

        if (isGroup) {
            let dbChat = await database.getChat(m.chat)
            if (!dbChat) {
                dbChat = { welcome: 1 }
                await database.saveChat(m.chat, dbChat)
            }
            global.db.data.chats[m.chat] = dbChat
        }

        global.lastMessageMap.set(m.sender, Date.now())
        m.reply = async (text) => conn.sendMessage(m.chat, { text }, { quoted: m })
        m.download = async () => downloadMediaMessage(m, 'buffer', {}, { logger: P({ level: 'silent' }) })

        const msgType = Object.keys(m.message)[0]
        const contextInfo = m.message[msgType]?.contextInfo

        if (contextInfo?.quotedMessage) {
            const type = Object.keys(contextInfo.quotedMessage)[0]
            const q = contextInfo.quotedMessage[type]
            m.quoted = {
                type, msg: q, id: contextInfo.stanzaId, mimetype: q?.mimetype || '',
                sender: contextInfo.participant,
                text: q?.text || q?.caption || contextInfo.quotedMessage.conversation || '',
                key: {
                    remoteJid: m.chat,
                    fromMe: contextInfo.participant === (conn.user.id.split(':')[0] + '@s.whatsapp.net'),
                    id: contextInfo.stanzaId, participant: contextInfo.participant
                },
                message: contextInfo.quotedMessage,
                download: async () => downloadMediaMessage({ message: contextInfo.quotedMessage }, 'buffer', {}, { logger: P({ level: 'silent' }) })
            }
        } else {
            m.quoted = null
        }

        logger(m, conn)
        await pixelHandler(conn, m, config)

        try {
            if (global.db.data.users[m.sender]) {
                await database.saveUser(m.sender, global.db.data.users[m.sender])
            }
            if (isGroup && global.db.data.chats[m.chat]) {
                await database.saveChat(m.chat, global.db.data.chats[m.chat])
            }
        } catch (dbErr) {
            console.error(dbErr)
        }
    })

    return conn
}

async function cargarSubBotsIndependientes() {
    console.log(chalk.blue('[SISTEMA] Cargando sub-bots...'))
    try {
        await loadAllSubBots(null)
        subBotsCargados = true
        console.log(chalk.green('[SISTEMA] Sub-bots cargados exitosamente.'))
    } catch (e) {
        console.error(chalk.red('[ERROR] Falló la carga de sub-bots:'), e)
    }
}

async function main() {
    console.log(chalk.blue('[SISTEMA] Iniciando Kazuma Bot...'))

    await cargarSubBotsIndependientes()

    try {
        await startBot()
    } catch (e) {
        console.error(chalk.red('[ERROR] Falló al iniciar el bot principal:'), e)
        console.log(chalk.yellow('[SISTEMA] El bot principal permanecerá caído. Los sub-bots ya están activos.'))
    }

    process.on('SIGINT', () => {
        console.log(chalk.yellow('\n[!] Apagando servidor... Los sub-bots se cerrarán.'))
        process.exit(0)
    })
}

main().catch(console.error)
