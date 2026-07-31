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


const delPrimary = {

    name: 'delprimary',

    alias: [
        'delprimary',
        'removerprincipal',
        'todoshablen'
    ],

    category: 'sockets',

    desc: 'Elimina la restricción de bot primario para que todos los sockets puedan responder en el grupo.',

    isOwner: false,

    noPrefix: false,

    isGroup: true,

    run: async (
        conn,
        m
    ) => {

        const from =
            m.chat


        if (
            !fs.existsSync(
                databasePath
            )
        ) {

            return await conn.sendMessage(

                from,

                {

                    text:

                        `*${config.visuals.emoji2}* \`Sin configuración\`\n\n` +
                        `No hay ningún bot primario asignado en este grupo actualmente.\n\n` +
                        `> ¡Todos los bots tienen permiso de respuesta!`

                },

                {

                    quoted:
                        m

                }

            )

        }


        let db =
            JSON.parse(
                fs.readFileSync(
                    databasePath,
                    'utf-8'
                )
            )


        if (
            !db[from]
        ) {

            return await conn.sendMessage(

                from,

                {

                    text:

                        `*${config.visuals.emoji2}* \`Aviso\`\n\n` +
                        `Este grupo no tiene un bot primario fijo. Todos los sockets están activos.\n\n` +
                        `> ¡No hay nada que remover!`

                },

                {

                    quoted:
                        m

                }

            )

        }


        delete db[from]

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

                    `*${config.visuals.emoji3}* \`RESTRICCIÓN REMOVIDA\`\n\n` +
                    `Se ha eliminado el bot primario con éxito. Ahora todos los sockets responderán.\n\n` +
                    `> ¡La libertad ha vuelto al grupo!`

            },

            {

                quoted:
                    m

            }

        )

    }

}


export default delPrimary