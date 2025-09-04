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
import type { ChatContext } from "./core/bot/internals/ChatSession";
import type { CommandArgs } from "./core/bot/internals/CommandsSearcher.types";
import type { RawMsgAPI } from "./core/bot/internals/IBotCommand";
export type { ChatContext, CommandArgs, RawMsgAPI };

// == Runtime deps exporting ==
import { MsgType, SenderType } from "./Msg.types";
import { CommandType } from "./core/bot/internals/CommandsSearcher";
export { CommandType, MsgType, SenderType };

// === Helpers ===
/**
 * Collection of helper functions for working with WhatsApp messages.
 *
 * Provides convenience methods to extract text or determine message types
 * from raw Baileys `WAMessage` objects.
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

// === Main Default Export ===
export default Whatsbotcord;
