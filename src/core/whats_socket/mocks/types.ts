import type { AnyMessageContent, MiscMessageGenerationOptions } from "baileys";

export type MsgServiceSocketMessageSentMock = {
  chatId: string;
  content: AnyMessageContent;
  miscOptions?: MiscMessageGenerationOptions;
};
