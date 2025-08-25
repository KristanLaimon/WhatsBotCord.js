import type { AnyMessageContent, WAMessageUpdate, GroupMetadata, MiscMessageGenerationOptions, WAMessage } from 'baileys';
import type Delegate from '../../libs/Delegate';
import { MsgType, SenderType } from '../../Msg.types';

interface ICanSendMsgs {
  /**
   * Send a message to a specific chat ID with content and optionally with other options.
   *
   * _*This is the function you must use to send messages generally.*_
   * 
   * _Do not use SendRaw() from this class unless you know what are you doing._
   * 
   * This Send() function uses a queue to normalize the quantity of messages to send, to prevent
   * overflow of messages in case this socket has been spammed with msgs from someone.
   *
   * SendRaw() doesn't protect you from that, it's the direct interface to most 'low level'
   * interaction with the socket.
   * @param chatId_JID Whatsapp chat id of the user you want to send the message to (e.g: "1234567890@c.us")
   * @param content The content of the message. It can be a string, a buffer, an object, or a function that returns a string or buffer.
   * @param options A collection of options that can be used to customize the message. Check the type definition of MiscMessageGenerationOptions for more information.
   */
  SendSafe(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WAMessage | null>;

  /**
   * Sends a message to a specific chat ID with content and optionally with other options.
   * 
   * _Do not use this unless you know what are you doing._
   * 
   * This is the direct interface to most 'low level' interaction with the socket.
   * It doesn't protect you from flooding the socket with messages and causing a ban.
   * 
   * Use Send() from this class instead, unless you really need to send messages directly
   * to the socket without any kind of protection.
   * 
   * @param chatId_JID Whatsapp chat id of the user you want to send the message to (e.g: "1234567890@c.us")
   * @param content The content of the message. It can be a string, a buffer, an object, or a function that returns a string or buffer.
   * @param options A collection of options that can be used to customize the message. Check the type definition of MiscMessageGenerationOptions for more information.
   */
  SendRaw(chatId_JID: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions): Promise<WAMessage | null>
}

export interface IWhatsSocketMinimum extends ICanSendMsgs {
  //Only Send*() related functions
}

/**
 * Public interface for the WhatsSocket class.
 * It defines the contract for interacting with the WhatsApp socket client.
 */
export interface IWhatsSocket extends ICanSendMsgs {
  //  ============= Public Delegates for handling events ================
  onReconnect: Delegate<() => Promise<void>>;
  /**
   * Delegate event to subscribe AFTER sending a message.
   * Useful to verify if a msg was really sent
   */
  onSentMessage: Delegate<(chatId: string, rawContentMsg: AnyMessageContent, optionalMisc?: MiscMessageGenerationOptions) => void>;
  /**
   * Delegate event to subscribe when socket receives a raw message!
   * Fun fact: Before it was named 'onMessageIncoming' event 
   */
  onMessageUpsert: Delegate<(senderId: string | null, chatId: string, rawMsg: WAMessage, msgType: MsgType, senderType: SenderType) => void>;
  /**
   * Delegate event to subscribe when an already sent messsage (like a pull) receives an update
   */
  onMessageUpdate: Delegate<(senderId: string | null, chatId: string, rawMsgUpdate: WAMessageUpdate, msgType: MsgType, senderType: SenderType) => void>;
  onGroupEnter: Delegate<(groupInfo: GroupMetadata) => void>;
  onGroupUpdate: Delegate<(groupInfo: Partial<GroupMetadata>) => void>;
  onStartupAllGroupsIn: Delegate<(allGroupsIn: GroupMetadata[]) => void>;

  ownJID: string;

  // Public Methods
  Start(): Promise<void>;
  Shutdown(): Promise<void>;

  /**
   * Gets the metadata of a group chat by its chat ID. (e.g: "23423423123@g.us")
   * @param chatId The chat ID of the group you want to get metadata from.
   * @throws Will throw an error if the provided chatId is not a group chat ID
   * @returns A promise that resolves to the group metadata.
   */
  GetGroupMetadata(chatId: string): Promise<GroupMetadata>;
}