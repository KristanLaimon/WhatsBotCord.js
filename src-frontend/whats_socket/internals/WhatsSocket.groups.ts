import { type WhatsappIDInfo, WhatsappHelper_ExtractFromWhatsappID, WhatsappIdType } from "../../helpers/Whatsapp.helper.js";
import { WhatsappGroupIdentifier } from "../../types/Whatsapp.types.js";
import type { IWhatsSocket } from "../IWhatsSocket.js";
import type { WhatsappGroupMetadata, WhatsappGroupParticipantAction } from "../types.js";
import type { IWhatsSocket_Submodule_Group } from "./IWhatsSocket.groups.js";
import type { GroupMetadataInfo, ParticipantInfo } from "./WhatsSocket.receiver.js";

/**
 * # Group Submodule
 *
 * Developer-friendly group utilities backed by the active WhatsApp adapter.
 *
 * @example
 * ```typescript
 * const groups = await socket.group.getAll();
 * const isAdmin = await socket.group.isBotAdmin("123@g.us");
 * ```
 */
export class WhatsSocket_Submodule_Group implements IWhatsSocket_Submodule_Group {
  private readonly socket: IWhatsSocket;

  /**
   * Creates a group utility wrapper around the high-level WhatsSocket.
   *
   * @param socket - Active WhatsSocket instance.
   */
  public constructor(socket: IWhatsSocket) {
    this.socket = socket;
  }

  public NormalizeJid(jid: string): string {
    this._assertNotEmpty(jid, "jid");
    return this.socket.Socket.normalizeJid(jid);
  }

  public GetBotJid(): string {
    return this.socket.Socket.getBotJid();
  }

  public async GetMetadata(groupId: string): Promise<WhatsappGroupMetadata> {
    this._assertGroupId(groupId);
    return await this.socket.GetRawGroupMetadata(groupId);
  }

  public async GetAll(): Promise<WhatsappGroupMetadata[]> {
    return await this.socket.Socket.fetchAllGroups();
  }

  public async FindByName(name: string): Promise<WhatsappGroupMetadata | null> {
    this._assertNotEmpty(name, "name");

    const groups = await this.GetAll();
    return groups.find((group) => group.subject === name) ?? null;
  }

  public async IsBotAdmin(groupId: string): Promise<boolean> {
    const metadata = await this.GetMetadata(groupId);
    const botJid = this.GetBotJid();

    const botParticipant = metadata.participants.find((participant) => {
      const participantJid = participant.id ?? participant.lid;
      if (!participantJid) {
        return false;
      }

      return this.NormalizeJid(participantJid) === botJid;
    });

    return botParticipant?.admin === "admin" || botParticipant?.admin === "superadmin";
  }

  public async UpdateParticipants(groupId: string, participants: string[], action: WhatsappGroupParticipantAction): Promise<boolean> {
    this._assertGroupId(groupId);
    this._assertValidAction(action);
    if (participants.length === 0) {
      return false;
    }
    const normalizedParticipants = participants.map((participant) => this.NormalizeJid(participant));
    try {
      const result = await this.socket.Socket.updateGroupParticipants(groupId, normalizedParticipants, action);
      return !!result;
    } catch (e) {
      console.warn(`Failed to update participants (${action}) in group ${groupId}:`, e);
      return false;
    }
  }

  public async AddParticipants(groupId: string, participants: string[]): Promise<boolean> {
    return await this.UpdateParticipants(groupId, participants, "add");
  }

  public async RemoveParticipants(groupId: string, participants: string[]): Promise<boolean> {
    return await this.UpdateParticipants(groupId, participants, "remove");
  }

  public async PromoteParticipants(groupId: string, participants: string[]): Promise<boolean> {
    return await this.UpdateParticipants(groupId, participants, "promote");
  }

  public async DemoteParticipants(groupId: string, participants: string[]): Promise<boolean> {
    return await this.UpdateParticipants(groupId, participants, "demote");
  }

  public async RemoveAllParticipants(groupId: string): Promise<void> {
    const metadata = await this.GetMetadata(groupId);
    const botJid = this.GetBotJid();

    const participants = metadata.participants
      .map((participant) => participant.id ?? participant.lid ?? null)
      .filter((participantJid): participantJid is string => participantJid !== null)
      .map((participantJid) => this.NormalizeJid(participantJid))
      .filter((participantJid) => participantJid !== botJid);

    if (participants.length === 0) {
      return;
    }

    await this.RemoveParticipants(groupId, participants);
  }

  public async Leave(groupId: string): Promise<void> {
    this._assertGroupId(groupId);
    await this.socket.Socket.leaveGroup(groupId);
  }

  public async DeleteChat(groupId: string): Promise<void> {
    this._assertGroupId(groupId);
    await this.socket.Socket.deleteChatLocally(groupId);
  }

  public async Cleanup(groupId: string): Promise<void> {
    await this.RemoveAllParticipants(groupId);
    await this.Leave(groupId);

    try {
      await this.DeleteChat(groupId);
    } catch (error) {
      console.warn("Could not delete chat locally:", error);
    }
  }

  public async FetchGroupData(chatId: string): Promise<GroupMetadataInfo | null> {
    let res: WhatsappGroupMetadata;
    try {
      //In case its a bad chatId and comes from individual msg
      res = await this.socket.GetRawGroupMetadata(chatId);
    } catch {
      return null;
    }
    const participants: ParticipantInfo[] = res.participants.map((info): ParticipantInfo => {
      const foundId = info.id || info.lid;
      let foundWhatsInfo: WhatsappIDInfo | null = null;
      if (foundId) {
        foundWhatsInfo = WhatsappHelper_ExtractFromWhatsappID(foundId);
      }
      return {
        isAdmin: info.admin === "superadmin",
        asMentionFormatted: foundWhatsInfo?.asMentionFormatted,
        rawId: foundWhatsInfo?.rawId,
        WhatsappIdType: foundWhatsInfo?.WhatsappIdType,
      };
    });
    return {
      id: res.id,
      sendingMode: res.addressingMode === "pn" ? WhatsappIdType.Legacy : WhatsappIdType.Modern,
      ownerName: res.subjectOwner || res.owner || null,
      groupName: res.subject,
      groupDescription: res.desc || null,
      inviteCode: res.inviteCode || null,
      communityIdWhereItBelongs: res.isCommunity ? res.id : null,
      onlyAdminsCanChangeGroupSettings: res.restrict || null,
      onlyAdminsCanSendMsgs: res.announce || null,
      membersCanAddOtherMembers: res.memberAddMode || null,
      needsRequestApprovalToJoinIn: res.joinApprovalMode ?? null,
      isCommunityAnnounceChannel: res.isCommunityAnnounce || null,
      membersCount: res.participants.length || null,
      ephemeralDuration: res.ephemeralDuration || null,
      author: null,
      lastNameChangeDateTime: res.subjectTime || null,
      creationDate: res.creation || null,
      members: participants,
    };
  }

  private _assertGroupId(groupId: string): void {
    this._assertNotEmpty(groupId, "groupId");

    if (!groupId.endsWith(WhatsappGroupIdentifier)) {
      throw new Error("Bad args => WhatsSocket.group => Provided groupId is not a group chat ID. => " + groupId);
    }
  }

  private _assertNotEmpty(value: string, paramName: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error("Bad args => WhatsSocket.group => '" + paramName + "' must be a non-empty string.");
    }
  }

  private _assertValidAction(action: WhatsappGroupParticipantAction): void {
    const validActions: WhatsappGroupParticipantAction[] = ["add", "remove", "promote", "demote"];
    if (!validActions.includes(action)) {
      throw new Error("Bad args => WhatsSocket.group => Invalid participant action: " + action);
    }
  }
}
