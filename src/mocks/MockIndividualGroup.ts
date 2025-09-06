import type { WhatsappMessage } from "../core/whats_socket/types";

// Message from private/individual chat
export const MockIndividualTxtMsg: WhatsappMessage = {
  key: {
    remoteJid: "555123456789@s.whatsapp.net",
    fromMe: false,
    id: "ABC123DEF456",
  },
  messageTimestamp: 1756510376,
  pushName: "Alice Example",
  broadcast: false,
  message: {
    extendedTextMessage: {
      text: "This comes from private/individual message",
      contextInfo: {
        expiration: 0,
        //@ts-expect-error Typescript can't recognize from string. But its ok
        ephemeralSettingTimestamp: "0",
        disappearingMode: {
          //@ts-expect-error Typescript can't recognize from string. But its ok
          initiator: "CHANGED_IN_CHAT",
        },
      },
    },
    messageContextInfo: {
      deviceListMetadata: {
        //@ts-expect-error Typescript can't recognize from string. But its ok
        senderKeyHash: "SENDER_HASH_FAKE",
        //@ts-expect-error Typescript can't recognize from string. But its ok
        senderTimestamp: "1755000000",
        //@ts-expect-error Typescript can't recognize from string. But its ok
        recipientKeyHash: "RECIPIENT_HASH_FAKE",
        //@ts-expect-error Typescript can't recognize from string. But its ok
        recipientTimestamp: "1755000100",
      },
      deviceListMetadataVersion: 2,
    },
  },
};

// Message from group chat
export const MockGroupTxtMsg: WhatsappMessage = {
  key: {
    remoteJid: "123456789012345@g.us",
    fromMe: false,
    id: "XYZ789GHI012",
    participant: "999888777666@lid",
  },
  messageTimestamp: 1756510383,
  pushName: "Bob Example",
  broadcast: false,
  message: {
    extendedTextMessage: {
      text: "This comes from group",
      contextInfo: {
        expiration: 0,
      },
    },
  },
};

export const MockIndividualTxtMsg_CHATID: string = MockIndividualTxtMsg.key.remoteJid!;

export const MockGroupTxtMsg_SENDERID: string = MockGroupTxtMsg.key.participant!;
export const MockGroupTxtMsg_CHATID: string = MockGroupTxtMsg.key.remoteJid!;
