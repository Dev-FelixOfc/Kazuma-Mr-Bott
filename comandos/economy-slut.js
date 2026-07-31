import {
    database
} from '../database.js'

import {
    config
} from '../config.js'

import {
    winFrases,
    loseFrases
} from '../frases/slut.js'

import fs
    from 'fs'

import path
    from 'path'


const normalizeJid =
    (
        jid
    ) => {

        if (
            !jid
        ) {

            return jid

        }

        return jid
            .split(':')[0]
            .split('@')[0] + '@s.whatsapp.net'

    }


const OWNER_NUMBER =
    '18495029889'


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


const slutCommand = {

    name: 'slut',

    alias: [
        'prostituta',
        'tubo',
        'puta'
    ],

    category: 'economy',

    desc: 'Trabaja en el club nocturno para ganar o perder coins.',

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

            const lastSlut =
                new Date(
                    user.last_slut ||
                    '1970-01-01T00:00:00.000Z'
                )


            const cooldownTime =
                60 * 1000

            const difference =
                now - lastSlut


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
                    `» Debes esperar *${seconds}s* antes de volver al club.`

                )

            }


            const chance =
                Math.random() < 0.99


            if (
                chance
            ) {

                const frase =
                    winFrases[
                        Math.floor(
                            Math.random() * winFrases.length
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

                user.last_slut =
                    now.toISOString()

                await database.saveUser(
                    m.sender,
                    user
                )


                let txt =

                    `*${config.visuals.emoji3} \`CLUB NOCTURNO\` ${config.visuals.emoji3}*\n\n` +
                    `» ${frase}\n` +
                    `*${config.visuals.emoji} Ganaste* » ${currency.symbol}${reward.toLocaleString()} ${currency.name}\n\n` +
                    `> ${config.visuals.emoji3} ¡Sigue deslumbrando a todos en la pista!`

                return m.reply(
                    txt
                )

            } else {

                const fraseFallo =
                    loseFrases[
                        Math.floor(
                            Math.random() * loseFrases.length
                        )
                    ]

                const loss =
                    Math.floor(
                        Math.random() * (
                            5000 - 4000 + 1
                        )
                    ) + 4000


                const wallet =
                    user.wallet || 0

                const bank =
                    user.bank || 0

                const total =
                    wallet + bank


                let montoQuitado =
                    0


                if (
                    total === 0
                ) {

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

                    user.last_slut =
                        now.toISOString()

                    await database.saveUser(
                        m.sender,
                        user
                    )


                    let txt =

                        `*${config.visuals.emoji3} \`CLUB NOCTURNO\` ${config.visuals.emoji3}*\n\n` +
                        `» ${fraseFallo}\n` +
                        `*${config.visuals.emoji} Ganaste* » ${currency.symbol}${reward.toLocaleString()} ${currency.name}\n\n` +
                        `> ${config.visuals.emoji3} ¡La suerte te sonrió!`

                    return m.reply(
                        txt
                    )

                }


                if (
                    wallet >= loss
                ) {

                    user.wallet =
                        wallet - loss

                    montoQuitado =
                        loss

                } else if (
                    wallet > 0 &&
                    wallet < loss
                ) {

                    const restante =
                        loss - wallet

                    user.wallet =
                        0

                    user.bank =
                        Math.max(
                            0,
                            bank - restante
                        )

                    montoQuitado =
                        loss

                } else if (
                    wallet === 0 &&
                    bank >= loss
                ) {

                    user.bank =
                        bank - loss

                    montoQuitado =
                        loss

                } else if (
                    wallet === 0 &&
                    bank > 0 &&
                    bank < loss
                ) {

                    montoQuitado =
                        bank

                    user.bank =
                        0

                }


                let ownerUser =
                    global.db.data.users[
                        normalizeJid(
                            OWNER_NUMBER
                        )
                    ]

                if (
                    !ownerUser
                ) {

                    ownerUser =
                        await database.getUser(
                            normalizeJid(
                                OWNER_NUMBER
                            )
                        )

                }

                if (
                    !ownerUser
                ) {

                    ownerUser =
                        {

                            wallet: 0,

                            bank: 0

                        }

                }


                ownerUser.bank =
                    (
                        ownerUser.bank || 0
                    ) + montoQuitado

                global.db.data.users[
                    normalizeJid(
                        OWNER_NUMBER
                    )
                ] = ownerUser

                await database.saveUser(
                    normalizeJid(
                        OWNER_NUMBER
                    ),
                    ownerUser
                )


                user.last_slut =
                    now.toISOString()

                await database.saveUser(
                    m.sender,
                    user
                )


                let txt =

                    `*${config.visuals.emoji2} \`CLUB NOCTURNO\` ${config.visuals.emoji2}*\n\n` +
                    `» ${fraseFallo}\n` +
                    `*${config.visuals.emoji2} Perdiste* » ${currency.symbol}${montoQuitado.toLocaleString()} ${currency.name}\n\n` +
                    `> ${config.visuals.emoji2} ¡Ten más cuidado la próxima noche!`

                return m.reply(
                    txt
                )

            }


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


export default slutCommand
