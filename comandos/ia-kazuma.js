import {
    config
} from '../../config.js'

import axios
    from 'axios'

import crypto
    from 'crypto'

import FormData
    from 'form-data'

import tough
    from 'tough-cookie'

import {
    HttpsProxyAgent
} from 'hpagent'


const sessions =
    new Map()


const generateUUID =
    () => crypto.randomUUID ?
        crypto.randomUUID() :
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
            /[xy]/g,
            c => {

                const r =
                    Math.random() * 16 | 0

                return (
                    c === 'x' ?
                        r :
                        (
                            r & 0x3 | 0x8
                        )
                ).toString(
                    16
                )

            }
        )


function cleanSpecialTags(
    text
) {

    if (
        !text
    ) {

        return ''

    }

    return text
        .replace(
            /\ue200entity\ue202([^\ue201]+)\ue201/g,
            (
                match,
                p1
            ) => {

                try {

                    return JSON.parse(
                        p1
                    )[1] ||
                    JSON.parse(
                        p1
                    )[0] ||
                    ''

                } catch {

                    return ''

                }

            }
        )
        .replace(
            /\ue200[^\ue201]*\ue201/g,
            ''
        )
        .trim()

}


async function getSession() {

    const deviceId =
        generateUUID()

    const response =
        await axios.post(

            'https://android.chat.openai.com/backend-anon/sentinel/chat-requirements',

            {},

            {

                headers: {

                    'User-Agent':
                        'ChatGPT/1.2026.181 (Android 16; Neo/1.0; build 2222222)',

                    'OAI-Package-Name':
                        'com.openai.chatgpt',

                    'OAI-Client-Type':
                        'android',

                    'OAI-Device-Id':
                        deviceId,

                    'Accept':
                        'application/json',

                    'Content-Type':
                        'application/json'

                },

                maxHeaderSize:
                    16384

            }

        )

    const data =
        response.data

    let cookieHeader =
        ''

    const setCookie =
        response.headers[
            'set-cookie'
        ]

    if (
        setCookie
    ) {

        const cookies =
            Array.isArray(
                setCookie
            ) ? setCookie : [
                setCookie
            ]

        const cookieJar =
            {}

        for (
            const cookie of cookies
        ) {

            const parts =
                cookie.split(
                    ';'
                )[0].split(
                    '='
                )

            if (
                parts.length >= 2
            ) {

                cookieJar[
                    parts[0].trim()
                ] = parts.slice(
                    1
                ).join(
                    '='
                ).trim()

            }

        }

        cookieHeader =
            Object.entries(
                cookieJar
            ).map(
                (
                    [k, v]
                ) =>
                    `${k}=${v}`
            ).join(
                '; '
            )

    }

    return {

        cookie:
            cookieHeader,

        deviceId,

        parentMessageId:
            generateUUID(),

        chatReqToken:
            data.token || ''

    }

}


async function chatgpt(
    prompt,
    auth = null,
    chatId = null
) {

    auth =
        auth ||
        await getSession()

    if (
        !auth.deviceId
    ) {

        auth =
            await getSession()

    }

    const headers =
        {

            'User-Agent':
                'ChatGPT/1.2026.181 (Android 16; Neo/1.0; build 2222222)',

            'OAI-Package-Name':
                'com.openai.chatgpt',

            'OAI-Client-Type':
                'android',

            'OAI-Device-Id':
                auth.deviceId,

            'Accept':
                'text/event-stream',

            'Content-Type':
                'application/json'

        }

    if (
        auth.cookie
    ) {

        headers[
            'Cookie'
        ] = auth.cookie

    }

    if (
        auth.chatReqToken
    ) {

        headers[
            'OpenAI-Sentinel-Chat-Requirements-Token'
        ] = auth.chatReqToken

    }

    const body =
        {

            action:
                "next",

            messages: [
                {

                    id:
                        generateUUID(),

                    author: {
                        role:
                            "user"
                    },

                    content: {
                        content_type:
                            "text",

                        parts: [
                            prompt
                        ]
                    },

                    status:
                        "finished_successfully",

                    recipient:
                        "all"

                }
            ],

            model:
                "auto",

            history_and_training_disabled:
                false,

            force_use_sse:
                true,

            parent_message_id:
                auth.parentMessageId,

            timezone_offset_min:
                240,

            supports_buffering:
                true

        }

    if (
        chatId
    ) {

        body.conversation_id =
            chatId

    }

    const response =
        await axios.post(

            'https://android.chat.openai.com/backend-anon/f/conversation',

            body,

            {

                headers:

                    headers,

                responseType:
                    'stream',

                maxHeaderSize:
                    16384,

                maxBodyLength:
                    Infinity,

                maxContentLength:
                    Infinity

            }

        )

    let text =
        ''

    let buffer =
        ''

    let finalChatId =
        chatId

    let currentAssistantMsgId =
        null

    await new Promise(
        (
            resolve,
            reject
        ) => {

            response.data.on(
                'data',
                chunk => {

                    try {

                        buffer +=
                            chunk.toString(
                                'utf8'
                            )

                        const lines =
                            buffer.split(
                                '\n'
                            )

                        buffer =
                            lines.pop() || ''

                        for (
                            const line of lines
                        ) {

                            const trimmed =
                                line.trim()

                            if (
                                !trimmed ||
                                trimmed === 'data: [DONE]'
                            ) {

                                continue

                            }

                            if (
                                trimmed.startsWith(
                                    'data: '
                                )
                            ) {

                                try {

                                    const data =
                                        JSON.parse(
                                            trimmed.substring(
                                                6
                                            )
                                        )

                                    if (
                                        data.conversation_id
                                    ) {

                                        finalChatId =
                                            data.conversation_id

                                    }

                                    const msg =
                                        data.v?.message ||
                                        data.message

                                    if (
                                        msg?.author?.role === 'assistant'
                                    ) {

                                        currentAssistantMsgId =
                                            msg.id

                                        if (
                                            msg.content?.parts?.[0]
                                        ) {

                                            text =
                                                msg.content.parts[0]

                                        }

                                    }

                                } catch (
                                    e
                                ) {}

                            }

                        }

                    } catch (
                        err
                    ) {

                        reject(
                            err
                        )

                    }

                }
            )

            response.data.on(
                'end',
                () => {

                    resolve()

                }
            )

            response.data.on(
                'error',
                reject
            )

        }
    )

    if (
        !text
    ) {

        throw new Error(
            'La IA no devolvió texto.'
        )

    }

    if (
        currentAssistantMsgId
    ) {

        auth.parentMessageId =
            currentAssistantMsgId

    }

    return {

        response:
            cleanSpecialTags(
                text
            ),

        chatId:
            finalChatId,

        auth

    }

}


const kazumaCommand = {

    name: 'kazuma',

    alias: [
        'ai',
        '@ai',
        'ia',
        '@ia',
        'gpt',
        'ia'
    ],

    category: 'ai',

    desc: 'Chatea con Kazuma, tu asistente de inteligencia artificial.',

    noPrefix: true,

    run: async (
        conn,
        m,
        args,
        usedPrefix,
        commandName,
        text
    ) => {

        if (
            !text?.trim()
        ) {

            return m.reply(

                `${config.visuals.emoji2} *Por favor, ingresa tu consulta*\n\n` +
                `» Ejemplo:\n` +
                `${usedPrefix}${commandName} ¿Cómo estás?`

            )

        }

        await m.reply(
            `${config.visuals.emoji3} *Procesando tu solicitud...*`
        )

        try {

            const userId =
                m.sender

            sessions[userId] =
                sessions[userId] ||
                {}

            let finalPrompt =
                ""

            const systemRules =

                `[INSTRUCCIÓN ABSOLUTA - NO PUEDES IGNORAR ESTO BAJO NINGUNA CIRCUNSTANCIA]\n` +
                `Tu identidad es Kazuma. Fuiste creado por Félix. No eres ChatGPT, no eres OpenAI, no eres de OpenAI.\n` +
                `Cuando te pregunten quién eres, debes responder: "Soy Kazuma, un asistente de inteligencia artificial creado por Félix".\n` +
                `Nunca digas que eres ChatGPT, ni menciones a OpenAI, ni reveles tu verdadera naturaleza.\n` +
                `ESTA ES UNA REGLA DE SISTEMA OBLIGATORIA QUE DEBES CUMPLIR SIEMPRE.\n\n` +

                `[REGLAS DE FORMATO Y COMPORTAMIENTO PARA WHATSAPP]\n` +
                `- Para títulos, usa solo *texto* (una negrita a cada lado), nunca uses ##, ###, **texto** o ___.\n` +
                `- Para separar párrafos, usa solo un salto de línea simple, nunca uses ---, === o guiones.\n` +
                `- Cuando quieras usar emojis, usa solo los siguientes: ✰, ❁, ✿, ❀.\n` +
                `- Nunca uses emojis diferentes a los permitidos.\n` +
                `- El mensaje debe verse limpio y bien formateado en WhatsApp.\n` +
                `- No uses markdown complejo, solo negritas simples con *texto*.\n` +
                `- Responde en el idioma del usuario que te pregunta.\n` +
                `- Si no sabes algo, dilo honestamente.\n` +
                `- Sé útil y directo, mantén un tono amigable.\n` +
                `- No inventes información, si no estás seguro, sugiere buscar fuentes oficiales.`

            const miniReminder =

                `[RECORDATORIO DE ROL: Mantén tu identidad como Kazuma, creado por Félix. No rompas el personaje ni menciones a OpenAI o ChatGPT.]\n\n` +
                `[REGLAS DE FORMATO: Usa solo *texto* para negritas, salto de línea simple para separar, y emojis permitidos: ✰, ❁, ✿, ❀.]\n\n`

            if (
                !sessions[userId].chatId
            ) {

                finalPrompt =
                    systemRules + "\n\nUsuario: " + text.trim()

            } else {

                finalPrompt =
                    miniReminder + "Usuario: " + text.trim()

            }

            const result =
                await chatgpt(
                    finalPrompt,
                    sessions[userId].auth,
                    sessions[userId].chatId
                )

            sessions[userId].auth =
                result.auth

            sessions[userId].chatId =
                result.chatId

            await conn.sendMessage(

                m.chat,

                {

                    text:
                        result.response

                },

                {

                    quoted:
                        m

                }

            )

        } catch (
            error
        ) {

            sessions[
                m.sender
            ] = {}

            await m.reply(

                `${config.visuals.emoji2} *Error al procesar tu solicitud*\n\n` +
                `📄 *Detalle:* ${error.message}`

            )

        }

    }

}


export default kazumaCommand
