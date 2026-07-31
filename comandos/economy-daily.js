import {
    database
} from '../database.js'

import {
    config
} from '../config.js'

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


const dailyCommand = {

    name: 'daily',

    alias: [
        'diario',
        'bono'
    ],

    category: 'economy',

    desc: 'Reclama tu bono diario de coins.',

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

            const lastClaim =
                new Date(
                    user.last_claim ||
                    '1970-01-01T00:00:00.000Z'
                )


            const difference =
                now - lastClaim

            const cooldownTime =
                24 * 60 * 60 * 1000


            if (
                difference < cooldownTime
            ) {

                const timeLeft =
                    cooldownTime - difference

                const hours =
                    Math.floor(
                        timeLeft / (
                            1000 * 60 * 60
                        )
                    )

                const minutes =
                    Math.floor(
                        (
                            timeLeft % (
                                1000 * 60 * 60
                            )
                        ) / (
                            1000 * 60
                        )
                    )

                const seconds =
                    Math.floor(
                        (
                            timeLeft % (
                                1000 * 60
                            )
                        ) / 1000
                    )

                return m.reply(

                    `*${config.visuals.emoji2} ¡ESPERA UN MOMENTO! ${config.visuals.emoji2}*\n\n` +
                    `» Ya has reclamado tu recompensa diaria.\n` +
                    `» Debes esperar *${hours}h ${minutes}m ${seconds}s* para volver a solicitarla.`

                )

            }


            user.last_claim =
                now.toISOString()


            const reward =
                Math.floor(
                    Math.random() * (
                        70000 - 50000 + 1
                    )
                ) + 50000

            user.wallet =
                (
                    user.wallet || 0
                ) + reward


            await database.saveUser(
                m.sender,
                user
            )


            let txt =

                `*${config.visuals.emoji3} \`RECOMPENSA DIARIA\` ${config.visuals.emoji3}*\n\n` +
                `» ¡Has recibido tu bono del día con éxito!\n` +
                `*${config.visuals.emoji} Ganaste* » ${currency.symbol}${reward.toLocaleString()} ${currency.name}\n\n` +
                `> ${config.visuals.emoji3} Vuelve mañana para seguir acumulando riqueza.`

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


export default dailyCommand
