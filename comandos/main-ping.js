import {
    config
} from '../config.js'

import fs
    from 'fs-extra'

import path
    from 'path'


const pingCommand = {

    name: 'ping',

    alias: [
        'p',
        'speed',
        'latencia'
    ],

    category: 'main',

    desc: 'Muestra la velocidad de respuesta del bot y su estado actual.',

    noPrefix: false,

    run: async (
        conn,
        m
    ) => {

        try {

            const start =
                Date.now()


            const pingMsg =
                await conn.sendMessage(

                    m.chat,

                    {

                        text:
                            `*${config.visuals.emoji2}* \`Verificando conexión...\``

                    },

                    {

                        quoted:
                            m

                    }

                )


            const end =
                Date.now()

            const latencia =
                end - start


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


            let displayShortName =
                config.botName


            if (
                await fs.pathExists(
                    mainPath
                )
            ) {

                const localData =
                    await fs.readJson(
                        mainPath
                    )

                if (
                    localData.shortName
                ) {

                    displayShortName =
                        localData.shortName

                }

            } else if (
                await fs.pathExists(
                    subPath
                )
            ) {

                const localData =
                    await fs.readJson(
                        subPath
                    )

                if (
                    localData.shortName
                ) {

                    displayShortName =
                        localData.shortName

                }

            }


            await conn.sendMessage(

                m.chat,

                {

                    text:

                        `*${config.visuals.emoji3}* \`${displayShortName.toUpperCase()} PING\` *${config.visuals.emoji3}*\n\n` +

                        `*${config.visuals.emoji4} Velocidad:* ${latencia} ms\n` +

                        `*${config.visuals.emoji} Estado:* Online\n\n` +

                        `> ¡Todo revisado y analizado correctamente!`,

                    edit:
                        pingMsg.key

                }

            )


        } catch (
            err
        ) {

            console.error(
                err
            )

        }

    }

}


export default pingCommand
