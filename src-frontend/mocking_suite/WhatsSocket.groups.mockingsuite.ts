import type { IWhatsSocket_Submodule_Group } from "../whats_socket/internals/IWhatsSocket.groups.js";
import { type GroupMetadataInfo } from "../whats_socket/internals/WhatsSocket.receiver.js";
import type { WhatsappGroupMetadata, WhatsappGroupParticipantAction } from "../whats_socket/types.js";
import { WhatsappIdType } from "../helpers/Whatsapp.helper.js";
import { WhatsappGroupIdentifier } from "../types/Whatsapp.types.js";

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
  public HistoryActions: Array<{
    actionName: keyof IWhatsSocket_Submodule_Group;
    groupId: string;
    additionalArguments?: any;
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
    this.HistoryActions = [];
    this._groupMetadataToSendMock = GenerateDefaultGroupMetadata();
  }

  public async FetchGroupData(_chatId: string): Promise<GroupMetadataInfo | null> {
    if (_chatId) {
      return { ...this._groupMetadataToSendMock, id: _chatId };
    } else {
      return this._groupMetadataToSendMock;
    }
  }

  public async GetMetadata(groupId: string): Promise<WhatsappGroupMetadata> {
    this.HistoryActions.push({ actionName: "GetMetadata", groupId });
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

  public NormalizeJid(jid: string): string {
    return jid.trim();
  }

  public GetBotJid(): string {
    return "mockbotjid@s.whatsapp.net";
  }

  public async GetAll(): Promise<WhatsappGroupMetadata[]> {
    this.HistoryActions.push({ actionName: "GetAll", groupId: "" });
    return [];
  }

  public async FindByName(name: string): Promise<WhatsappGroupMetadata | null> {
    this.HistoryActions.push({ actionName: "FindByName", groupId: "", additionalArguments: name });
    return null;
  }

  public async IsBotAdmin(groupId: string): Promise<boolean> {
    this.HistoryActions.push({ actionName: "IsBotAdmin", groupId });
    return true;
  }

  public async UpdateParticipants(groupId: string, participants: string[], action: WhatsappGroupParticipantAction): Promise<boolean> {
    this.HistoryActions.push({ actionName: "UpdateParticipants", groupId, additionalArguments: { participants, action } });
    return true;
  }

  public async AddParticipants(groupId: string, participants: string[]): Promise<boolean> {
    this.HistoryActions.push({ actionName: "AddParticipants", groupId, additionalArguments: participants });
    return true;
  }

  public async RemoveParticipants(groupId: string, participants: string[]): Promise<boolean> {
    this.HistoryActions.push({ actionName: "RemoveParticipants", groupId, additionalArguments: participants });
    return true;
  }

  public async PromoteParticipants(groupId: string, participants: string[]): Promise<boolean> {
    this.HistoryActions.push({ actionName: "PromoteParticipants", groupId, additionalArguments: participants });
    return true;
  }

  public async DemoteParticipants(groupId: string, participants: string[]): Promise<boolean> {
    this.HistoryActions.push({ actionName: "DemoteParticipants", groupId, additionalArguments: participants });
    return true;
  }

  public async RemoveAllParticipants(groupId: string): Promise<void> {
    this.HistoryActions.push({ actionName: "RemoveAllParticipants", groupId });
  }

  public async Leave(groupId: string): Promise<void> {
    this.HistoryActions.push({ actionName: "Leave", groupId });
  }

  public async DeleteChat(groupId: string): Promise<void> {
    this.HistoryActions.push({ actionName: "DeleteChat", groupId });
  }

  public async Cleanup(groupId: string): Promise<void> {
    this.HistoryActions.push({ actionName: "Cleanup", groupId });
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
