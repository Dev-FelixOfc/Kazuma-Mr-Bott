import {
    config
} from '../config.js'

import fs
    from 'fs-extra'

import path
    from 'path'


const setBotName = {

    name: 'setname',

    alias: [
        'setbotname',
        'botname',
        'nombrebot'
    ],

    category: 'sockets',

    desc: 'Configura el nombre corto y largo de tu Socket personal.',

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
                            `» Solo el dueño de esta sesión puede modificar su propio nombre.\n\n` +
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
                            `> El bot principal no puede modificar su nombre desde este comando.`

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
                !fullText
            ) {

                return m.reply(
                    `*${config.visuals.emoji2}* Uso: #setname Corto/Nombre Largo`
                )

            }


            let shortName,
                longName

            if (
                fullText.includes(
                    '/'
                )
            ) {

                let [
                    part1,
                    ...part2
                ] =
                    fullText.split(
                        '/'
                    )

                shortName =
                    part1.trim()

                longName =
                    part2.join(
                        '/'
                    ).trim()

                if (
                    shortName.includes(
                        ' '
                    )
                ) {

                    return m.reply(
                        `*${config.visuals.emoji2}* El nombre corto no puede tener espacios.`
                    )

                }

            } else {

                shortName =
                    fullText.trim()

                longName =
                    fullText.trim()

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

            localConfig.shortName =
                shortName

            localConfig.longName =
                longName

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

                `*${config.visuals.emoji3} \`CONFIGURACIÓN SOCKET\` ${config.visuals.emoji3}*\n\n` +
                `*Corto:* ${shortName}\n` +
                `*Largo:* ${longName}\n\n` +
                `> Ajuste aplicado correctamente.`

            )

        } catch (
            e
        ) {

            await m.reply(
                `*${config.visuals.emoji2}* Error al guardar el nombre.`
            )

        }

    }

}


export default setBotName