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
  WhatsappHelper_ExtractFromWhatsappID,
  WhatsappHelper_ExtractWhatsappInfoFromMention,
  WhatsappHelper_ExtractWhatsappInfoInfoFromSenderRawMsg,
  WhatsappHelper_isFullWhatsappIdUser,
  WhatsappHelper_isLIDIdentifier,
  WhatsappHelper_isMentionId,
} from "./helpers/Whatsapp.helper.js";

// === Types deps exporting ===
import type { WhatsbotcordMiddlewareFunct } from "./core/bot/bot.js";
import type { IChatContextConfig } from "./core/bot/internals/ChatContext.js";
import type { CommandArgs } from "./core/bot/internals/CommandsSearcher.types.js";
import type { IChatContext } from "./core/bot/internals/IChatContext.js";
import type { AdditionalAPI, ICommand } from "./core/bot/internals/ICommand.js";
import type { OfficialPlugin_OneCommandPerUserAtATime_Config } from "./core/official_plugins/OneCommandPerUser_Plugin.js";
import type { IWhatsSocket_Submodule_Receiver } from "./core/whats_socket/internals/IWhatsSocket.receiver.js";
import type { IWhatsSocket_Submodule_SugarSender } from "./core/whats_socket/internals/IWhatsSocket.sugarsender.js";
import type { WhatsSocketReceiverError } from "./core/whats_socket/internals/WhatsSocket.receiver.js";
import type { IMsgServiceSocketMinimum, IWhatsSocket_EventsOnly_Module } from "./core/whats_socket/IWhatsSocket.js";
import type { WhatsappMessage } from "./core/whats_socket/types.js";
import type {
  MockEnqueueParamsDocument,
  MockEnqueueParamsLocation,
  MockEnqueueParamsMinimal,
  MockEnqueueParamsMultimedia,
  MockEnqueueParamsMultimediaMinimal,
  MockingChatParams,
} from "./mocking_suite/ChatMock.js";
export type {
  AdditionalAPI,
  IChatContextConfig as ChatContextConfig,
  CommandArgs,
  IChatContext,
  ICommand,
  IMsgServiceSocketMinimum,
  IWhatsSocket_EventsOnly_Module,
  IWhatsSocket_Submodule_Receiver,
  IWhatsSocket_Submodule_SugarSender,
  MockEnqueueParamsDocument,
  MockEnqueueParamsLocation,
  MockEnqueueParamsMinimal,
  MockEnqueueParamsMultimedia,
  MockEnqueueParamsMultimediaMinimal,
  MockingChatParams,
  OfficialPlugin_OneCommandPerUserAtATime_Config,
  WhatsappMessage,
  WhatsbotcordMiddlewareFunct,
  WhatsSocketReceiverError,
};

// == Runtime deps exporting ==
import { ChatContext } from "./core/bot/internals/ChatContext.js";
import { CommandType } from "./core/bot/internals/CommandsSearcher.js";
import OfficialPlugin_OneCommandPerUserAtATime from "./core/official_plugins/OneCommandPerUser_Plugin.js";
import { WhatsSocketReceiverMsgError } from "./core/whats_socket/internals/WhatsSocket.receiver.js";
import WhatsSocket from "./core/whats_socket/WhatsSocket.js";
import { Debug_StoreWhatsMsgHistoryInJson } from "./Debugging.helper.js";
import CreateCommand from "./helpers/CommandForJs.helper.js";
import { WhatsappIdType } from "./helpers/Whatsapp.helper.js";
import Delegate from "./libs/Delegate.js";
import ChatMock from "./mocking_suite/ChatMock.js";
import { MsgType, SenderType } from "./Msg.types.js";
import { WhatsappGroupIdentifier, WhatsappLIDIdentifier, WhatsappPhoneNumberIdentifier } from "./Whatsapp.types.js";
export {
  ChatContext,
  ChatMock,
  CommandType,
  CreateCommand,
  Delegate,
  MsgType,
  OfficialPlugin_OneCommandPerUserAtATime,
  SenderType,
  WhatsappIdType,
  WhatsSocket,
  WhatsSocketReceiverMsgError,
};

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
  FullMsg_GetQuotedMsgObj: MsgHelper_FullMsg_GetQuotedMsg,
  FullMsg_GetSenderType: MsgHelper_FullMsg_GetSenderType,
  QuotedMsg_GetText: MsgHelper_QuotedMsg_GetText,
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
  GetWhatsInfoFromWhatsappID: WhatsappHelper_ExtractFromWhatsappID,
  GetWhatsInfoFromMentionStr: WhatsappHelper_ExtractWhatsappInfoFromMention,
  IsLIDId: WhatsappHelper_isLIDIdentifier,
  IsMentionString: WhatsappHelper_isMentionId,
  IsPNId: WhatsappHelper_isFullWhatsappIdUser,
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
  Group_Suffix_ID: WhatsappGroupIdentifier,
  /**
   * Identifer for local IDs. Example: "@lid"
   *
   * @note Just for reference
   */
  LID_Suffix_ID: WhatsappLIDIdentifier,
  /**
   * Identifier for individual user chats. Example: "@s.whatsapp.net"
   *
   * @note Just for reference
   */
  PhoneNumber_Suffix_ID: WhatsappPhoneNumberIdentifier,
};

// === Main Default Export ===
export default Whatsbotcord;

//TODO: Add tests for ChatContexts.CloneForksWithoutInitialMsg to update its initialmsg when sending any main principal msg
