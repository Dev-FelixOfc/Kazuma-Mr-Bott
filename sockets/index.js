import {
    makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    Browsers,
    jidNormalizedUser,
    downloadMediaMessage
} from 'todleys'

import P from 'pino'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import NodeCache from 'node-cache'

import { socketLogger } from './print.js'
import { pixelHandler } from '../pixel.js'
import { config } from '../config.js'
import { database } from '../database.js'

const sessionsPath = path.resolve('./sessions/subbots')
if (!fs.existsSync(sessionsPath)) fs.mkdirSync(sessionsPath, { recursive: true })

const msgRetryCounterCache = new NodeCache()
global.subBots = new Map()
const reconectando = new Map()

export const startSubBot = async (userId, mainConn = null) => {
    const jid = jidNormalizedUser(userId)
    const userNumber = jid.split('@')[0]
    const userSessionPath = path.join(sessionsPath, userNumber)

    if (reconectando.has(userNumber)) {
        const lastAttempt = reconectando.get(userNumber)
        if (Date.now() - lastAttempt < 30000) {
            return
        }
    }
    reconectando.set(userNumber, Date.now())

    const { state, saveCreds } = await useMultiFileAuthState(userSessionPath)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        printQRInTerminal: false,
        logger: P({ level: 'silent' }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })),
        },
        browser: Browsers.ubuntu('Chrome'),
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: false,
        msgRetryCounterCache,
        defaultQueryTimeoutMs: undefined,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        shouldIgnoreJid: jid => isNaN(jid.split('@')[0])
    })

    global.subBots.set(jid, sock)

    sock.ev.on('creds.update', async () => {
        await saveCreds()
    })

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update

        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode
            const reason = new Error(lastDisconnect?.error)?.message

            if (code === 408 || (reason && reason.includes('conflict'))) {
                console.log(chalk.yellow(`[SUB-BOT] Conflicto en ${userNumber}, esperando 30s...`))
                setTimeout(() => {
                    reconectando.delete(userNumber)
                    if (global.subBots.has(jid)) {
                        global.subBots.delete(jid)
                    }
                }, 30000)
                return
            }

            if (code !== DisconnectReason.loggedOut) {
                console.log(chalk.yellow(`[SUB-BOT] Reintentando: ${userNumber} | Motivo: ${reason}`))
                setTimeout(() => {
                    reconectando.delete(userNumber)
                    startSubBot(jid, null)
                }, 5000)
            } else {
                console.log(chalk.red(`[SUB-BOT] Sesión terminada: ${userNumber}`))
                global.subBots.delete(jid)
                reconectando.delete(userNumber)
                if (fs.existsSync(userSessionPath)) {
                    fs.rmSync(userSessionPath, { recursive: true, force: true })
                }
            }
        } else if (connection === 'open') {
            reconectando.delete(userNumber)
            console.log(chalk.green(`[SUB-BOT] Nodo Activo: ${userNumber}`))
        }
    })

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            if (chatUpdate.type !== 'notify') return
            let rawMsg = chatUpdate.messages[0]
            if (!rawMsg.message) return
            if (rawMsg.key && rawMsg.key.remoteJid === 'status@broadcast') return

            const m = smsg(sock, rawMsg)

            let dbUser = await database.getUser(m.sender)
            if (!dbUser) {
                dbUser = {
                    wallet: 0,
                    bank: 0,
                    genre: 'No definido',
                    marry: null,
                    birthday: null,
                    last_claim: '1970-01-01T00:00:00.000Z',
                    last_crime: '1970-01-01T00:00:00.000Z',
                    last_work: '1970-01-01T00:00:00.000Z',
                    last_slut: '1970-01-01T00:00:00.000Z',
                    last_flip: '1970-01-01T00:00:00.000Z',
                    last_rob: '1970-01-01T00:00:00.000Z',
                    last_rw: '1970-01-01T00:00:00.000Z',
                    last_claim_pj: '1970-01-01T00:00:00.000Z',
                    last_fish: '1970-01-01T00:00:00.000Z',
                    fish_penalty: 0
                }
                await database.saveUser(m.sender, dbUser)
            }

            if (!global.db) global.db = { data: { users: {}, chats: {} } }
            if (!global.db.data) global.db.data = { users: {}, chats: {} }
            if (!global.db.data.users) global.db.data.users = {}
            global.db.data.users[m.sender] = dbUser

            if (m.isGroup) {
                let dbChat = await database.getChat(m.chat)
                if (!dbChat) {
                    dbChat = { welcome: 1, antilink: 1, detect: 1, warn: 0 }
                    await database.saveChat(m.chat, dbChat)
                }
                if (!global.db.data.chats) global.db.data.chats = {}
                global.db.data.chats[m.chat] = dbChat
            }

            try {
                if (global.db.data.users[m.sender]) {
                    await database.saveUser(m.sender, global.db.data.users[m.sender])
                }
                if (m.isGroup && global.db.data.chats[m.chat]) {
                    await database.saveChat(m.chat, global.db.data.chats[m.chat])
                }
            } catch (dbErr) {
                console.error('[SUB-BOT] Error guardando datos:', dbErr)
            }

            const realOwnerNumber = (typeof config.owner[0] === 'string' ? config.owner[0] : config.owner[0][0]).replace(/\D/g, '')
            const isRealOwner = m.sender.includes(realOwnerNumber) || m.key.fromMe

            if (!m.isGroup && !isRealOwner) {
                const prefixes = config.allPrefixes || ['#', '!', '.']
                const body = m.text || ''
                const foundPrefix = prefixes.find(p => body.startsWith(p))
                const commandName = foundPrefix
                    ? body.slice(foundPrefix.length).trim().split(/ +/).shift().toLowerCase()
                    : body.trim().split(/ +/).shift().toLowerCase()

                const allowedPrivateCmds = ['code', 'codemod', 'setname', 'setbanner']
                if (!allowedPrivateCmds.includes(commandName)) return
            }

            socketLogger(m, sock)
            await pixelHandler(sock, m, config)

        } catch (err) {
            console.error(chalk.red('[ERROR SUB-BOT]'), err)
        }
    })

    return sock
}

function smsg(conn, m) {
    if (!m) return m
    let M = m.key
    if (M) {
        m.chat = jidNormalizedUser(M.remoteJid)
        m.fromMe = M.fromMe
        m.id = M.id
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = jidNormalizedUser(m.fromMe ? conn.user.id : m.participant || m.key.participant || m.chat || '')
    }
    if (m.message) {
        m.mtype = Object.keys(m.message)[0]
        m.body = m.message.conversation || m.message[m.mtype]?.caption || m.message[m.mtype]?.text || (m.mtype === 'listResponseMessage') && m.message[m.mtype]?.singleSelectReply?.selectedRowId || (m.mtype === 'buttonsResponseMessage') && m.message[m.mtype]?.selectedButtonId || (m.mtype === 'templateButtonReplyMessage') && m.message[m.mtype]?.selectedId || m.message[m.mtype] || ''
        m.text = typeof m.body === 'string' ? m.body : ''

        let quoted = m.message[m.mtype]?.contextInfo?.quotedMessage || null
        if (quoted) {
            let qMtype = Object.keys(quoted)[0]
            m.quoted = quoted[qMtype]
            if (typeof m.quoted === 'string') m.quoted = { text: m.quoted }
            m.quoted.mtype = qMtype
            m.quoted.id = m.message[m.mtype].contextInfo.stanzaId
            m.quoted.chat = jidNormalizedUser(m.message[m.mtype].contextInfo.remoteJid || m.chat)
            m.quoted.isGroup = m.quoted.chat.endsWith('@g.us')
            m.quoted.sender = jidNormalizedUser(m.message[m.mtype].contextInfo.participant)
            m.quoted.fromMe = m.quoted.sender === jidNormalizedUser(conn.user && conn.user.id)
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.contentText || ''
            m.quoted.download = () => downloadMediaMessage({ message: quoted }, 'buffer', {}, { logger: P({ level: 'silent' }) })
        } else {
            m.quoted = null
        }
    }
    m.reply = (text) => conn.sendMessage(m.chat, { text }, { quoted: m })
    m.download = () => downloadMediaMessage(m, 'buffer', {}, { logger: P({ level: 'silent' }) })
    return m
}

export const loadAllSubBots = async (mainConn) => {
    if (!fs.existsSync(sessionsPath)) return
    const sessions = fs.readdirSync(sessionsPath)
    console.log(chalk.blue(`[SISTEMA] Reanudando ${sessions.length} sub-bots...`))
    for (const num of sessions) {
        if (num.includes('.') || isNaN(num)) continue
        const sessionPath = path.join(sessionsPath, num)
        if (!fs.existsSync(path.join(sessionPath, 'creds.json'))) {
            console.log(chalk.yellow(`[SUB-BOT] Carpeta ${num} sin creds.json, eliminando...`))
            fs.rmSync(sessionPath, { recursive: true, force: true })
            continue
        }
        const jid = `${num}@s.whatsapp.net`
        await new Promise(resolve => setTimeout(resolve, 3000))
        startSubBot(jid, null)
    }
}

export const restartAllSubBots = async () => {
    console.log(chalk.yellow('[SUB-BOT] Reiniciando todos los sub-bots...'))
    for (const [jid, sock] of global.subBots.entries()) {
        try {
            await sock.logout()
        } catch (e) {}
        global.subBots.delete(jid)
    }
    await loadAllSubBots(null)
}
