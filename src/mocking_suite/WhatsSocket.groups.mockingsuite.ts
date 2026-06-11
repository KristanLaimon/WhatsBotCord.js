import { type GroupMetadataInfo } from "../core/whats_socket/internals/WhatsSocket.receiver.js";
import { WhatsappIdType } from "../helpers/Whatsapp.helper.js";
import { WhatsappGroupIdentifier } from "../Whatsapp.types.js";
import type { IWhatsSocket_Submodule_Group } from "../core/whats_socket/internals/IWhatsSocket.groups.js";
import type { WhatsappGroupMetadata, WhatsappGroupParticipantAction } from "../core/whats_socket/types.js";

/**
 * A mocking implementation of `IWhatsSocket_Submodule_Group` designed for unit testing.
 * This class simulates the behavior of group management without interacting
 * with the actual WhatsApp socket.
 */
export default class WhatsSocket_Submodule_Groups_MockingSuite implements IWhatsSocket_Submodule_Group {
  /**
   * Config: Actual metadata to mock when executing command (Environment mock)
   */
  private _groupMetadataToSendMock: GroupMetadataInfo;

  public get GroupMetadataToSendMock(): GroupMetadataInfo | undefined {
    return this._groupMetadataToSendMock;
  }

  //=================================================== Spy External Methods ==================================================
  public Actions: Array<{
    actionName: string;
    groupId: string;
    payload?: any;
  }> = [];
  //===========================================================================================================================

  public constructor() {
    this._groupMetadataToSendMock = GenerateDefaultGroupMetadata();
  }

  public SetGroupMetadataMock(mock: Partial<GroupMetadataInfo>) {
    this._groupMetadataToSendMock = GenerateDefaultGroupMetadata(mock);
  }

  public ResetGroupMetadata() {
    this._groupMetadataToSendMock = GenerateDefaultGroupMetadata();
  }

  public ClearMocks() {
    this.Actions = [];
    this._groupMetadataToSendMock = GenerateDefaultGroupMetadata();
  }

  public async FetchGroupData(_chatId: string): Promise<GroupMetadataInfo | null> {
    if (_chatId) {
      return { ...this._groupMetadataToSendMock, id: _chatId };
    } else {
      return this._groupMetadataToSendMock;
    }
  }

  public async getMetadata(groupId: string): Promise<WhatsappGroupMetadata> {
    this.Actions.push({ actionName: "getMetadata", groupId });
    return {
      id: groupId,
      subject: this._groupMetadataToSendMock.groupName,
      creation: this._groupMetadataToSendMock.creationDate ?? Date.now(),
      owner: this._groupMetadataToSendMock.ownerName ?? undefined,
      desc: this._groupMetadataToSendMock.groupDescription ?? undefined,
      participants: this._groupMetadataToSendMock.members.map((m) => ({
        id: m.WhatsappIdType === WhatsappIdType.Legacy ? m.rawId + "@s.whatsapp.net" : undefined,
        lid: m.WhatsappIdType === WhatsappIdType.Modern ? m.rawId + "@lid" : undefined,
        admin: m.isAdmin ? "admin" : null,
      })),
    };
  }

  public normalizeJid(jid: string): string {
    return jid.trim();
  }

  public getBotJid(): string {
    return "mockbotjid@s.whatsapp.net";
  }

  public async getAll(): Promise<WhatsappGroupMetadata[]> {
    this.Actions.push({ actionName: "getAll", groupId: "" });
    return [];
  }

  public async findByName(name: string): Promise<WhatsappGroupMetadata | null> {
    this.Actions.push({ actionName: "findByName", groupId: "", payload: name });
    return null;
  }

  public async isBotAdmin(groupId: string): Promise<boolean> {
    this.Actions.push({ actionName: "isBotAdmin", groupId });
    return true;
  }

  public async updateParticipants(groupId: string, participants: string[], action: WhatsappGroupParticipantAction): Promise<unknown[]> {
    this.Actions.push({ actionName: "updateParticipants", groupId, payload: { participants, action } });
    return [];
  }

  public async addParticipants(groupId: string, participants: string[]): Promise<unknown[]> {
    this.Actions.push({ actionName: "addParticipants", groupId, payload: participants });
    return [];
  }

  public async removeParticipants(groupId: string, participants: string[]): Promise<unknown[]> {
    this.Actions.push({ actionName: "removeParticipants", groupId, payload: participants });
    return [];
  }

  public async promoteParticipants(groupId: string, participants: string[]): Promise<unknown[]> {
    this.Actions.push({ actionName: "promoteParticipants", groupId, payload: participants });
    return [];
  }

  public async demoteParticipants(groupId: string, participants: string[]): Promise<unknown[]> {
    this.Actions.push({ actionName: "demoteParticipants", groupId, payload: participants });
    return [];
  }

  public async removeAllParticipants(groupId: string): Promise<void> {
    this.Actions.push({ actionName: "removeAllParticipants", groupId });
  }

  public async leave(groupId: string): Promise<void> {
    this.Actions.push({ actionName: "leave", groupId });
  }

  public async deleteChat(groupId: string): Promise<void> {
    this.Actions.push({ actionName: "deleteChat", groupId });
  }

  public async cleanup(groupId: string): Promise<void> {
    this.Actions.push({ actionName: "cleanup", groupId });
  }
}

/**
 * Generates a default group metadata object for mocking purposes.
 *
 * - Provides sensible defaults for all {@link GroupMetadataInfo} fields.
 * - Allows overriding any field by passing a partial object.
 *
 * @param chatContextData - Partial group data to override defaults.
 * @returns A fully populated {@link GroupMetadataInfo}.
 */
export function GenerateDefaultGroupMetadata(chatContextData: Partial<GroupMetadataInfo> = {}): GroupMetadataInfo {
  const defaults: GroupMetadataInfo = {
    id: "fakeChatId" + WhatsappGroupIdentifier,
    sendingMode: WhatsappIdType.Modern,
    ownerName: "John Doe",
    groupName: "DEFAULT_groupname",
    groupDescription: "A group for awesome team collaboration!",
    communityIdWhereItBelongs: null,
    onlyAdminsCanChangeGroupSettings: true,
    onlyAdminsCanSendMsgs: false,
    membersCanAddOtherMembers: true,
    needsRequestApprovalToJoinIn: false,
    isCommunityAnnounceChannel: false,
    membersCount: 25,
    ephemeralDuration: 86400, // 24 hours in seconds
    inviteCode: "abc123xyz",
    lastNameChangeDateTime: 1694726400000, // Example timestamp (2023-09-15)
    author: "mock_author",
    creationDate: 1694640000000, // Example timestamp (2023-09-14)
    members: [
      {
        asMentionFormatted: "@12345678901",
        rawId: "12345678901@s.whatsapp.net",
        isAdmin: true,
        WhatsappIdType: WhatsappIdType.Modern,
      },
      {
        asMentionFormatted: "@12345678902",
        rawId: "12345678902@s.whatsapp.net",
        isAdmin: false,
        WhatsappIdType: WhatsappIdType.Modern,
      },
      {
        asMentionFormatted: "@12345678903",
        rawId: "12345678903@s.whatsapp.net",
        isAdmin: false,
        WhatsappIdType: WhatsappIdType.Modern,
      },
    ],
  };

  return {
    ...defaults,
    ...chatContextData,
    members: chatContextData.members ?? defaults.members,
  };
}
