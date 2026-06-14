import type { WhatsappMessageContent, WhatsappMessageOptions } from "../types.js";

export type WhatsSocketMockMsgSent = {
  chatId: string;
  content: WhatsappMessageContent;
  miscOptions?: WhatsappMessageOptions;
};
