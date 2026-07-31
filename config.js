import fs
    from 'fs'

import path
    from 'path'

export const config = {
    botName: 'Kazuma',
    currency: 'Coins',
    symbol: '¥',
    owner: [
        '84898436221@s.whatsapp.net',
        '125860308893859@lid',
        '18495029889@s.whatsapp.net'
    ],
    support: [
        '50557888080@s.whatsapp.net',
        '51937424405@s.whatsapp.net'
    ],
    prefix: '#',
    allPrefixes: ['#', '!', '.', '/', '~', '?'],

    getBotType: (conn) => {
        const userNumber = conn.user.id.split(':')[0]
        const subBotPath = path.resolve(`./sessions/subbots/${userNumber}`)
        const mainPath = path.resolve(`./sessions/main/${userNumber}`)

        if (fs.existsSync(mainPath)) return '*Main-Bot*'
        if (fs.existsSync(subBotPath)) return '*Sub-Bot*'
        return '*Main-Bot*'
    },

    visuals: {
        line: '━',
        color: 'magenta',
        emoji: '✰',
        emoji2: '❁',
        emoji3: '✿',
        emoji4: '❀',
        img1: 'https://files.evogb.win/yAXVGZ.png'
    }
  }
