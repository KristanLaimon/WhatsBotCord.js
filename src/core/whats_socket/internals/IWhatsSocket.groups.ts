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
  normalizeJid(jid: string): string;

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
  getBotJid(): string;

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
  getMetadata(groupId: string): Promise<WhatsappGroupMetadata>;

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
  getAll(): Promise<WhatsappGroupMetadata[]>;

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
  findByName(name: string): Promise<WhatsappGroupMetadata | null>;

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
  isBotAdmin(groupId: string): Promise<boolean>;

  updateParticipants(groupId: string, participants: string[], action: WhatsappGroupParticipantAction): Promise<unknown[]>;

  addParticipants(groupId: string, participants: string[]): Promise<unknown[]>;

  removeParticipants(groupId: string, participants: string[]): Promise<unknown[]>;

  promoteParticipants(groupId: string, participants: string[]): Promise<unknown[]>;

  demoteParticipants(groupId: string, participants: string[]): Promise<unknown[]>;

  removeAllParticipants(groupId: string): Promise<void>;

  leave(groupId: string): Promise<void>;

  deleteChat(groupId: string): Promise<void>;

  cleanup(groupId: string): Promise<void>;

  /**
   * Retrieves metadata about a WhatsApp group chat.
   *
   * This method fetches all relevant information from the WhatsApp group,
   * including the list of participants, group owner, description, invite code, and
   * group settings like whether only admins can send messages or change group settings.
   *
   * @param chatId - The WhatsApp ID of the group to fetch metadata for.
   * @returns A promise resolving to `GroupMetadataInfo` containing the group metadata,
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
