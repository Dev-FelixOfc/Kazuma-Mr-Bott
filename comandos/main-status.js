import os
    from 'os'

import fs
    from 'fs-extra'

import path
    from 'path'

import {
    config
} from '../../config.js'


const statusCommand = {

    name: 'status',

    alias: [
        'botinfo',
        'infobot'
    ],

    category: 'main',

    desc: 'Muestra información técnica sobre el estado del bot y el servidor.',

    noPrefix: false,

    run: async (
        conn,
        m
    ) => {

        try {

            const uptimeSeconds =
                process.uptime()

            const d =
                Math.floor(
                    uptimeSeconds / (
                        3600 * 24
                    )
                )

            const h =
                Math.floor(
                    (
                        uptimeSeconds % (
                            3600 * 24
                        )
                    ) / 3600
                )

            const m_time =
                Math.floor(
                    (
                        uptimeSeconds % 3600
                    ) / 60
                )

            const s =
                Math.floor(
                    uptimeSeconds % 60
                )

            const uptimeDisplay =
                `${d}d ${h}h ${m_time}m ${s}s`


            const totalRam =
                (
                    os.totalmem() / (
                        1024 * 1024 * 1024
                    )
                ).toFixed(2)

            const freeRam =
                (
                    os.freemem() / (
                        1024 * 1024 * 1024
                    )
                ).toFixed(2)

            const usedRam =
                (
                    totalRam - freeRam
                ).toFixed(2)

            const usedPercent =
                (
                    (
                        totalRam - freeRam
                    ) / totalRam * 100
                ).toFixed(1)


            const cpus =
                os.cpus()

            const cpuModel =
                cpus[0].model
                    .replace(
                        /CPU|@|inc.|Processor|Core\(TM\)|i[0-9]-/g,
                        ''
                    )
                    .trim()

            const cpuCores =
                cpus.length


            const loadAvg =
                os.loadavg()

            const cpuLoad =
                (
                    loadAvg[0] / cpuCores * 100
                ).toFixed(1)


            const botNumber =
                conn.user.id
                    .split(':')[0]
                    .replace(
                        /\D/g,
                        ''
                    )


            const mainPath =
                path.resolve(
                    `./sessions/main/${botNumber}`
                )

            const subPath =
                path.resolve(
                    `./sessions/subbots/${botNumber}`
                )


            let shortName =
                config.botName

            let longName =
                config.botName

            let botType =
                'Main'


            let settingsData =
                null


            if (
                await fs.pathExists(
                    mainPath
                )
            ) {

                settingsData =
                    await fs.readJson(
                        path.join(
                            mainPath,
                            'settings.json'
                        )
                    ).catch(
                        () => null
                    )

                botType =
                    'Main'

            } else if (
                await fs.pathExists(
                    subPath
                )
            ) {

                settingsData =
                    await fs.readJson(
                        path.join(
                            subPath,
                            'settings.json'
                        )
                    ).catch(
                        () => null
                    )

                botType =
                    'SubBot'

            }


            if (
                settingsData
            ) {

                if (
                    settingsData.shortName
                ) {

                    shortName =
                        settingsData.shortName

                }

                if (
                    settingsData.longName
                ) {

                    longName =
                        settingsData.longName

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


            let mainCount =
                0

            let subCount =
                0


            if (
                await fs.pathExists(
                    mainSessionsPath
                )
            ) {

                const folders =
                    await fs.readdir(
                        mainSessionsPath
                    )

                for (
                    const folder of folders
                ) {

                    const fullPath =
                        path.join(
                            mainSessionsPath,
                            folder
                        )

                    if (
                        (
                            await fs.stat(
                                fullPath
                            )
                        ).isDirectory() &&

                        await fs.pathExists(
                            path.join(
                                fullPath,
                                'creds.json'
                            )
                        )
                    ) {

                        mainCount++

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
                        (
                            await fs.stat(
                                fullPath
                            )
                        ).isDirectory() &&

                        await fs.pathExists(
                            path.join(
                                fullPath,
                                'creds.json'
                            )
                        )
                    ) {

                        subCount++

                    }

                }

            }


            const uniqueCommands =
                new Map()

            for (
                const [key, cmd] of global.commands.entries()
            ) {

                if (
                    cmd.name &&
                    !uniqueCommands.has(
                        cmd.name
                    )
                ) {

                    uniqueCommands.set(
                        cmd.name,
                        cmd
                    )

                }

            }

            const totalCommands =
                uniqueCommands.size


            const totalBots =
                mainCount + subCount


            const textoStatus =

                `*${config.visuals.emoji3}* \`SISTEMA ${longName.toUpperCase()}\` *${config.visuals.emoji3}*\n\n` +

                `✿︎ Bot ᗒ *${shortName}* (${botType})\n` +
                `❁ Uptime ᗒ *${uptimeDisplay}*\n` +
                `✰ Comandos ᗒ *${totalCommands}*\n\n` +

                `❀ Bots Activos ᗒ *${totalBots}*\n` +
                `✿ Main ᗒ *${mainCount}*\n` +
                `✰ SubBots ᗒ *${subCount}*\n\n` +

                `ᗣ RAM ᗒ *${usedRam}GB / ${totalRam}GB* (${usedPercent}%)\n` +
                `⁂ CPU ᗒ *${cpuLoad}%* (${cpuCores} núcleos)\n` +
                `𖧷 Model ᗒ *${cpuModel}*\n\n` +

                `> *${config.visuals.emoji2}* \`DEVELOPED BY FÉLIX OFC\``


            await conn.sendMessage(

                m.chat,

                {

                    text:
                        textoStatus

                },

                {

                    quoted:
                        m

                }

            )


        } catch (
            err
        ) {

            console.error(
                err
            )

            await m.reply(

                `*${config.visuals.emoji2}* Error al obtener el estado del sistema.`

            )

        }

    }

}


export default statusCommand
