import type { WAMessage } from "baileys";
import type {
  IWhatsSocket_Submodule_SugarSender,
  WhatsMsgAudioOptions,
  WhatsMsgDocumentOptions,
  WhatsMsgMediaOptions,
  WhatsMsgPollOptions,
  WhatsMsgSenderSendingOptions,
  WhatsMsgSenderSendingOptionsMINIMUM,
  WhatsMsgUbicationOptions,
} from "../core/whats_socket/internals/IWhatsSocket.sugarsender.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";

export default class WhatsSocket_Submodule_SugarSender_MockingSuite implements IWhatsSocket_Submodule_SugarSender {
  //=================================================== Spy External Methods ==================================================
  //                                                          Text
  public SentMessages_Text: Array<{
    text: string;
    options?: WhatsMsgSenderSendingOptions;
  }> = [];
  public async Text(chatId: string, text: string, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    this.SentMessages_Text.push({ text: text, options: options });
    return CreateSuccessWhatsMsg(null, chatId);
  }
  //===========================================================================================================================

  public ClearMocks(): void {
    this.SentMessages_Text = [];
  }

  // =============== to add =====================
  public async Image(chatId: string, imageOptions: WhatsMsgMediaOptions, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    throw new Error("Method not implemented.");
  }
  public async ReactEmojiToMsg(
    chatId: string,
    rawMsgToReactTo: WAMessage,
    emojiStr: string,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WAMessage | null> {
    throw new Error("Method not implemented.");
  }
  public async Sticker(chatId: string, stickerUrlSource: string | Buffer, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    throw new Error("Method not implemented.");
  }
  public async Audio(chatId: string, audioParams: WhatsMsgAudioOptions, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    throw new Error("Method not implemented.");
  }
  public async Video(chatId: string, videoParams: WhatsMsgMediaOptions, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    throw new Error("Method not implemented.");
  }
  public async Document(chatId: string, docParams: WhatsMsgDocumentOptions, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    throw new Error("Method not implemented.");
  }
  public async Poll(
    chatId: string,
    pollTitle: string,
    selections: string[],
    pollParams: WhatsMsgPollOptions,
    moreOptions?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WAMessage | null> {
    throw new Error("Method not implemented.");
  }
  Ubication(chatId: string, ubicationParams: WhatsMsgUbicationOptions, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    throw new Error("Method not implemented.");
  }
  Contact(
    chatId: string,
    contacts: { name: string; phone: string } | Array<{ name: string; phone: string }>,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WAMessage | null> {
    throw new Error("Method not implemented.");
  }
}

function CreateSuccessWhatsMsg(participantId: string | null, chatId: string): WhatsappMessage {
  const toReturn: WhatsappMessage = {
    key: {
      fromMe: false,
      id: "success_id_message_id",
      participant: participantId ?? undefined,
      remoteJid: chatId,
    },
  };
  return toReturn;
}
