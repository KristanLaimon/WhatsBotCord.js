import Whatsbotcord from "./core/bot/bot.js";
import {
  MsgHelper_FullMsg_GetMsgType,
  MsgHelper_FullMsg_GetQuotedMsg,
  MsgHelper_FullMsg_GetQuotedMsgText,
  MsgHelper_FullMsg_GetSenderType,
  MsgHelper_FullMsg_GetText,
  MsgHelper_ProtoMsg_GetMsgType,
  MsgHelper_QuotedMsg_GetText,
} from "./helpers/Msg.helper.js";
import {
  WhatsappHelper_ExtractWhatsappInfoFromMention,
  WhatsappHelper_ExtractWhatsappInfoInfoFromSenderRawMsg,
  WhatsappHelper_isFullWhatsappIdUser,
  WhatsappHelper_isLIDIdentifier,
  WhatsappHelper_isMentionId,
} from "./helpers/Whatsapp.helper.js";

// === Types deps exporting ===
import type { BotMiddleWareFunct } from "./core/bot/bot.js";
import type { ChatContextConfig } from "./core/bot/internals/ChatContext.js";
import type { CommandArgs } from "./core/bot/internals/CommandsSearcher.types.js";
import type { ICommand, RawMsgAPI } from "./core/bot/internals/IBotCommand.js";
import type { WhatsSocketReceiverError } from "./core/whats_socket/internals/WhatsSocket.receiver.js";
import type { WhatsappMessage } from "./core/whats_socket/types.js";
export type { BotMiddleWareFunct, ChatContextConfig, CommandArgs, ICommand as IBotCommand, RawMsgAPI, WhatsappMessage, WhatsSocketReceiverError };

// == Runtime deps exporting ==
import { ChatContext } from "./core/bot/internals/ChatContext.js";
import { CommandType } from "./core/bot/internals/CommandsSearcher.js";
import { WhatsSocketReceiverMsgError } from "./core/whats_socket/internals/WhatsSocket.receiver.js";
import WhatsSocket from "./core/whats_socket/WhatsSocket.js";
import { Debug_StoreWhatsMsgHistoryInJson } from "./Debugging.helper.js";
import Delegate from "./libs/Delegate.js";
import { MsgType, SenderType } from "./Msg.types.js";
import { WhatsappGroupIdentifier, WhatsappIndividualIdentifier, WhatsappLIDIdentifier } from "./Whatsapp.types.js";
export { ChatContext, CommandType, Delegate, MsgType, SenderType, WhatsSocket, WhatsSocketReceiverMsgError };

// === Helpers ===
/**
 * Collection of helper functions for working with WhatsApp messages.
 *
 * Provides convenience methods to extract text or determine message types
 * from raw WhatsappMessages
 */
export const MsgHelpers = {
  FullMsg_GetQuotedMsgText: MsgHelper_FullMsg_GetQuotedMsgText,
  FullMsg_GetMsgType: MsgHelper_FullMsg_GetMsgType,
  FullMsg_GetText: MsgHelper_FullMsg_GetText,
  QuotedMsg_GetText: MsgHelper_QuotedMsg_GetText,
  FullMsg_GetQuotedMsgObj: MsgHelper_FullMsg_GetQuotedMsg,
  FullMsg_GetSenderType: MsgHelper_FullMsg_GetSenderType,
  AnyMsg_GetMsgType: MsgHelper_ProtoMsg_GetMsgType,
};

/**
 * Collection of helper functions for working with WhatsApp IDs and mentions.
 *
 * Provides utilities to extract sender information, identify mentions,
 * and verify WhatsApp ID formats.
 */
export const WhatsappHelpers = {
  GetWhatsInfoFromSenderMsg: WhatsappHelper_ExtractWhatsappInfoInfoFromSenderRawMsg,
  GetWhatsInfoFromMentionStr: WhatsappHelper_ExtractWhatsappInfoFromMention,
  IsLidIdentifier: WhatsappHelper_isLIDIdentifier,
  IsMentionString: WhatsappHelper_isMentionId,
  IsIDIdentifier: WhatsappHelper_isFullWhatsappIdUser,
};

/**
 * Useful collection of functions for debugging whatsapp related stuff. (Optional use)
 */
export const DebuggingHelpers = {
  StoreMsgInHistoryJson: Debug_StoreWhatsMsgHistoryInJson,
};

/**
 * Object containing all common patterns identifers from whatsapp API and
 * Whatsapp messages.
 * For example: "@s.whatsapp.net"
 */
export const WhatsappIdentifiers = {
  /**
   * Identifier for group chats. Example: "@g.us"
   *
   * @note Just for reference
   */
  GroupIdentifier: WhatsappGroupIdentifier,
  /**
   * Identifer for local IDs. Example: "@lid"
   *
   * @note Just for reference
   */
  LIDIdentifier: WhatsappLIDIdentifier,
  /**
   * Identifier for individual user chats. Example: "@s.whatsapp.net"
   *
   * @note Just for reference
   */
  IndividualUserIdentifier: WhatsappIndividualIdentifier,
};

// === Main Default Export ===
export default Whatsbotcord;
