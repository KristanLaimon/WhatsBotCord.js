import type { WhatsappMessage } from "../core/whats_socket/types";

// Message from private chat
export const MockQuotedMsg_Individual: WhatsappMessage = {
  key: {
    remoteJid: "5210001112223@s.whatsapp.net",
    fromMe: false,
    id: "AAA111BBB222CCC333",
  },
  messageTimestamp: 1757127773,
  pushName: "Test User",
  broadcast: false,
  message: {
    extendedTextMessage: {
      text: "This is msg referencing a msg with !ping from private chat",
      contextInfo: {
        stanzaId: "STANZA123456789",
        participant: "5210001112223@s.whatsapp.net",
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
        //@ts-expect-error should be numbers but string
        senderKeyHash: "fakeSenderHash==",
        //@ts-expect-error should be numbers but string
        senderTimestamp: "1756692691",
        //@ts-expect-error should be numbers but string
        recipientKeyHash: "fakeRecipientHash==",
        //@ts-expect-error should be numbers but string
        recipientTimestamp: "1755726002",
      },
      deviceListMetadataVersion: 2,
    },
  },
};
export const MockQuotedMsg_Individual_CHATID: string = MockQuotedMsg_Individual.key.remoteJid!;

// Message from group chat
export const MockQuotedMsg_Group: WhatsappMessage = {
  key: {
    remoteJid: "120363400000000000@g.us",
    fromMe: false,
    id: "DDD444EEE555FFF666",
    participant: "111222333444555@lid",
  },
  messageTimestamp: 1757127802,
  pushName: "Group Tester",
  broadcast: false,
  message: {
    extendedTextMessage: {
      text: "This is msg referencing a msg with !ping from GROUP",
      contextInfo: {
        stanzaId: "STANZA987654321",
        participant: "111222333444555@lid",
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
export const MockQuotedMsg_Group_CHATID = MockQuotedMsg_Group.key.remoteJid!;
export const MockQuotedMsg_Group_SENDERID: string = MockQuotedMsg_Group.key.participant!;
