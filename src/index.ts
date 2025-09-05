import Whatsbotcord from "./core/bot/bot";
import { MsgHelper_GetMsgTypeFromRawMsg, MsgHelper_GetQuotedMsgTextFrom, MsgHelper_GetTextFrom } from "./helpers/Msg.helper";
import {
  WhatsappHelper_ExtractWhatsappIdFromMention,
  WhatsappHelper_ExtractWhatsappIdInfoFromSenderRawMsg,
  WhatsappHelper_isFullWhatsappIdUser,
  WhatsappHelper_isLIDIdentifier,
  WhatsappHelper_isMentionId,
} from "./helpers/Whatsapp.helper";

// === Types deps exporting ===
import type { ChatContextConfig } from "./core/bot/internals/ChatContext";
import type { CommandArgs } from "./core/bot/internals/CommandsSearcher.types";
import type { IBotCommand, RawMsgAPI } from "./core/bot/internals/IBotCommand";
import type { WhatsappMessage } from "./core/whats_socket/types";
export type { ChatContextConfig, CommandArgs, IBotCommand, RawMsgAPI, WhatsappMessage };

// == Runtime deps exporting ==
import { ChatContext } from "./core/bot/internals/ChatContext";
import { CommandType } from "./core/bot/internals/CommandsSearcher";
import WhatsSocket from "./core/whats_socket/WhatsSocket";
import Delegate from "./libs/Delegate";
import { MsgType, SenderType } from "./Msg.types";
import { WhatsappGroupIdentifier, WhatsappIndividualIdentifier, WhatsappLIDIdentifier } from "./Whatsapp.types";
export { ChatContext, CommandType, Delegate, MsgType, SenderType, WhatsSocket };

// === Helpers ===
/**
 * Collection of helper functions for working with WhatsApp messages.
 *
 * Provides convenience methods to extract text or determine message types
 * from raw WhatsappMessages
 */
export const MsgHelpers = {
  GetTextFromQuotedMsg: MsgHelper_GetQuotedMsgTextFrom,
  GetMsgTypeFrom: MsgHelper_GetMsgTypeFromRawMsg,
  GetTextFromMsg: MsgHelper_GetTextFrom,
};

/**
 * Collection of helper functions for working with WhatsApp IDs and mentions.
 *
 * Provides utilities to extract sender information, identify mentions,
 * and verify WhatsApp ID formats.
 */
export const WhatsappHelpers = {
  GetWhatsInfoFromSenderMsg: WhatsappHelper_ExtractWhatsappIdInfoFromSenderRawMsg,
  GetWhatsInfoFromMentionStr: WhatsappHelper_ExtractWhatsappIdFromMention,
  IsLidIdentifier: WhatsappHelper_isLIDIdentifier,
  IsMentionString: WhatsappHelper_isMentionId,
  IsIDIdentifier: WhatsappHelper_isFullWhatsappIdUser,
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
