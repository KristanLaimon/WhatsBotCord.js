import type { WhatsappMessage } from "../core/whats_socket/types";

// Message from private chat
export const MockQuotedMsg_Individual: WhatsappMessage = {
  key: {
    remoteJid: "5216121407908@s.whatsapp.net",
    fromMe: false,
    id: "3F47BAE95491574AB145",
  },
  messageTimestamp: 1757127773,
  pushName: "Kristan Ruiz",
  broadcast: false,
  message: {
    extendedTextMessage: {
      text: "This is msg referencing a msg with !ping from private chat",
      contextInfo: {
        stanzaId: "3F989B85F9849B9597B2",
        participant: "5216121407908@s.whatsapp.net",
        quotedMessage: {
          extendedTextMessage: {
            text: "!ping",
            contextInfo: {
              expiration: 0,
              ephemeralSettingTimestamp: 0,
              disappearingMode: {
                initiator: null,
              },
            },
          },
        },
        expiration: 0,
        ephemeralSettingTimestamp: 0,
        disappearingMode: {
          initiator: null,
        },
      },
    },
    messageContextInfo: {
      deviceListMetadata: {
        //@ts-expect-error shouldbe numbers but string
        senderKeyHash: "zkr6pV5fV58MkA==",
        //@ts-expect-error shouldbe numbers but string
        senderTimestamp: "1756692691",
        //@ts-expect-error shouldbe numbers but string
        recipientKeyHash: "pQVf5hor9RHmLg==",
        //@ts-expect-error shouldbe numbers but string
        recipientTimestamp: "1755726002",
      },
      deviceListMetadataVersion: 2,
    },
  },
};

// Message from group chat
export const MockQuotedMsg_Group: WhatsappMessage = {
  key: {
    remoteJid: "120363419336657555@g.us",
    fromMe: false,
    id: "3F6077C582E889C879BC",
    participant: "136777696288768@lid",
  },
  messageTimestamp: 1757127802,
  pushName: "Kristan Ruiz",
  broadcast: false,
  message: {
    extendedTextMessage: {
      text: "This is msg referencing a msg with !ping from GROUP",
      contextInfo: {
        stanzaId: "3F528791D9A103C23618",
        participant: "136777696288768@lid",
        quotedMessage: {
          extendedTextMessage: {
            text: "!ping",
            contextInfo: {
              expiration: 0,
            },
          },
        },
        expiration: 0,
      },
    },
  },
};
