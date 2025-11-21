import { type WAMessage, type proto } from "baileys";
import type { MsgType, SenderType } from "../../../Msg.types.js";
import type { BotMinimalInfo } from "../bot.js";

/**
 * Arguments provided to a bot command when it is executed.
 *
 * Contains both metadata about the incoming message and
 * pre-parsed arguments extracted from the message text.
 */
export type CommandArgs = {
  /**
   * The raw WhatsApp message object from Baileys.
   * Gives full access to low-level details of the incoming message.
   */
  originalRawMsg: WAMessage;

  /**
   * Partipant ID new @LID whatsapp version. (Modern, used on newer groups)
   * Whatsapp ID of the user who triggered the command.
   * Example:
   */
  participantIdLID: string | null;

  /**
   * Participant ID old @whatsapp.es whatsapp version. (Legacy for older groups)
   * WhatsApp ID of the user who triggered the command.
   * Example: `5216121407908@s.whatsapp.net`.
   * Undefined if the sender could not be resolved.
   */
  participantIdPN: string | null;

  /**
   * WhatsApp ID of the chat where the command was triggered.
   * Can be a private chat ID or a group chat ID.
   */
  chatId: string;

  /**
   * LID-normalized chat identifier where the command was triggered.
   * - For private chats, `chatId` remains the PN-format ID while `chatId_LID`
   *   provides the equivalent LID version if it was resolved.
   * - For group chats, this will be `undefined` (js type) and
   *   may be undefined as well for older groups that only expose PN IDs.
   *
   * @version Added in `v0.24.0`
   */
  chatId_LID?: string;

  /**
   * Type of sender (e.g. private user, group participant, system).
   * Derived from the incoming message context.
   */
  senderType: SenderType;

  /**
   * The detected type of the incoming message.
   * Example: `"text"`, `"image"`, `"audio"`, etc.
   */
  msgType: MsgType;

  /**
   * Parsed arguments passed to the command.
   * Example: in `!ban @user reason here`, args would be `["@user", "reason", "here"]`.
   */
  args: string[];

  /**
   * Information about a quoted (replied-to) message, if present.
   * Useful for commands that operate on a specific previous message.
   */
  quotedMsgInfo: FoundQuotedMsg | null;

  botInfo: BotMinimalInfo;
};

/**
 * Represents a quoted (replied-to) message.
 */
export type FoundQuotedMsg = {
  /**
   * The raw quoted WhatsApp message object from Baileys.
   */
  msg: proto.IMessage;

  /**
   * The type of the quoted message (text, image, audio, etc.).
   */
  type: MsgType;
};
