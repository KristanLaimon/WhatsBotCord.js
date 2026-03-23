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
import type { WhatsbotcordMiddlewareFunct, WhatsbotcordMiddlewareFunct_OnFoundCommand } from "./core/bot/bot.js";
import type { IChatContextConfig } from "./core/bot/internals/ChatContext.js";
import type { CommandEntry } from "./core/bot/internals/CommandsSearcher.js";
import type { CommandArgs } from "./core/bot/internals/CommandsSearcher.types.js";
import type { IChatContext } from "./core/bot/internals/IChatContext.js";
import type { AdditionalAPI, ICommand } from "./core/bot/internals/ICommand.js";
import type {
  OfficialPlugin_OneCommandPerUserAtATime_Config,
  OfficialPlugin_OneCommandPerUserAtATime_ContextInfo,
} from "./core/official_plugins/OneCommandPerUser_Plugin.js";
import type { IWhatsSocket_Submodule_Receiver } from "./core/whats_socket/internals/IWhatsSocket.receiver.js";
import type { IWhatsSocket_Submodule_SugarSender } from "./core/whats_socket/internals/IWhatsSocket.sugarsender.js";
import type { GroupMetadataInfo, WhatsSocketReceiverError } from "./core/whats_socket/internals/WhatsSocket.receiver.js";
import type { IMsgServiceSocketMinimum, IWhatsSocket, IWhatsSocket_EventsOnly_Module } from "./core/whats_socket/IWhatsSocket.js";
import type { WhatsappMessage } from "./core/whats_socket/types.js";
import type { WhatsappIDInfo } from "./helpers/Whatsapp.helper.js";
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
  CommandEntry,
  GroupMetadataInfo,
  IChatContext,
  ICommand,
  IMsgServiceSocketMinimum,
  IWhatsSocket,
  IWhatsSocket_EventsOnly_Module,
  IWhatsSocket_Submodule_Receiver,
  IWhatsSocket_Submodule_SugarSender,
  WhatsbotcordMiddlewareFunct_OnFoundCommand as MiddlewareFunct_OnFoundCommand,
  MockEnqueueParamsDocument,
  MockEnqueueParamsLocation,
  MockEnqueueParamsMinimal,
  MockEnqueueParamsMultimedia,
  MockEnqueueParamsMultimediaMinimal,
  MockingChatParams,
  OfficialPlugin_OneCommandPerUserAtATime_Config,
  OfficialPlugin_OneCommandPerUserAtATime_ContextInfo,
  WhatsappIDInfo,
  WhatsappMessage,
  WhatsbotcordMiddlewareFunct,
  WhatsSocketReceiverError,
};

// == Runtime deps exporting ==
import Bot from "./core/bot/bot.js";
import { ChatContext } from "./core/bot/internals/ChatContext.js";
import { CommandType } from "./core/bot/internals/CommandsSearcher.js";
import OfficialPlugin_OneCommandPerUserAtATime from "./core/official_plugins/OneCommandPerUser_Plugin.js";
import { WhatsSocketReceiverHelper_isReceiverError, WhatsSocketReceiverMsgError } from "./core/whats_socket/internals/WhatsSocket.receiver.js";
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
  Bot as Whatsbotcord,
  WhatsSocket,
  WhatsSocketReceiverMsgError,
};

// === Helpers ===

/**
 * # Whatsapp Identifiers Postfixes
 *
 * Object containing all common patterns identifiers from WhatsApp API and
 * WhatsApp messages. Keep this for reference in your logic.
 *
 * @example
 * ```typescript
 * const isGroup = id.endsWith(Helpers.Whatsapp.IdentifiersPostfixes.Group_Suffix_ID);
 * ```
 * @deprecated Made for compatibility with versions prior 1.0.0. Import {Helpers} from "whatsbotcord", and use 'Helpers.Whatsapp.IdentifiersPostfixes' instead
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

/**
 * # WhatsApp Identifiers Helpers
 * Collection of helper functions for working with WhatsApp IDs and mentions.
 * Provides utilities to extract sender information, identify mentions,
 * and verify WhatsApp ID formats.
 *
 * @deprecated This exists only for compatibility with versions prior to 1.0.0.
 * Instead: import { Helpers } from "whatsbotcord" and use 'Helpers.Whatsapp'.
 */
export const WhatsappHelpers = {
  /**
   * ### Get Info From Sender Message
   * Extracts detailed ID information from a raw Baileys `WAMessage`.
   * It automatically determines if the ID is a LID or a standard PN.
   * @example
   * ```typescript
   * const info = WhatsappHelpers.GetWhatsInfoFromSenderMsg(rawMsg);
   * console.log(info.rawId); // "1234567890@s.whatsapp.net" or "123456789012345@lid"
   * ```
   */
  GetWhatsInfoFromSenderMsg: WhatsappHelper_ExtractWhatsappInfoInfoFromSenderRawMsg,

  /**
   * ### Get Info From WhatsApp ID
   * Parses a raw string ID (including the @ suffix) into a structured object.
   * @example
   * ```typescript
   * const info = WhatsappHelpers.GetWhatsInfoFromWhatsappID("5215551234567@s.whatsapp.net");
   * console.log(info.asMentionFormatted); // "@5215551234567"
   * ```
   */
  GetWhatsInfoFromWhatsappID: WhatsappHelper_ExtractFromWhatsappID,

  /**
   * ### Get Info From Mention String
   * Converts a user-facing mention (starting with @) into a system-ready ID info object.
   * @example
   * ```typescript
   * const mention = WhatsappHelpers.GetWhatsInfoFromMentionStr("@5215551234567");
   * if (mention) console.log(mention.rawId); // "5215551234567@lid"
   * ```
   */
  GetWhatsInfoFromMentionStr: WhatsappHelper_ExtractWhatsappInfoFromMention,

  /**
   * ### Is LID Identifier
   * Returns true if the ID follows the modern Linked Device Identifier format (`@lid`).
   * @example
   * ```typescript
   * const isLid = WhatsappHelpers.IsLIDId("123456789012345@lid"); // true
   * ```
   */
  IsLIDId: WhatsappHelper_isLIDIdentifier,

  /**
   * ### Is Mention String
   * Checks if a string is a valid WhatsApp mention (starts with the `@` prefix).
   * @example
   * ```typescript
   * const isMention = WhatsappHelpers.IsMentionString("@5215558889900"); // true
   * const isNotMention = WhatsappHelpers.IsMentionString("5215558889900"); // false
   * ```
   */
  IsMentionString: WhatsappHelper_isMentionId,

  /**
   * ### Is PN ID
   * Checks if the ID is a standard Phone Number identifier (`@s.whatsapp.net`).
   * @example
   * ```typescript
   * const isLegacy = WhatsappHelpers.IsPNId("5211234567890@s.whatsapp.net"); // true
   * ```
   */
  IsPNId: WhatsappHelper_isFullWhatsappIdUser,

  /**
   * ### Identifiers Postfixes
   * Access common WhatsApp ID suffixes (e.g., `@g.us`, `@s.whatsapp.net`, `@lid`).
   * @example
   * ```typescript
   * const isGroup = msg.key.remoteJid?.endsWith(WhatsappHelpers.IdentifiersPostfixes.Group_Suffix_ID);
   * ```
   */
  IdentifiersPostfixes: WhatsappIdentifiers,
};

export const Helpers = {
  /**
   * # External Message Helpers
   *
   * Collection of helper functions for working with WhatsApp messages.
   * Provides convenience methods to extract text or determine message types
   * from raw WhatsappMessages.
   *
   * @example
   * ```typescript
   * const text = Helpers.Msg.FullMsg_GetText(rawMsg);
   * ```
   */
  Msg: {
    FullMsg_GetQuotedMsgText: MsgHelper_FullMsg_GetQuotedMsgText,
    FullMsg_GetMsgType: MsgHelper_FullMsg_GetMsgType,
    FullMsg_GetText: MsgHelper_FullMsg_GetText,
    FullMsg_GetQuotedMsgObj: MsgHelper_FullMsg_GetQuotedMsg,
    FullMsg_GetSenderType: MsgHelper_FullMsg_GetSenderType,
    QuotedMsg_GetText: MsgHelper_QuotedMsg_GetText,
    AnyMsg_GetMsgType: MsgHelper_ProtoMsg_GetMsgType,
  },
  /**
 * # WhatsApp Identifiers Helpers

 * Collection of helper functions for working with WhatsApp IDs and mentions.
 * Provides utilities to extract sender information, identify mentions,
 * and verify WhatsApp ID formats.

 * @example
 * ```typescript
 * const isPN = Helpers.Whatsapp.IsPNId("123@s.whatsapp.net");
 * ```
 */
  Whatsapp: WhatsappHelpers,

  /**
   * # Debugging Utilities
   *
   * Useful collection of functions for debugging WhatsApp behavior locally.
   *
   * @example
   * ```typescript
   * Helpers.Debugging.StoreMsgInHistoryJson(rawMsg);
   * ```
   */
  Debugging: {
    StoreMsgInHistoryJson: Debug_StoreWhatsMsgHistoryInJson,
  },

  ChatContext_IsWaitError: WhatsSocketReceiverHelper_isReceiverError,
};

// === Main Default Export ===
export default Whatsbotcord;
