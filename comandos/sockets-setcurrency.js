import {
    config
} from '../config.js'

import fs
    from 'fs-extra'

import path
    from 'path'


const setCurrency = {

    name: 'setcurrency',

    alias: [
        'setcoin',
        'moneda',
        'setmoney'
    ],

    category: 'sockets',

    desc: 'Configura el símbolo y nombre de la moneda para tu socket.',

    noPrefix: false,

    run: async (
        conn,
        m,
        args
    ) => {

        try {

            const from =
                m.chat

            const senderNumber =
                m.sender
                    .split('@')[0]
                    .split(':')[0]

            const botNumber =
                conn.user.id
                    .split(':')[0]
                    .replace(
                        /\D/g,
                        ''
                    )


            if (
                senderNumber !== botNumber
            ) {

                return await conn.sendMessage(

                    from,

                    {

                        text:

                            `*${config.visuals.emoji2} \`ACCESO DENEGADO\` ${config.visuals.emoji2}*\n\n` +
                            `» Solo el dueño de esta sesión puede modificar su propia moneda.\n\n` +
                            `> El número del bot es *${botNumber}* y tú eres *${senderNumber}*.`

                    },

                    {

                        quoted:
                            m

                    }

                )

            }


            const subSessionsPath =
                path.resolve(
                    './sessions/subbots'
                )

            const mainSessionsPath =
                path.resolve(
                    './sessions/main'
                )


            const isSubBot =
                await fs.pathExists(
                    path.join(
                        subSessionsPath,
                        botNumber
                    )
                )

            const isMainBot =
                await fs.pathExists(
                    path.join(
                        mainSessionsPath,
                        botNumber
                    )
                )


            if (
                !isSubBot &&
                !isMainBot
            ) {

                return await conn.sendMessage(

                    from,

                    {

                        text:

                            `*${config.visuals.emoji2} \`Comando exclusivo\` ${config.visuals.emoji2}*\n\n` +
                            `» Este comando solo está disponible para Sockets (SubBot).\n\n` +
                            `> El bot principal no puede modificar su moneda desde este comando.`

                    },

                    {

                        quoted:
                            m

                    }

                )

            }


            const fullText =
                args.join(
                    ' '
                )

            if (
                !fullText ||
                !fullText.includes(
                    '/'
                )
            ) {

                return m.reply(

                    `*${config.visuals.emoji2}* Uso: #setcurrency Símbolo/Nombre\n` +
                    `Ejemplo: #setcurrency $/Dólares`

                )

            }


            let [
                symbol,
                ...namePart
            ] =
                fullText.split(
                    '/'
                )

            const currencySymbol =
                symbol.trim()

            const currencyName =
                namePart.join(
                    '/'
                ).trim()


            if (
                currencySymbol.length > 3
            ) {

                return m.reply(
                    `*${config.visuals.emoji2}* El símbolo es demasiado largo (máximo 3 caracteres).`
                )

            }


            let userSettingsPath =
                ''

            if (
                isMainBot
            ) {

                userSettingsPath =
                    path.join(
                        mainSessionsPath,
                        botNumber,
                        'settings.json'
                    )

            } else if (
                isSubBot
            ) {

                userSettingsPath =
                    path.join(
                        subSessionsPath,
                        botNumber,
                        'settings.json'
                    )

            }


            let localConfig =
                (
                    await fs.pathExists(
                        userSettingsPath
                    )
                ) ?
                await fs.readJson(
                    userSettingsPath
                ) :
                {}


            localConfig.currency =
                {

                    symbol:
                        currencySymbol,

                    name:
                        currencyName

                }

            localConfig.lastUpdate =
                Date.now()


            await fs.writeJson(
                userSettingsPath,
                localConfig,
                {

                    spaces: 2

                }
            )


            await m.reply(

                `*${config.visuals.emoji3} \`ECONOMÍA SOCKET\` ${config.visuals.emoji3}*\n\n` +
                `*Símbolo:* ${currencySymbol}\n` +
                `*Nombre:* ${currencyName}\n\n` +
                `> Divisa actualizada correctamente.`

            )

        } catch (
            e
        ) {

            await m.reply(
                `*${config.visuals.emoji2}* Error al guardar la configuración de moneda.`
            )

        }

    }

}


export default setCurrency