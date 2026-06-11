import { describe, expect, mock as fn, test } from "bun:test";
import { WhatsappGroupIdentifier, WhatsappPhoneNumberIdentifier } from "../../../Whatsapp.types.js";
import type { WhatsappGroupMetadata } from "../types.js";
import WhatsSocket from "../WhatsSocket.js";
import { CreateWhatsSocketVendorFactoryMock, GenericSocketVendorClient_Mock } from "../WhatsSocket.generic.mock.js";

async function toolkit() {
  const adapter = new GenericSocketVendorClient_Mock();
  const socket = new WhatsSocket({
    ownWhatsSocketVendorFactory_Internal: CreateWhatsSocketVendorFactoryMock(adapter),
    delayMilisecondsBetweenMsgs: 0,
  });
  await socket.Start();
  return { adapter, groupApi: socket.group, socket };
}

describe("WhatsSocket Group Submodule", () => {
  test("Groups_WhenFetchingAllGroups_ShouldReturnAdapterGroups", async () => {
    const { adapter, groupApi, socket } = await toolkit();
    const expectedGroups: WhatsappGroupMetadata[] = [
      {
        id: "123" + WhatsappGroupIdentifier,
        subject: "Team",
        participants: [],
      },
    ];
    adapter.fetchAllGroups.mockResolvedValueOnce(expectedGroups);

    const groups = await groupApi.GetAll();

    expect(groups).toEqual(expectedGroups);
    expect(adapter.fetchAllGroups).toHaveBeenCalledTimes(1);
    await socket.Shutdown();
  });

  test("Groups_WhenFindingGroupByName_ShouldReturnMatchingGroup", async () => {
    const { adapter, groupApi, socket } = await toolkit();
    const expectedGroup: WhatsappGroupMetadata = {
      id: "123" + WhatsappGroupIdentifier,
      subject: "Target",
      participants: [],
    };
    adapter.fetchAllGroups.mockResolvedValueOnce([
      {
        id: "456" + WhatsappGroupIdentifier,
        subject: "Other",
        participants: [],
      },
      expectedGroup,
    ]);

    const group = await groupApi.FindByName("Target");

    expect(group).toEqual(expectedGroup);
    await socket.Shutdown();
  });

  test("Groups_WhenBotIsGroupAdmin_ShouldReturnTrue", async () => {
    const { adapter, groupApi, socket } = await toolkit();
    adapter.getBotJid.mockReturnValueOnce("123" + WhatsappPhoneNumberIdentifier);
    adapter.fetchGroupMetadata.mockResolvedValueOnce({
      id: "group" + WhatsappGroupIdentifier,
      subject: "Admins",
      participants: [{ id: "123" + WhatsappPhoneNumberIdentifier, admin: "admin" }],
    });

    const isAdmin = await groupApi.IsBotAdmin("group" + WhatsappGroupIdentifier);

    expect(isAdmin).toBe(true);
    await socket.Shutdown();
  });

  test("Groups_WhenUpdatingParticipants_ShouldNormalizeBeforeAdapterCall", async () => {
    const { adapter, groupApi, socket } = await toolkit();
    adapter.normalizeJid = fn((jid: string) => "normalized:" + jid);

    await groupApi.AddParticipants("group" + WhatsappGroupIdentifier, ["123" + WhatsappPhoneNumberIdentifier]);

    expect(adapter.updateGroupParticipants).toHaveBeenCalledWith(
      "group" + WhatsappGroupIdentifier,
      ["normalized:123" + WhatsappPhoneNumberIdentifier],
      "add"
    );
    await socket.Shutdown();
  });

  test("Groups_WhenUpdatingNoParticipants_ShouldReturnFalseWithoutAdapterCall", async () => {
    const { adapter, groupApi, socket } = await toolkit();

    const result = await groupApi.RemoveParticipants("group" + WhatsappGroupIdentifier, []);

    expect(result).toEqual(false);
    expect(adapter.updateGroupParticipants).toHaveBeenCalledTimes(0);
    await socket.Shutdown();
  });

  test("Groups_WhenPromotingParticipants_ShouldCallUpdateWithPromote", async () => {
    const { adapter, groupApi, socket } = await toolkit();
    adapter.normalizeJid = fn((jid: string) => jid);

    await groupApi.PromoteParticipants("group" + WhatsappGroupIdentifier, ["123" + WhatsappPhoneNumberIdentifier]);

    expect(adapter.updateGroupParticipants).toHaveBeenCalledWith(
      "group" + WhatsappGroupIdentifier,
      ["123" + WhatsappPhoneNumberIdentifier],
      "promote"
    );
    await socket.Shutdown();
  });

  test("Groups_WhenDemotingParticipants_ShouldCallUpdateWithDemote", async () => {
    const { adapter, groupApi, socket } = await toolkit();
    adapter.normalizeJid = fn((jid: string) => jid);

    await groupApi.DemoteParticipants("group" + WhatsappGroupIdentifier, ["123" + WhatsappPhoneNumberIdentifier]);

    expect(adapter.updateGroupParticipants).toHaveBeenCalledWith(
      "group" + WhatsappGroupIdentifier,
      ["123" + WhatsappPhoneNumberIdentifier],
      "demote"
    );
    await socket.Shutdown();
  });

  test("Groups_WhenRemovingAllParticipants_ShouldRemoveEveryoneExceptBot", async () => {
    const { adapter, groupApi, socket } = await toolkit();
    adapter.getBotJid.mockReturnValueOnce("bot" + WhatsappPhoneNumberIdentifier);
    adapter.normalizeJid = fn((jid: string) => jid);
    adapter.fetchGroupMetadata.mockResolvedValueOnce({
      id: "group" + WhatsappGroupIdentifier,
      subject: "Test",
      participants: [
        { id: "user1" + WhatsappPhoneNumberIdentifier },
        { id: "bot" + WhatsappPhoneNumberIdentifier },
        { id: "user2" + WhatsappPhoneNumberIdentifier }
      ],
    });

    await groupApi.RemoveAllParticipants("group" + WhatsappGroupIdentifier);

    expect(adapter.updateGroupParticipants).toHaveBeenCalledWith(
      "group" + WhatsappGroupIdentifier,
      ["user1" + WhatsappPhoneNumberIdentifier, "user2" + WhatsappPhoneNumberIdentifier],
      "remove"
    );
    await socket.Shutdown();
  });

  test("Groups_WhenLeavingGroup_ShouldCallLeaveGroup", async () => {
    const { adapter, groupApi, socket } = await toolkit();

    await groupApi.Leave("group" + WhatsappGroupIdentifier);

    expect(adapter.leaveGroup).toHaveBeenCalledWith("group" + WhatsappGroupIdentifier);
    await socket.Shutdown();
  });

  test("Groups_WhenDeletingChat_ShouldCallDeleteChatLocally", async () => {
    const { adapter, groupApi, socket } = await toolkit();

    await groupApi.DeleteChat("group" + WhatsappGroupIdentifier);

    expect(adapter.deleteChatLocally).toHaveBeenCalledWith("group" + WhatsappGroupIdentifier);
    await socket.Shutdown();
  });

  test("Groups_WhenCleaningUp_ShouldRemoveAllLeaveAndDelete", async () => {
    const { adapter, groupApi, socket } = await toolkit();
    adapter.getBotJid.mockReturnValueOnce("bot" + WhatsappPhoneNumberIdentifier);
    adapter.normalizeJid = fn((jid: string) => jid);
    adapter.fetchGroupMetadata.mockResolvedValueOnce({
      id: "group" + WhatsappGroupIdentifier,
      subject: "Test",
      participants: [{ id: "user" + WhatsappPhoneNumberIdentifier }],
    });

    await groupApi.Cleanup("group" + WhatsappGroupIdentifier);

    expect(adapter.updateGroupParticipants).toHaveBeenCalledWith(
      "group" + WhatsappGroupIdentifier,
      ["user" + WhatsappPhoneNumberIdentifier],
      "remove"
    );
    expect(adapter.leaveGroup).toHaveBeenCalledWith("group" + WhatsappGroupIdentifier);
    expect(adapter.deleteChatLocally).toHaveBeenCalledWith("group" + WhatsappGroupIdentifier);
    await socket.Shutdown();
  });

  test("Groups_WhenFetchingGroupData_ShouldMapToGroupMetadataInfo", async () => {
    const { adapter, groupApi, socket } = await toolkit();
    adapter.fetchGroupMetadata.mockResolvedValueOnce({
      id: "group" + WhatsappGroupIdentifier,
      subject: "My Group",
      participants: [
        { id: "12345678901" + WhatsappPhoneNumberIdentifier, admin: "superadmin" }
      ],
      addressingMode: "pn",
    });

    const data = await groupApi.FetchGroupData("group" + WhatsappGroupIdentifier);

    expect(data).toBeDefined();
    expect(data?.groupName).toBe("My Group");
    expect(data?.members.length).toBe(1);
    expect(data?.members[0]?.isAdmin).toBe(true);
    await socket.Shutdown();
  });
});
