import type { MsgType } from "../../../Msg.types.js";
import type { WhatsappMessage } from "../types.js";
import type { GroupMetadataInfo, WhatsSocketReceiverWaitOptions } from "./WhatsSocket.receiver.js";

export interface IWhatsSocket_Submodule_Receiver {
  /**
   * Waits for the next message from a specific user in a group chat.
   *
   * The returned promise resolves only if the specified participant sends
   * a message of the expected type.
   *
   * If the timeout is reached, or if the wait is explicitly cancelled,
   * the promise may reject or throw an error depending on configuration.
   *
   * @throws error if timeout reached or user canceled with a cancel keyword
   * @param userIDToWait - The participant ID to wait for.
   * @param chatToWaitOnID - Group chat ID to monitor.
   * @param expectedMsgType - The type of message to wait for.
   * @param options - Options such as timeout duration, cancel keywords, etc.
   * @returns Resolves with the next `WhatsappMessage` from the specified user,
   *          or rejects/throws on timeout or cancellation.
   * @example
   * ```ts
   * const receiver: IWhatsSocket_Submodule_Receiver; // Assume initialized
   * const userId = "1234567890@s.whatsapp.net";
   * const groupId = "123456789-987654321@g.us";
   * const options: WhatsSocketReceiverWaitOptions = {
   *   timeoutSeconds: 60,
   *   cancelKeywords: ["cancel", "stop"],
   *   wrongTypeFeedbackMsg: "Please send a text message.",
   *   cancelFeedbackMsg: "Operation cancelled.",
   *   ignoreSelfMessages: true
   * };
   * try {
   *   const message = await receiver.WaitUntilNextRawMsgFromUserIDInGroup(
   *     userId,
   *     groupId,
   *     MsgType.Text,
   *     options
   *   );
   *   console.log("Received message:", message);
   * } catch (error) {
   *   console.error("Error waiting for message:", error);
   * }
   * ```
   */
  WaitUntilNextRawMsgFromUserIDInGroup(
    userIDToWait: string,
    chatToWaitOnID: string,
    expectedMsgType: MsgType,
    options: WhatsSocketReceiverWaitOptions
  ): Promise<WhatsappMessage>;

  /**
   * Waits for the next message from a specific user in a private 1:1 conversation.
   *
   * Fun fact: WhatsApp treats the user ID itself as the chat ID in private conversations.
   *
   * The returned promise resolves only if the specified user sends a message of
   * the expected type.
   *
   * If the timeout is reached, or if the wait is explicitly cancelled,
   * the promise may reject or throw an error depending on configuration.
   * @throws error if timeout reached or user canceled with a cancel keyword
   * @param userIdToWait - The user ID to wait for.
   * @param expectedMsgType - The type of message to wait for.
   * @param options - Options such as timeout duration, cancel keywords, etc.
   * @returns Resolves with the next `WhatsappMessage` from the specified user,
   *          or rejects/throws on timeout or cancellation.
   * @example
   * ```ts
   * const receiver: IWhatsSocket_Submodule_Receiver; // Assume initialized
   * const userId = "1234567890@s.whatsapp.net";
   * const options: WhatsSocketReceiverWaitOptions = {
   *   timeoutSeconds: 30,
   *   cancelKeywords: ["cancel"],
   *   wrongTypeFeedbackMsg: "Expected a text message.",
   *   cancelFeedbackMsg: "Cancelled by user.",
   *   ignoreSelfMessages: true
   * };
   * try {
   *   const message = await receiver.WaitUntilNextRawMsgFromUserIdInPrivateConversation(
   *     userId,
   *     MsgType.Text,
   *     options
   *   );
   *   console.log("Received private message:", message);
   * } catch (error) {
   *   console.error("Error waiting for private message:", error);
   * }
   * ```
   */
  WaitUntilNextRawMsgFromUserIdInPrivateConversation(
    userIdToWait: string,
    expectedMsgType: MsgType,
    options: WhatsSocketReceiverWaitOptions
  ): Promise<WhatsappMessage>;

  /**
   * Retrieves metadata about a WhatsApp group chat.
   *
   * This method fetches all relevant information from the WhatsApp group,
   * including the list of participants, group owner, description, invite code, and
   * group settings like whether only admins can send messages or change group settings.
   *
   * @param chatId - The WhatsApp ID of the group to fetch metadata for.
   * @returns A promise resolving to `ChatContextGroupData` containing the group metadata,
   *          or `null` if the metadata could not be retrieved.
   * @example
   * ```ts
   * const receiver: IWhatsSocket_Submodule_Receiver; // Assume initialized
   * const groupId = "123456789-987654321@g.us";
   * const groupData = await receiver.GetGroupMetadata(groupId);
   * if (groupData) {
   *   console.log("Group Name:", groupData.groupName);
   *   console.log("Participants:", groupData.members.map(m => m.rawId));
   * } else {
   *   console.error("Failed to fetch group metadata.");
   * }
   * ```
   */
  FetchGroupData(chatId: string): Promise<GroupMetadataInfo | null>;
}
