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
import { WhatsappGroupIdentifier, WhatsappIndividualIdentifier } from "../Whatsapp.types.js";

function NormalizeChatId(rawChatId: string): string {
  if (rawChatId.endsWith(WhatsappIndividualIdentifier)) return rawChatId;

  if (rawChatId.endsWith(WhatsappGroupIdentifier)) {
    return rawChatId;
  } else {
    return rawChatId + WhatsappGroupIdentifier;
  }
}

export default class WhatsSocket_Submodule_SugarSender_MockingSuite implements IWhatsSocket_Submodule_SugarSender {
  //=================================================== Spy External Methods ==================================================
  //                                                          Text
  public SentMessages_Text: Array<{
    chatId: string;
    text: string;
    options?: WhatsMsgSenderSendingOptions;
  }> = [];
  public async Text(chatId: string, text: string, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    this.SentMessages_Text.push({ text: text, options: options, chatId: NormalizeChatId(chatId) });
    return CreateSuccessWhatsMsg(null, chatId);
  }

  //                                                          Img
  public SentMessages_Imgs: Array<{
    chatId: string;
    imageOptions: WhatsMsgMediaOptions;
    options?: WhatsMsgSenderSendingOptions;
  }> = [];
  public async Image(chatId: string, imageOptions: WhatsMsgMediaOptions, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    this.SentMessages_Imgs.push({ chatId, imageOptions, options });
    return CreateSuccessWhatsMsg(null, NormalizeChatId(chatId));
  }

  //===========================================================================================================================

  public ClearMocks(): void {
    this.SentMessages_Text = [];
    this.SentMessages_Imgs = [];
  }

  // =============== to add =====================

  public async ReactEmojiToMsg(
    _chatId: string,
    _rawMsgToReactTo: WAMessage,
    _emojiStr: string,
    _options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WAMessage | null> {
    throw new Error("Method not implemented.");
  }
  public async Sticker(_chatId: string, _stickerUrlSource: string | Buffer, _options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    throw new Error("Method not implemented.");
  }
  public async Audio(_chatId: string, _audioParams: WhatsMsgAudioOptions, _options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    throw new Error("Method not implemented.");
  }
  public async Video(_chatId: string, _videoParams: WhatsMsgMediaOptions, _options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    throw new Error("Method not implemented.");
  }
  public async Document(_chatId: string, _docParams: WhatsMsgDocumentOptions, _options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    throw new Error("Method not implemented.");
  }
  public async Poll(
    _chatId: string,
    _pollTitle: string,
    _selections: string[],
    _pollParams: WhatsMsgPollOptions,
    _moreOptions?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WAMessage | null> {
    throw new Error("Method not implemented.");
  }
  Location(_chatId: string, _ubicationParams: WhatsMsgUbicationOptions, _options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    throw new Error("Method not implemented.");
  }
  Contact(
    _chatId: string,
    _contacts: { name: string; phone: string } | Array<{ name: string; phone: string }>,
    _options?: WhatsMsgSenderSendingOptionsMINIMUM
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
