/* 🚫 PROHIBIDO EDITAR CREDITOS 🚫
⚠️ Aviso » Este codigo fue creado únicamente por Dev-FelixOfc, cualquier edit del código es aceptado, pero los créditos deben permanecer (la empatía va primero)
-> Cualquier modificación de este código y de los códigos asociados para que esté funcione fueron creados por mi, no se toleran sapos, mentirosos que editen simplemente el código y digan que fue creado por ellos, ni personas que se pongan ah andar por hay diciendo que esto fue creado por el cuando en realidad no tuvo nada que ver con el desarrollo de esto. 
El código fue desarrollado para el bot Kazuma, en el mes de abril, cualquier otro bot que tenga este código con otros créditos, otra fecha más atrás que está o cualquier otra cosa se tolera como ladrón, porque la única política asignada al código es que no se le pueden cambiar los créditos a su dueño.
*/
import {
    startSubBot
} from '../sockets/index.js'

import {
    config
} from '../config.js'

import fs
    from 'fs'

import path
    from 'path'


const cooldowns =
    new Map()


const codeCommand = {

    name: 'code',

    alias: [
        'subbot',
        'serbot'
    ],

    category: 'sockets',

    desc: 'Genera un código de vinculación para convertir tu número en un Sub-Bot del sistema.',

    noPrefix: false,

    run: async (
        conn,
        m,
        args
    ) => {

        const from =
            m.chat

        const sessionsPath =
            path.resolve(
                './sessions/subbots'
            )

        let targetNumber =
            args[0] ?
                args[0].replace(
                    /[^0-9]/g,
                    ''
                ) :
                m.sender.split(
                    '@'
                )[0]

        const userSessionPath =
            path.join(
                sessionsPath,
                targetNumber
            )


        if (
            fs.existsSync(
                userSessionPath
            )
        ) {

            const hasValidCreds =
                fs.existsSync(
                    path.join(
                        userSessionPath,
                        'creds.json'
                    )
                )

            if (
                !hasValidCreds
            ) {

                fs.rmSync(
                    userSessionPath,
                    {

                        recursive:
                            true,

                        force:
                            true

                    }
                )

                console.log(
                    `🗑️ Carpeta corrupta de subbot ${targetNumber} eliminada.`
                )

            } else {

                return await conn.sendMessage(

                    from,

                    {

                        text:

                            `*${config.visuals.emoji2}* \`Ya eres un Socket\` *${config.visuals.emoji2}*\n\n` +
                            `Tu número ya cuenta con una sesión activa en el sistema.\n\n` +
                            `> Si esto es un error o el bot no responde, usa el comando *#delsession* desde tu número o cierra la sesión en tu WhatsApp y vuelve a pedir el código.`

                    },

                    {

                        quoted:
                            m

                    }

                )

            }

        }


        if (
            fs.existsSync(
                sessionsPath
            )
        ) {

            const totalSubbots =
                fs.readdirSync(
                    sessionsPath
                ).filter(
                    f =>
                        !f.includes(
                            '.'
                        )
                ).length

            if (
                totalSubbots >= 75
            ) {

                return await conn.sendMessage(

                    from,

                    {

                        text:

                            `*${config.visuals.emoji2}* \`Límite alcanzado\` *${config.visuals.emoji2}*\n\n` +
                            `Lo siento, el sistema solo permite un máximo de *75 subbots* activos.\n\n` +
                            `> ¡Pronto ampliaremos nuestra capacidad!`

                    },

                    {

                        quoted:
                            m

                    }

                )

            }

        }


        const now =
            Date.now()

        if (
            cooldowns.has(
                from
            ) &&
            (
                now < cooldowns.get(
                    from
                ) + 60000
            )
        ) {

            return

        }


        try {

            const msgEspera =
                await conn.sendMessage(

                    from,

                    {

                        text:

                            `*${config.visuals.emoji3}* \`Iniciando proceso\` *${config.visuals.emoji3}*\n\n` +
                            `Vinculando a: \`${targetNumber}\`...\n\n` +
                            `> ¡Espera un momento, la magia está ocurriendo!`,

                    },

                    {

                        quoted:
                            m

                    }

                )


            const jidReal =
                `${targetNumber}@s.whatsapp.net`

            const sock =
                await startSubBot(
                    jidReal,
                    conn
                )


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        3000
                    )
            )


            let code =
                await sock.requestPairingCode(
                    targetNumber
                )

            if (
                !code
            ) {

                await sock.logout().catch(
                    () => {}
                )

                global.subBots.delete(
                    jidReal
                )

                fs.rmSync(
                    userSessionPath,
                    {

                        recursive:
                            true,

                        force:
                            true

                    }
                )

                throw new Error(
                    "No se pudo generar el código"
                )

            }


            code =
                code?.match(
                    /. {1,4}/g
                )?.join(
                    '-'
                ) ||
                code


            const msgInstrucciones =
                await conn.sendMessage(

                    from,

                    {

                        text:

                            `✿︎ \`Vinculación del socket\` ✿︎\n\n` +
                            `*❁* \`Pasos a seguir:\` \n` +
                            `Dispositivos vinculados > vincular nuevo dispositivo > Vincular con número de teléfono > ingresa el código.\n\n` +
                            `\`Nota\` » El código es válido por *60 segundos*.\n\n` +
                            `> ¡Ya casi eres parte de la familia!`

                    }

                )


            const msgCodigo =
                await conn.sendMessage(

                    from,

                    {

                        text:
                            code

                    },

                    {

                        quoted:
                            msgInstrucciones

                    }

                )


            await conn.sendMessage(
                from,
                {

                    delete:
                        msgEspera.key

                }
            )


            let connectionEstablished =
                false


            sock.ev.on(
                'connection.update',
                async (
                    update
                ) => {

                    const {
                        connection
                    } =
                        update

                    if (
                        connection === 'open' &&
                        !connectionEstablished
                    ) {

                        connectionEstablished =
                            true

                        await conn.sendMessage(

                            from,

                            {

                                text:

                                    `*[❁]* Conexión Socket exitosa.\n` +
                                    `Número: ${targetNumber} vinculado con éxito.\n\n` +
                                    `> ¡Disfruta del Bot, pronto añadiremos más cosas!`,

                            },

                            {

                                quoted:
                                    m

                            }

                        )


                        try {

                            await conn.sendMessage(
                                from,
                                {

                                    delete:
                                        msgInstrucciones.key

                                }
                            )

                            await conn.sendMessage(
                                from,
                                {

                                    delete:
                                        msgCodigo.key

                                }
                            )

                        } catch (
                            e
                        ) {}

                    }

                }
            )


            setTimeout(
                async () => {

                    try {

                        await conn.sendMessage(
                            from,
                            {

                                delete:
                                    msgInstrucciones.key

                            }
                        )

                        await conn.sendMessage(
                            from,
                            {

                                delete:
                                    msgCodigo.key

                            }
                        )

                    } catch (
                        e
                    ) {}

                },
                60000
            )


        } catch (
            err
        ) {

            await conn.sendMessage(

                from,

                {

                    text:

                        `*${config.visuals.emoji2}* \`Error de Vinculación\` *${config.visuals.emoji2}*\n\n` +
                        `Ocurrió un inconveniente: ${err.message}\n\n` +
                        `> ¡Inténtalo de nuevo, no te rindas!`

                }

            )

        }

    }

}


export default codeCommand
