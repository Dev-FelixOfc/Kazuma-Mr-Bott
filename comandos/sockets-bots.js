import fs
    from 'fs-extra'

import path
    from 'path'

import {
    config
} from '../config.js'


export default {

    name: 'bots',

    alias: [
        'sockets',
        'botlist'
    ],

    category: 'sockets',

    desc: 'Escanea y muestra los SubBots del sistema presentes en el grupo actual.',

    noPrefix: false,

    isGroup: true,

    run: async (
        conn,
        m
    ) => {

        try {

            const myJid =
                conn.user.id
                    .split(':')[0]
                    .split(':')[0]
                    .replace(
                        /\D/g,
                        ''
                    )

            const databasePath =
                path.join(
                    process.cwd(),
                    'jsons',
                    'preferencias.json'
                )


            if (
                fs.existsSync(
                    databasePath
                )
            ) {

                const db =
                    await fs.readJson(
                        databasePath
                    )

                if (
                    db[m.chat]
                ) {

                    const primaryNumber =
                        db[m.chat].replace(
                            /\D/g,
                            ''
                        )

                    if (
                        myJid !== primaryNumber
                    ) {

                        return

                    }

                }

            }


            const mainSessionsPath =
                path.resolve(
                    './sessions/main'
                )

            const subSessionsPath =
                path.resolve(
                    './sessions/subbots'
                )


            const groupMetadata =
                await conn.groupMetadata(
                    m.chat
                )

            const participants =
                groupMetadata.participants.map(
                    p =>
                        p.id.split(
                            '@'
                        )[0]
                )


            let mainBotNumber =
                ''

            let globalSubs =
                0

            let localSubs =
                0

            let subBotsList =
                ''

            let mainBotLine =
                ''

            let mentions =
                []


            if (
                await fs.pathExists(
                    mainSessionsPath
                )
            ) {

                const mainFolders =
                    await fs.readdir(
                        mainSessionsPath
                    )

                for (
                    const folder of mainFolders
                ) {

                    const fullPath =
                        path.join(
                            mainSessionsPath,
                            folder
                        )

                    if (
                        !(
                            await fs.stat(
                                fullPath
                            )
                        ).isDirectory() ||
                        folder.startsWith(
                            '.'
                        )
                    ) {

                        continue

                    }


                    const num =
                        folder.replace(
                            /\D/g,
                            ''
                        )

                    if (
                        !num
                    ) {

                        continue

                    }


                    const hasCreds =
                        await fs.pathExists(
                            path.join(
                                fullPath,
                                'creds.json'
                            )
                        )

                    if (
                        hasCreds
                    ) {

                        mainBotNumber =
                            num

                        if (
                            participants.includes(
                                num
                            )
                        ) {

                            let mainName =
                                config.botName

                            const mainSettingsPath =
                                path.join(
                                    fullPath,
                                    'settings.json'
                                )

                            if (
                                await fs.pathExists(
                                    mainSettingsPath
                                )
                            ) {

                                try {

                                    const mainData =
                                        await fs.readJson(
                                            mainSettingsPath
                                        )

                                    mainName =
                                        mainData.shortName ||
                                        mainData.longName ||
                                        config.botName

                                } catch (
                                    e
                                ) {

                                    mainName =
                                        config.botName

                                }

                            }


                            mainBotLine =
                                `  ✿︎ *[Main • ${mainName}]* » @${num}\n`

                            mentions.push(
                                `${num}@s.whatsapp.net`
                            )

                        }

                    }

                }

            }


            if (
                await fs.pathExists(
                    subSessionsPath
                )
            ) {

                const folders =
                    await fs.readdir(
                        subSessionsPath
                    )

                for (
                    const folder of folders
                ) {

                    const fullPath =
                        path.join(
                            subSessionsPath,
                            folder
                        )

                    if (
                        !(
                            await fs.stat(
                                fullPath
                            )
                        ).isDirectory() ||
                        folder.startsWith(
                            '.'
                        )
                    ) {

                        continue

                    }


                    const num =
                        folder.replace(
                            /\D/g,
                            ''
                        )

                    if (
                        !num
                    ) {

                        continue

                    }


                    const hasCreds =
                        await fs.pathExists(
                            path.join(
                                fullPath,
                                'creds.json'
                            )
                        )

                    if (
                        hasCreds
                    ) {

                        globalSubs++

                    }


                    if (
                        num !== mainBotNumber &&
                        participants.includes(
                            num
                        )
                    ) {

                        let subName =
                            config.botName

                        const subSettingsPath =
                            path.join(
                                fullPath,
                                'settings.json'
                            )

                        if (
                            await fs.pathExists(
                                subSettingsPath
                            )
                        ) {

                            try {

                                const subData =
                                    await fs.readJson(
                                        subSettingsPath
                                    )

                                subName =
                                    subData.shortName ||
                                    subData.longName ||
                                    config.botName

                            } catch (
                                e
                            ) {

                                subName =
                                    config.botName

                            }

                        }


                        subBotsList +=
                            `  ✿︎ *[Sub • ${subName}]* » @${num}\n`

                        mentions.push(
                            `${num}@s.whatsapp.net`
                        )

                        localSubs++

                    }

                }

            }


            const totalLocal =
                localSubs


            const header =

                `*${config.visuals.emoji3}* \`LISTA DE SOCKETS ACTIVOS\` *${config.visuals.emoji3}*`

            const stats =

                `\n\n❁ Main » *1*\n❀ Subs » *${globalSubs}*\n\n` +
                `❀ En este grupo *(${totalLocal})*:`

            const textoFinal =

                `${header}${stats}\n${mainBotLine}${subBotsList}\n` +
                `> ¡Todos los sockets han sido cargados con éxito!`


            if (
                totalLocal === 0
            ) {

                return m.reply(

                    `*${config.visuals.emoji2}* No hay sockets de mi sistema en este grupo.`

                )

            }


            await conn.sendMessage(

                m.chat,

                {

                    text:
                        textoFinal.trim(),

                    mentions:
                        mentions

                },

                {

                    quoted:
                        m

                }

            )


        } catch (
            e
        ) {

            m.reply(

                `*${config.visuals.emoji2}* Error al filtrar los sockets.`

            )

        }

    }

                      }
