import type { WhatsappGroupMetadata, WhatsappGroupParticipantAction } from "../types.js";
import type { GroupMetadataInfo } from "./WhatsSocket.receiver.js";

/**
 * # WhatsSocket Group Submodule
 *
 * Public grouped API for WhatsApp group utilities.
 *
 * @example
 * ```typescript
 * const groups = await socket.group.getAll();
 * const isAdmin = await socket.group.isBotAdmin("123@g.us");
 * ```
 */
export interface IWhatsSocket_Submodule_Group {
  /**
   * Normalizes any WhatsApp JID into the vendor canonical form.
   *
   * @param jid - WhatsApp JID to normalize.
   * @returns The normalized WhatsApp JID.
   *
   * @example
   * ```typescript
   * const jid = socket.group.normalizeJid("123@s.whatsapp.net");
   * ```
   */
  NormalizeJid(jid: string): string;

  /**
   * Gets the connected bot account JID.
   *
   * @returns The normalized bot JID.
   *
   * @example
   * ```typescript
   * const botJid = socket.group.getBotJid();
   * ```
   */
  GetBotJid(): string;

  /**
   * Fetches raw metadata for one group.
   *
   * @param groupId - WhatsApp group JID.
   * @returns Group metadata.
   *
   * @example
   * ```typescript
   * const metadata = await socket.group.getMetadata("123@g.us");
   * ```
   */
  GetMetadata(groupId: string): Promise<WhatsappGroupMetadata>;

  /**
   * Fetches every group the bot is participating in.
   *
   * @returns All participating group metadata.
   *
   * @example
   * ```typescript
   * const groups = await socket.group.getAll();
   * ```
   */
  GetAll(): Promise<WhatsappGroupMetadata[]>;

  /**
   * Finds a participating group by its exact subject.
   *
   * @param name - Group subject to search for.
   * @returns Matching metadata or `null`.
   *
   * @example
   * ```typescript
   * const group = await socket.group.findByName("Team");
   * ```
   */
  FindByName(name: string): Promise<WhatsappGroupMetadata | null>;

  /**
   * Checks whether the bot is an admin in a group.
   *
   * @param groupId - WhatsApp group JID.
   * @returns `true` when the bot is admin or superadmin.
   *
   * @example
   * ```typescript
   * if (await socket.group.isBotAdmin("123@g.us")) {
   *   await socket.group.addParticipants("123@g.us", ["456@s.whatsapp.net"]);
   * }
   * ```
   */
  IsBotAdmin(groupId: string): Promise<boolean>;

  /**
   * # Update Group Participants
   *
   * Executes a participant action (add, remove, promote, demote) on a group.
   * Internal method typically wrapped by specific action methods.
   *
   * @param groupId - WhatsApp group JID.
   * @param participants - Array of participant JIDs.
   * @param action - Action to perform (`WhatsappGroupParticipantAction`).
   * @returns A boolean indicating if the action was executed successfully.
   *
   * @example
   * ```typescript
   * const success = await socket.group.updateParticipants("123@g.us", ["456@s.whatsapp.net"], "add");
   * ```
   */
  UpdateParticipants(groupId: string, participants: string[], action: WhatsappGroupParticipantAction): Promise<boolean>;

  /**
   * # Add Participants
   *
   * Adds new participants to the group. The bot must be an admin.
   *
   * @param groupId - WhatsApp group JID.
   * @param participants - Array of participant JIDs to add.
   * @returns A boolean indicating if the additions were executed successfully.
   *
   * @example
   * ```typescript
   * const success = await socket.group.addParticipants("123@g.us", ["456@s.whatsapp.net", "789@s.whatsapp.net"]);
   * ```
   */
  AddParticipants(groupId: string, participants: string[]): Promise<boolean>;

  /**
   * # Remove Participants
   *
   * Removes existing participants from the group. The bot must be an admin.
   *
   * @param groupId - WhatsApp group JID.
   * @param participants - Array of participant JIDs to remove.
   * @returns A boolean indicating if the removals were executed successfully.
   *
   * @example
   * ```typescript
   * const success = await socket.group.removeParticipants("123@g.us", ["456@s.whatsapp.net"]);
   * ```
   */
  RemoveParticipants(groupId: string, participants: string[]): Promise<boolean>;

  /**
   * # Promote Participants
   *
   * Promotes regular participants to admins. The bot must be an admin.
   *
   * @param groupId - WhatsApp group JID.
   * @param participants - Array of participant JIDs to promote.
   * @returns A boolean indicating if the promotions were executed successfully.
   *
   * @example
   * ```typescript
   * const success = await socket.group.promoteParticipants("123@g.us", ["456@s.whatsapp.net"]);
   * ```
   */
  PromoteParticipants(groupId: string, participants: string[]): Promise<boolean>;

  /**
   * # Demote Participants
   *
   * Demotes admins to regular participants. The bot must be an admin.
   *
   * @param groupId - WhatsApp group JID.
   * @param participants - Array of participant JIDs to demote.
   * @returns A boolean indicating if the demotions were executed successfully.
   *
   * @example
   * ```typescript
   * const success = await socket.group.demoteParticipants("123@g.us", ["456@s.whatsapp.net"]);
   * ```
   */
  DemoteParticipants(groupId: string, participants: string[]): Promise<boolean>;

  /**
   * # Remove All Participants
   *
   * Removes every non-admin participant from the group. The bot must be an admin.
   *
   * @param groupId - WhatsApp group JID.
   * @returns Resolves when the operation is complete.
   *
   * @example
   * ```typescript
   * await socket.group.removeAllParticipants("123@g.us");
   * ```
   */
  RemoveAllParticipants(groupId: string): Promise<void>;

  /**
   * # Leave Group
   *
   * Instructs the bot to leave the specified group.
   *
   * @param groupId - WhatsApp group JID.
   * @returns Resolves when the bot successfully leaves.
   *
   * @example
   * ```typescript
   * await socket.group.leave("123@g.us");
   * ```
   */
  Leave(groupId: string): Promise<void>;

  /**
   * # Delete Chat
   *
   * Deletes the specified chat from the bot's local chat history.
   *
   * @param groupId - WhatsApp group JID.
   * @returns Resolves when the chat is deleted locally.
   *
   * @example
   * ```typescript
   * await socket.group.deleteChat("123@g.us");
   * ```
   */
  DeleteChat(groupId: string): Promise<void>;

  /**
   * # Cleanup Group
   *
   * Removes all participants and then leaves and deletes the group.
   * Equivalent to a full group wipe out.
   *
   * @param groupId - WhatsApp group JID.
   * @returns Resolves when cleanup is entirely complete.
   *
   * @example
   * ```typescript
   * await socket.group.cleanup("123@g.us");
   * ```
   */
  Cleanup(groupId: string): Promise<void>;

  /**
   * # Fetch Group Data
   *
   * Retrieves metadata about a WhatsApp group chat.
   *
   * This method fetches all relevant information from the WhatsApp group,
   * including the list of participants, group owner, description, invite code, and
   * group settings like whether only admins can send messages or change group settings.
   *
   * @param chatId - The WhatsApp ID of the group to fetch metadata for.
   * @returns A promise resolving to `GroupMetadataInfo` containing the group metadata,
   *          or `null` if the metadata could not be retrieved.
   *
   * @example
   * ```typescript
   * const groupId = "123456789-987654321@g.us";
   * const groupData = await socket.group.FetchGroupData(groupId);
   * 
   * if (groupData) {
   *   console.log("Group Name:", groupData.groupName);
   *   console.log("Participants:", groupData.members.map(m => m.rawId));
   * } else {
   *   console.error("Failed to fetch group metadata.");
   * }
   * ```
   */
  FetchGroupData(chatId: string): Promise<GroupMetadataInfo | null>;

  /**
   * # Create Group
   *
   * Creates a new WhatsApp group with the specified subject and participants list.
   *
   * @param subject - The name or subject of the new group.
   * @param participants - List of participant JIDs (must be in format: number@s.whatsapp.net).
   * @returns A promise resolving to the metadata of the newly created group.
   *
   * @example
   * ```typescript
   * const groupMetadata = await socket.Group.CreateGroup("Mi Grupo", ["123@s.whatsapp.net"]);
   * console.log("New Group JID:", groupMetadata.id);
   * ```
   */
  CreateGroup(subject: string, participants: string[]): Promise<WhatsappGroupMetadata>;
}
