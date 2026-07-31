import {
    config
} from '../config.js'

import {
    uploadToEvogb
} from '../../API/upload.js'

import {
    downloadMediaMessage,
    downloadContentFromMessage
} from 'todleys'

import P
    from 'pino'

import fs
    from 'fs-extra'

import path
    from 'path'


const setBanner = {

    name: 'setbanner',

    alias: [
        'setimg',
        'bannerbot'
    ],

    category: 'sockets',

    desc: 'Cambia la imagen de banner de tu Socket personal.',

    noPrefix: false,

    run: async (
        conn,
        m
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
                            `» Solo el dueño de esta sesión puede modificar su propio banner.\n\n` +
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
                            `> El bot principal no puede modificar su banner desde este comando.`

                    },

                    {

                        quoted:
                            m

                    }

                )

            }


            let mediaBuffer =
                null

            let mediaMimeType =
                null


            const q =
                m.quoted ?
                    m.quoted :
                    m

            const mime =
                (
                    q.msg || q
                ).mimetype || ''


            const isValidImage =
                /image/.test(
                    mime
                )


            if (
                isValidImage
            ) {

                try {

                    const stream =
                        await downloadContentFromMessage(
                            q.msg || q,
                            'image'
                        )

                    let buffer =
                        Buffer.from(
                            []
                        )

                    for await (
                        const chunk of stream
                    ) {

                        buffer =
                            Buffer.concat(
                                [
                                    buffer,
                                    chunk
                                ]
                            )

                    }


                    if (
                        buffer &&
                        buffer.length > 0
                    ) {

                        mediaBuffer =
                            buffer

                        mediaMimeType =
                            mime ||
                            'image/jpeg'

                    }

                } catch (
                    err
                ) {

                    console.error(
                        'Error con downloadContentFromMessage en banner:',
                        err
                    )

                }

            }


            if (
                !mediaBuffer &&
                m.quoted
            ) {

                const quotedMsg =
                    m.quoted.msg ||
                    m.quoted.message

                if (
                    quotedMsg
                ) {

                    const msgType =
                        Object.keys(
                            quotedMsg
                        ).find(
                            t =>
                                [
                                    'imageMessage'
                                ].includes(
                                    t
                                )
                        )


                    if (
                        msgType
                    ) {

                        try {

                            const messageToDownload =
                                {

                                    message:
                                        quotedMsg,

                                    key:
                                        m.quoted.key || {

                                            remoteJid:
                                                m.chat,

                                            fromMe:
                                                false,

                                            id:
                                                m.quoted.id,

                                            participant:
                                                m.quoted.sender

                                        }

                                }


                            const buffer =
                                await downloadMediaMessage(
                                    messageToDownload,
                                    'buffer',
                                    {},
                                    {

                                        logger:
                                            P(
                                                {

                                                    level:
                                                        'silent'

                                                }
                                            )

                                    }
                                )


                            if (
                                buffer
                            ) {

                                mediaBuffer =
                                    buffer

                                mediaMimeType =
                                    quotedMsg[msgType]?.mimetype ||
                                    'image/jpeg'

                            }

                        } catch (
                            err
                        ) {

                            console.error(
                                'Error descargando imagen quoted con downloadMediaMessage:',
                                err
                            )

                        }

                    }

                }

            }


            if (
                !mediaBuffer &&
                m.message
            ) {

                const msgType =
                    Object.keys(
                        m.message
                    ).find(
                        t =>
                            [
                                'imageMessage'
                            ].includes(
                                t
                            )
                    )


                if (
                    msgType
                ) {

                    try {

                        const buffer =
                            await downloadMediaMessage(
                                m,
                                'buffer',
                                {},
                                {

                                    logger:
                                        P(
                                            {

                                                level:
                                                    'silent'

                                            }
                                        )

                                }
                            )


                        if (
                            buffer
                        ) {

                            mediaBuffer =
                                buffer

                            mediaMimeType =
                                m.message[msgType]?.mimetype ||
                                'image/jpeg'

                        }

                    } catch (
                        err
                    ) {

                        console.error(
                            'Error descargando imagen directa con downloadMediaMessage:',
                            err
                        )

                    }

                }

            }


            if (
                !mediaBuffer
            ) {

                return await conn.sendMessage(

                    from,

                    {

                        text:

                            `*${config.visuals.emoji2}* Responde a una imagen o envía una con el comando para establecer tu banner.`

                    },

                    {

                        quoted:
                            m

                    }

                )

            }


            await conn.sendMessage(

                from,

                {

                    text:
                        `*${config.visuals.emoji3}* \`GUARDANDO CONFIGURACIÓN...\``

                },

                {

                    quoted:
                        m

                }

            )


            const result =
                await uploadToEvogb(
                    mediaBuffer,
                    'banner.jpg',
                    mediaMimeType,
                    {

                        customName:
                            `banner_${botNumber}`,

                        author:
                            'Kazuma Bot',

                        description:
                            `Banner del socket ${botNumber}`

                    }
                )


            if (
                !result.status
            ) {

                throw new Error(
                    result.error ||
                    'Error al subir la imagen'
                )

            }


            const fullLink =
                result.result.url


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

            localConfig.banner =
                fullLink

            localConfig.lastUpdate =
                Date.now()


            await fs.writeJson(
                userSettingsPath,
                localConfig,
                {

                    spaces: 2

                }
            )

            const socketName =
                localConfig.shortName ||
                config.botName


            await conn.sendMessage(

                from,

                {

                    text:

                        `*${config.visuals.emoji3} \`BANNER ACTUALIZADO\` ${config.visuals.emoji3}*\n\n` +
                        `Se ha cambiado el banner para *${socketName}*.\n\n` +
                        `*🚀 Enlace:* ${fullLink}`

                },

                {

                    quoted:
                        m

                }

            )

        } catch (
            e
        ) {

            console.error(
                'Error en setbanner:',
                e
            )

            await conn.sendMessage(

                m.chat,

                {

                    text:
                        `*${config.visuals.emoji2}* Error al procesar el banner: ${e.message}`

                },

                {

                    quoted:
                        m

                }

            )

        }

    }

}


export default setBanner