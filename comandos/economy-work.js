import {
    database
} from '../database.js'

import {
    config
} from '../config.js'

import {
    workFrases
} from '../frases/work.js'

import fs
    from 'fs'

import path
    from 'path'


const getCurrency =
    (
        conn
    ) => {

        try {

            const botNumber =
                conn.user.id
                    .split(':')[0]
                    .replace(
                        /\D/g,
                        ''
                    )

            const mainPath =
                path.resolve(
                    `./sessions/main/${botNumber}/settings.json`
                )

            const subPath =
                path.resolve(
                    `./sessions/subbots/${botNumber}/settings.json`
                )


            let settingsPath =
                ''

            if (
                fs.existsSync(
                    mainPath
                )
            ) {

                settingsPath =
                    mainPath

            } else if (
                fs.existsSync(
                    subPath
                )
            ) {

                settingsPath =
                    subPath

            }


            if (
                settingsPath &&
                fs.existsSync(
                    settingsPath
                )
            ) {

                const settings =
                    JSON.parse(
                        fs.readFileSync(
                            settingsPath,
                            'utf-8'
                        )
                    )

                if (
                    settings.currency
                ) {

                    return {

                        symbol:
                            settings.currency.symbol ||
                            config.symbol,

                        name:
                            settings.currency.name ||
                            config.currency

                    }

                }

            }


            return {

                symbol:
                    config.symbol,

                name:
                    config.currency

            }

        } catch (
            e
        ) {

            return {

                symbol:
                    config.symbol,

                name:
                    config.currency

            }

        }

    }


const workCommand = {

    name: 'work',

    alias: [
        'w',
        'trabajar',
        'chamba'
    ],

    category: 'economy',

    desc: 'Realiza un trabajo del mundo real para ganar coins.',

    noPrefix: false,

    run: async (
        conn,
        m,
        args,
        usedPrefix,
        commandName,
        text
    ) => {

        try {

            const currency =
                getCurrency(
                    conn
                )

            const user =
                global.db.data.users[m.sender]

            const now =
                new Date()

            const lastWork =
                new Date(
                    user.last_work ||
                    '1970-01-01T00:00:00.000Z'
                )


            const cooldownTime =
                60 * 1000

            const difference =
                now - lastWork


            if (
                difference < cooldownTime
            ) {

                const timeLeft =
                    cooldownTime - difference

                const seconds =
                    Math.floor(
                        timeLeft / 1000
                    )

                return m.reply(

                    `*${config.visuals.emoji2} ¡ESPERA UN MOMENTO! ${config.visuals.emoji2}*\n\n` +
                    `» Debes esperar *${seconds}s* antes de volver a trabajar.`

                )

            }


            user.last_work =
                now.toISOString()


            const frase =
                workFrases[
                    Math.floor(
                        Math.random() * workFrases.length
                    )
                ]

            const reward =
                Math.floor(
                    Math.random() * (
                        25000 - 15000 + 1
                    )
                ) + 15000


            user.wallet =
                (
                    user.wallet || 0
                ) + reward

            await database.saveUser(
                m.sender,
                user
            )


            let txt =

                `*${config.visuals.emoji3} \`JORNADA LABORAL\` ${config.visuals.emoji3}*\n\n` +
                `» ${frase}\n` +
                `*${config.visuals.emoji} Ganaste* » ${currency.symbol}${reward.toLocaleString()} ${currency.name}\n\n` +
                `> ${config.visuals.emoji3} El esfuerzo rinde frutos, ¡sigue trabajando duro!`

            return m.reply(
                txt
            )


        } catch (
            e
        ) {

            console.error(
                e
            )

            m.reply(
                'Ocurrió un error interno al procesar el comando.'
            )

        }

    }

}


export default workCommand
