import type { AnyMessageContent, MiscMessageGenerationOptions } from "baileys";
import { quotedMsg } from './Msg.helper.mocks';
import { WhatsAppGroupIdentifier, WhatsappLIDIdentifier } from 'src/Whatsapp.types';
// content: AnyMessageContent, misc ?: MiscMessageGenerationOptions

export type WhatsSendMsgMock = {
  content: AnyMessageContent;
  misc?: MiscMessageGenerationOptions;
}

/**
 * TODO: Make a mock case for each of these
 * 1. Text Message CHECKED
 * 2. Text message quoting another previous message CHECKED
 * 3. Sticker only msg
 * 4. Image with caption 
 * 5. Image only (No caption)
 * 6. Audio msg
 * 7. Video only (No caption)
 * 8. Video with caption
 * 9. Poll with multiple answers allowed (With header and 2 answers)
 * 10. Poll with only one answer allowed (Withh header and 3 answers)
 * 11. Ubication
 * 12. Contact (A mocked one)
 */

export const TxtMsg: WhatsSendMsgMock = {
  content: {
    text: "Text message content"
  }
};

export const TxtMsgWithQuote: WhatsSendMsgMock = {
  content: {
    text: `I'm quoting a msg, this is main msg content`
  },
  misc: {
    quoted: {
      key: {
        id: "234324234828349230ID",
        fromMe: false,
        participant: "12345678901234" + WhatsappLIDIdentifier,
        remoteJid: "23423423" + WhatsAppGroupIdentifier
      },
      message: {
        conversation: "I'm another msg, being referenced to"
      }
    }
  }
}
