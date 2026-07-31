import Database
    from 'better-sqlite3'

import {
    join
} from 'path'

const db = new Database(join(process.cwd(), 'database.db'))
db.pragma('journal_mode = WAL')
db.pragma('synchronous = normal')

try {
    db.prepare("ALTER TABLE users ADD COLUMN last_crime TEXT DEFAULT '1970-01-01T00:00:00.000Z'").run()
} catch (e) {}
try {
    db.prepare("ALTER TABLE users ADD COLUMN last_work TEXT DEFAULT '1970-01-01T00:00:00.000Z'").run()
} catch (e) {}
try {
    db.prepare("ALTER TABLE users ADD COLUMN last_slut TEXT DEFAULT '1970-01-01T00:00:00.000Z'").run()
} catch (e) {}

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        jid TEXT PRIMARY KEY,
        wallet INTEGER DEFAULT 0,
        bank INTEGER DEFAULT 0,
        last_claim TEXT DEFAULT '1970-01-01T00:00:00.000Z',
        last_crime TEXT DEFAULT '1970-01-01T00:00:00.000Z',
        last_work TEXT DEFAULT '1970-01-01T00:00:00.000Z',
        last_slut TEXT DEFAULT '1970-01-01T00:00:00.000Z'
    );
`)

const normalizeJid = (j) => j ? j.split('@')[0].split(':')[0].trim() + '@s.whatsapp.net' : null

export const database = {
    getUser: async (j) => {
        const c = normalizeJid(j)
        const user = db.prepare('SELECT * FROM users WHERE jid = ?').get(c)
        return user || null
    },
    saveUser: async (j, d) => {
        const c = normalizeJid(j)
        const {
            wallet = 0,
            bank = 0,
            last_claim = '1970-01-01T00:00:00.000Z',
            last_crime = '1970-01-01T00:00:00.000Z',
            last_work = '1970-01-01T00:00:00.000Z',
            last_slut = '1970-01-01T00:00:00.000Z'
        } = d

        db.prepare(`
            INSERT INTO users (jid, wallet, bank, last_claim, last_crime, last_work, last_slut)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(jid) DO UPDATE SET
            wallet = excluded.wallet, bank = excluded.bank,
            last_claim = excluded.last_claim, last_crime = excluded.last_crime,
            last_work = excluded.last_work, last_slut = excluded.last_slut
        `).run(c, wallet, bank, last_claim, last_crime, last_work, last_slut)
    }
}

export const query = async (t, p = []) => {
    const cleanQuery = t.trim().toLowerCase()
    if (cleanQuery.startsWith('select')) {
        return { rows: db.prepare(t).all(...p) }
    } else {
        const res = db.prepare(t).run(...p)
        return { rows: [], ...res }
    }
}
