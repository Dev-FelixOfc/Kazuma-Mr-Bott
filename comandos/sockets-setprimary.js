import fs
    from 'fs'

import path
    from 'path'

import {
    config
} from '../config.js'


const jsonDir =
    path.resolve(
        './jsons'
    )

const databasePath =
    path.join(
        jsonDir,
        'preferencias.json'
    )

const subSessionsPath =
    path.resolve(
        './sessions/subbots'
    )

const mainSessionPath =
    path.resolve(
        './sessions/main'
    )


const setPrimary = {

    name: 'setprimary',

    alias: [
        'setprimary',
        'principal',
        'solotu'
    ],

    category: 'sockets',

    desc: 'Asigna un bot específico como el único que responderá en el grupo.',

    noPrefix: false,

    isGroup: true,

    run: async (
        conn,
        m,
        args
    ) => {

        const from =
            m.chat


        let targetJid =
            m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
            m.message?.extendedTextMessage?.contextInfo?.participant


        if (
            !targetJid
        ) {

            return

        }


        const targetNumber =
            targetJid.split(
                '@'
            )[0]
            .split(
                ':'
            )[0]
            .replace(
                /\D/g,
                ''
            )

        const myNumber =
            conn.user.id
                .split(':')[0]
                .split(':')[0]
                .replace(
                    /\D/g,
                    ''
                )


        if (
            targetNumber !== myNumber
        ) {

            return

        }


        if (
            !fs.existsSync(
                jsonDir
            )
        ) {

            fs.mkdirSync(
                jsonDir,
                {

                    recursive:
                        true

                }
            )

        }


        let db =
            {}

        if (
            fs.existsSync(
                databasePath
            )
        ) {

            try {

                db =
                    JSON.parse(
                        fs.readFileSync(
                            databasePath,
                            'utf-8'
                        )
                    )

            } catch (
                e
            ) {

                db =
                    {}

            }

        }


        if (
            db[from]
        ) {

            return await conn.sendMessage(

                from,

                {

                    text:

                        `*${config.visuals.emoji2}* \`ACCIÓN DENEGADA\`\n\n` +
                        `Ya existe un bot primario asignado (\`${db[from]}\`) en este grupo.\n\n` +
                        `> ¡Usa delprimary para removerlo!`

                },

                {

                    quoted:
                        m

                }

            )

        }


        const isSub =
            fs.existsSync(
                path.join(
                    subSessionsPath,
                    targetNumber
                )
            )

        const isMain =
            fs.existsSync(
                mainSessionPath
            )


        db[from] =
            targetNumber

        fs.writeFileSync(
            databasePath,
            JSON.stringify(
                db,
                null,
                2
            )
        )


        await conn.sendMessage(

            from,

            {

                text:

                    `*${config.visuals.emoji3}* \`CONFIGURACIÓN EXITOSA\`\n\n` +
                    `Se ha elegido al socket *${targetNumber}* como bot primario del grupo.\n\n` +
                    `> ¡A partir de ahora solo yo responderé aquí!`

            },

            {

                quoted:
                    m

            }

        )

    }

}


export default setPrimary