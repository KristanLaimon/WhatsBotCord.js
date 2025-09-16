import { Boom } from "@hapi/boom";
import type { GroupMetadata, WAMessage, WAMessageUpdate } from "baileys";

import { type Mock, describe, expect, mock as fn, it, spyOn } from "bun:test";
import { MsgType, SenderType } from "../../Msg.types.js";
import { WhatsappGroupIdentifier, WhatsappIndividualIdentifier } from "../../Whatsapp.types.js";
import WhatsSocketSenderQueue_SubModule from "./internals/WhatsSocket.senderqueue.js";
import { WhatsSocket_Submodule_SugarSender } from "./internals/WhatsSocket.sugarsenders.js";
import { BaileysSocketServiceAdapter_Mock } from "./WhatsSocket.baileys.mock.js";
import WhatsSocket from "./WhatsSocket.js";

describe("Initialization", () => {
  it("Instatiation_WhenProvidingMockSocket_ShouldUseMockInsteadOfRealOne", async () => {
    const internalMockSocket = new BaileysSocketServiceAdapter_Mock();
    const ws = new WhatsSocket({
      delayMilisecondsBetweenMsgs: 1,
      ownImplementationSocketAPIWhatsapp: internalMockSocket,
    });
    await ws.Start();
    //@ts-expect-error We're checking that private _socket property exists
    expect(ws._socket).toMatchObject(internalMockSocket);
  });

  it("Instatiation_WhenUsingStartMethod_ShouldSubscribeToCredsUpdateSocket", async () => {
    const internalMockSocket = new BaileysSocketServiceAdapter_Mock();
    const ws = new WhatsSocket({
      ownImplementationSocketAPIWhatsapp: internalMockSocket,
      delayMilisecondsBetweenMsgs: 1,
    });
    await ws.Start();
    //internalMockSocket.ev.on should be called with 2 arguments: "creds.update", "saveCreds" async function from baileys
    //We're interested only on creds.update
    const argumentsArray = (internalMockSocket.ev.on as Mock<typeof internalMockSocket.ev.on>).mock.calls[0]!;
    const firstArgumentStr = argumentsArray[0];
    // const secondArgumentSaveCredsAsync = argumentsArray[1]; ||| Not used at all
    expect(firstArgumentStr).toBeDefined();
    expect(firstArgumentStr).toBe("creds.update");
  });

  it("WhenInstatiating_ShouldCreateQueueSocketAndSocketSugarSender", async () => {
    const internalMockSocket = new BaileysSocketServiceAdapter_Mock();
    const ws = new WhatsSocket({
      ownImplementationSocketAPIWhatsapp: internalMockSocket,
      delayMilisecondsBetweenMsgs: 1,
    });
    await ws.Start();

    //Private field Senderqueue should be instatiated as well
    //@ts-expect-error We're checking that private _senderQueue exists
    expect(ws._senderQueue).toBeDefined();
    //@ts-expect-error We're checking that private _senderQueue exists
    expect(ws._senderQueue).toBeInstanceOf(WhatsSocketSenderQueue_SubModule);
    expect(ws.Send).toBeDefined();
    expect(ws.Send).toBeInstanceOf(WhatsSocket_Submodule_SugarSender);
  });

  it("WhenInstatiatin_ShouldConfigure;ConfigureConnection();CorrectlyOnSocket", async () => {
    const internalMockSocket = new BaileysSocketServiceAdapter_Mock();
    const ws = new WhatsSocket({
      ownImplementationSocketAPIWhatsapp: internalMockSocket,
      delayMilisecondsBetweenMsgs: 1,
    });
    await ws.Start();

    /**
     * We expect it's internal private method "ConfigureConnection()" uses the
     * 'connection.update' event from socket at least!
     */
    const argumentsCalledWith = (internalMockSocket.ev.on as Mock<typeof internalMockSocket.ev.on>).mock.calls.map((call) => ({
      EventName: call[0],
      Callback: call[1],
    }));
    expect(argumentsCalledWith).toBeDefined();
    const eventNameCalled = argumentsCalledWith.find((call) => call.EventName === "creds.update");
    expect(eventNameCalled).toBeDefined();
    //So, from all calls it should at least call the "creds.update"!
  });
});

describe("Messages Sending", () => {
  it("WhenSendingMsgsThroughSendSafe_ShouldSendThemThroughSocket", async (): Promise<void> => {
    const internalMockSocket = new BaileysSocketServiceAdapter_Mock();
    const ws = new WhatsSocket({
      delayMilisecondsBetweenMsgs: 1,
      ownImplementationSocketAPIWhatsapp: internalMockSocket,
    });
    await ws.Start();
    const result: WAMessage | null = await ws._SendSafe("123" + WhatsappGroupIdentifier, { text: "Hello" });
    expect(result?.message).toMatchObject({ text: "Hello" });
    expect(internalMockSocket.sendMessage as Mock<typeof internalMockSocket.sendMessage>).toHaveBeenCalledTimes(1);
  });

  it("WhenSendingMsgsThroughRaw_ShouldSendThemThroughSocket", async (): Promise<void> => {
    const internalMockSocket = new BaileysSocketServiceAdapter_Mock();
    const ws = new WhatsSocket({
      delayMilisecondsBetweenMsgs: 1,
      ownImplementationSocketAPIWhatsapp: internalMockSocket,
    });
    await ws.Start();
    const result: WAMessage | null = await ws._SendRaw("123@" + WhatsappGroupIdentifier, { text: "Raw text content" });

    expect(result!.message!).toMatchObject({ text: "Raw text content" });
    expect(internalMockSocket.sendMessage as Mock<typeof internalMockSocket.sendMessage>).toHaveBeenCalledTimes(1);
  });
});

/**
 * Out of scope but: (WhatsSocket improve suite testing)
 * 1. [] Test if all whatssocket EVENTS works as expected (needs manual testing... ofc)
 *        (Already know it works by the whole +100 tests that uses it!)
 *        TESTEABLE     [X] onIncomingMsg: Delegate<(senderId: string | null, chatId: string, rawMsg: WhatsappMessage, msgType: MsgType, senderType: SenderType) => void>; *        [] onUpdateMsg: Delegate<(senderId: string | null, chatId: string, rawMsgUpdate: WhatsappMessage, msgType: MsgType, senderType: SenderType) => void>;
 *        TESTEABLE     [] onSentMessage: Delegate<(chatId: string, rawContentMsg: AnyMessageContent, optionalMisc?: MiscMessageGenerationOptions) => void>;
 *        TESTEABLE     [] onRestart: Delegate<() => Promise<void>>;
 *        MANUAL TEST (forcing emitting event)  [] onGroupEnter: Delegate<(groupInfo: GroupMetadata) => void>;
 *        MANUAL TEST  (forcing emitting event ) [X] onGroupUpdate: Delegate<(groupInfo: Partial<GroupMetadata>) => void>;
 *        TESTEABLE [] onStartupAllGroupsIn: Delegate<(allGroupsIn: GroupMetadata[]) => void>;
 */
/**
 * Events/Delegates Tested:
 * [X] => onSentMessage
 * [X] => onIncomingMsg
 * [X] => onUpdateMsg
 * [X] => onGroupUpdate
 * [X] => onGroupEnter
 * [~] => onRestart
 * [~] => onStartupAllGroupsIn
 */
describe("Events/Delegates", () => {
  it("onGroupEnter_Delegate_SendSendingMsg_ShouldInvokeWS", async () => {
    const internalMockSocket = new BaileysSocketServiceAdapter_Mock();
    const ws = new WhatsSocket({
      delayMilisecondsBetweenMsgs: 0,
      ownImplementationSocketAPIWhatsapp: internalMockSocket,
    });
    await ws.Start();

    const spy = fn((groupData: GroupMetadata) => {
      expect(groupData).toBeDefined();
      expect(groupData).not.toBeArray();
    });
    ws.onGroupEnter.Subscribe(spy);

    internalMockSocket.ev.emit("groups.upsert", [{ group: "group1" }, { group: "group2" }]);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("onSentMessage_Delegate_WhenSendingAMsg_ShouldInvokeWS", async () => {
    const internalMockSocket = new BaileysSocketServiceAdapter_Mock();
    const ws = new WhatsSocket({
      delayMilisecondsBetweenMsgs: 0,
      ownImplementationSocketAPIWhatsapp: internalMockSocket,
    });
    await ws.Start();

    const onSentMessageSpySubscriber = fn();
    ws.onSentMessage.Subscribe(onSentMessageSpySubscriber);
    // simulate message send
    await ws.Send.Text("fakeChatId" + WhatsappGroupIdentifier, "Hi");
    expect(onSentMessageSpySubscriber).toHaveBeenCalledTimes(1);
  });

  it("onIncomingMsg_Delegate_WhenReceivingAMsg_ShouldInvokeWS", async () => {
    //========== Using onMessageUpsert ================
    // Arrange
    const internalMockSocket = new BaileysSocketServiceAdapter_Mock();
    const ws = new WhatsSocket({
      delayMilisecondsBetweenMsgs: 0,
      ownImplementationSocketAPIWhatsapp: internalMockSocket,
    });
    await ws.Start();

    const subscriberSpy = fn();
    ws.onIncomingMsg.Subscribe(subscriberSpy);

    const fakeChatId = "fakeId" + WhatsappGroupIdentifier;
    const fakeMessage: WAMessage = {
      key: { fromMe: false, remoteJid: fakeChatId, id: "123" },
      message: { conversation: "Hi, im a mocked message from socket!" },
    } as any;

    // Act – simulate incoming Baileys event
    internalMockSocket.ev.emit("messages.upsert", {
      messages: [fakeMessage],
      type: "append",
    });

    // Assert
    expect(subscriberSpy).toHaveBeenCalledTimes(1);

    // extract call args safely
    const [senderId, chatId, msg, msgType, senderType] = subscriberSpy.mock.calls[0] as [string | null, string, WAMessage, MsgType, SenderType];

    // Only asserts what WhatsSocket transforms
    expect(senderId).toBeNull(); // group messages = no direct sender id
    expect(chatId).toBe(fakeChatId); // chat id preserved
    expect(msg).toMatchObject(fakeMessage); // received message passed along
    expect(msgType).toBe(MsgType.Text); // classification logic tested
    expect(senderType).toBe(SenderType.Group); // group detection tested
  });

  it("onUpdateMsg_Delegate_WhenReceivingMsgUpdate_ShouldInvokeWS", async () => {
    // =================== Using onMessageUpdate =====================
    const internalMockSocket = new BaileysSocketServiceAdapter_Mock();
    const ws = new WhatsSocket({
      delayMilisecondsBetweenMsgs: 0,
      ownImplementationSocketAPIWhatsapp: internalMockSocket,
    });
    await ws.Start();

    const subscriberSpy = fn();
    ws.onUpdateMsg.Subscribe(subscriberSpy);

    const fakeChatId = "fakeChatId" + WhatsappGroupIdentifier;
    const mockMsg: WAMessageUpdate = {
      key: {
        fromMe: false,
        participant: "324234234" + WhatsappIndividualIdentifier,
        remoteJid: fakeChatId,
      },
      update: {
        pollUpdates: [{}],
      },
    };
    internalMockSocket.ev.emit("messages.update", [mockMsg]);

    expect(subscriberSpy).toHaveBeenCalledTimes(1);
  });

  it("onGroupUpdate_Delegate_WhenGettingGroupsUPdate_ShouldInvokeWS", async () => {
    const mockSocket = new BaileysSocketServiceAdapter_Mock();
    const ws = new WhatsSocket({
      ownImplementationSocketAPIWhatsapp: mockSocket,
      delayMilisecondsBetweenMsgs: 1,
    });
    await ws.Start();

    const spySubscriber = fn();
    ws.onGroupUpdate.Subscribe(spySubscriber);

    const fakeChatId = "fakeChatIdGroup" + WhatsappGroupIdentifier;
    const mockGroupUpdates: Array<Partial<GroupMetadata>> = [
      {
        id: fakeChatId,
        subject: "A mock group update!",
        desc: "Description mock for group update",
      },
    ];

    mockSocket.ev.emit("groups.update", mockGroupUpdates);

    expect(spySubscriber).toHaveBeenCalledTimes(1);
    expect(spySubscriber).toHaveBeenCalledWith(...mockGroupUpdates);
  });
});

describe("Life Cycle: Start/Restart/Shutdown", () => {
  it(
    "WhenStartingNormalWhatsSocket_ShouldBeAbleToStartOnly",
    async () => {
      //Should last at most, 1 second
      const mockSocket = new BaileysSocketServiceAdapter_Mock();
      const ws = new WhatsSocket({
        ownImplementationSocketAPIWhatsapp: mockSocket,
        delayMilisecondsBetweenMsgs: 1,
      });
      await ws.Start();
    },
    { timeout: 1000 }
  );

  it(
    "WhenStartingNormalWhatsSocket_ShouldBeAbleToStartAndShutdownCompletely",
    async () => {
      //Should be fast, and avoid leaving any residual promises or unresolved code!.
      const mockSocket = new BaileysSocketServiceAdapter_Mock();
      const ws = new WhatsSocket({
        ownImplementationSocketAPIWhatsapp: mockSocket,
        delayMilisecondsBetweenMsgs: 1,
      });
      await ws.Start();
      await ws.Shutdown();
      //Max 1 second.
    },
    { timeout: 1000 }
  );

  it("WhenStartingNormalWhatsSocket_ShouldBeAbleToStartAndRestart", async () => {
    const mockSocket = new BaileysSocketServiceAdapter_Mock();
    const ws = new WhatsSocket({
      ownImplementationSocketAPIWhatsapp: mockSocket,
      delayMilisecondsBetweenMsgs: 1,
    });

    const spyOnStart = spyOn(ws, "Start");
    const spyOnRestart = spyOn(ws, "Restart");

    await ws.Start();
    await ws.Restart();

    expect(spyOnStart).toHaveBeenCalledTimes(1);
    expect(spyOnRestart).toHaveBeenCalledTimes(1);
  });

  it("WhenRestarting_ShouldNotReinstantiateDelegates", async () => {
    const mockSocket = new BaileysSocketServiceAdapter_Mock();
    const ws = new WhatsSocket({
      ownImplementationSocketAPIWhatsapp: mockSocket,
      delayMilisecondsBetweenMsgs: 1,
    });

    await ws.Start();

    const originalReconnect = ws.onRestart;
    const originalGroupEnter = ws.onGroupEnter;
    const originalGroupUpdate = ws.onGroupUpdate;
    const originalMessageUpdate = ws.onUpdateMsg;
    const originalMessageUpsert = ws.onIncomingMsg;
    const originalSentMessage = ws.onSentMessage;
    const originalStartupAllGroupsIn = ws.onStartupAllGroupsIn;

    await ws.Restart();

    expect(ws.onRestart).toMatchObject(originalReconnect);
    expect(ws.onGroupEnter).toMatchObject(originalGroupEnter);
    expect(ws.onGroupUpdate).toMatchObject(originalGroupUpdate);
    expect(ws.onUpdateMsg).toMatchObject(originalMessageUpdate);
    expect(ws.onIncomingMsg).toMatchObject(originalMessageUpsert);
    expect(ws.onSentMessage).toMatchObject(originalSentMessage);
    expect(ws.onStartupAllGroupsIn).toMatchObject(originalStartupAllGroupsIn);
  });
});

describe("Reconnecting", () => {
  it("WhenSuccessfullyConnected;Ideal;_ShouldFetchGroupMetadataOnce", async () => {
    // ====== Arrange
    const mockSocket = new BaileysSocketServiceAdapter_Mock();
    const groupFetchAllParticipantsMock = mockSocket.groupFetchAllParticipating as Mock<typeof mockSocket.groupFetchAllParticipating>;

    const groupFetchMockData = {
      id: "groupMock" + WhatsappGroupIdentifier,
      addressingMode: "lid",
      owner: "Christian",
      participants: [{ id: "testfakeid" + WhatsappIndividualIdentifier }],
      subject: "Group Mock Name",
    };

    groupFetchAllParticipantsMock.mockResolvedValueOnce({
      GroupIdMock: groupFetchMockData,
    } as any);

    const ws = new WhatsSocket({
      ownImplementationSocketAPIWhatsapp: mockSocket,
      delayMilisecondsBetweenMsgs: 1,
    });
    await ws.Start();

    const spyFuncty = fn();
    const waitForCall = waitUntilCalled(spyFuncty);

    ws.onStartupAllGroupsIn.Subscribe(spyFuncty);

    // ========= Act
    mockSocket.ev.emit("connection.update", { connection: "open" });
    await waitForCall;

    // ========== Assert
    expect(groupFetchAllParticipantsMock).toHaveBeenCalledTimes(1);
    expect(spyFuncty).toHaveBeenCalledTimes(1);

    await ws.Shutdown();
  });

  it("WhenNotConnected_ShouldCloseItselfAndRestart", async () => {
    const mockSocket = new BaileysSocketServiceAdapter_Mock();
    const ws = new WhatsSocket({
      ownImplementationSocketAPIWhatsapp: mockSocket,
      delayMilisecondsBetweenMsgs: 1,
    });
    await ws.Start();

    const restartFunctSpy: Mock<typeof ws.Restart> = spyOn(ws, "Restart");
    const reconnectSpy = fn();
    ws.onRestart.Subscribe(reconnectSpy);

    function EmitErrorConnection() {
      // Act: simula desconexión con status que permite reconectar
      mockSocket.ev.emit("connection.update", {
        connection: "close",
        lastDisconnect: { error: new Boom("fake error", { statusCode: 408 }) },
      } as any);
    }

    // Assert: esperamos a que se dispare reconexión
    EmitErrorConnection();
    expect(ws.onRestart.Length).toBe(1);
    await waitUntilCalled(reconnectSpy);
    expect(reconnectSpy).toHaveBeenCalledTimes(1);
    expect(restartFunctSpy).toHaveBeenCalledTimes(1);

    EmitErrorConnection();
    expect(ws.onRestart.Length).toBe(1);
    await waitUntilCalled(reconnectSpy);
    expect(reconnectSpy).toHaveBeenCalledTimes(2);
    expect(restartFunctSpy).toHaveBeenCalledTimes(2);

    await ws.Shutdown();
  });

  it(
    "WhenNonReconnectingInMaxAttemps_ShouldShutdownCompletely",
    async () => {
      const MAX_RECONNECTION_RETRIES = 2;

      const mockSocket = new BaileysSocketServiceAdapter_Mock();
      const ws = new WhatsSocket({
        ownImplementationSocketAPIWhatsapp: mockSocket,
        maxReconnectionRetries: MAX_RECONNECTION_RETRIES,
      });

      function EmitConnectionError() {
        mockSocket.ev.emit("connection.update", {
          connection: "close",
          lastDisconnect: {
            error: new Boom("fake error", { statusCode: 408 }),
          },
        } as any);
      }

      const ws_Start_Spy: Mock<typeof ws.Start> = spyOn(ws, "Start");
      const ws_Restart_Spy: Mock<typeof ws.Restart> = spyOn(ws, "Restart");
      const ws_Shutdown_Spy: Mock<typeof ws.Shutdown> = spyOn(ws, "Shutdown");

      await ws.Start();

      const onRestartCallbackSpy = fn();
      ws.onRestart.Subscribe(onRestartCallbackSpy);

      //Act: Let's use all allowed reconnection retries
      for (let i = 0; i < MAX_RECONNECTION_RETRIES; i++) {
        EmitConnectionError();
        await waitUntilCalled(onRestartCallbackSpy);
      }
      //Now, lets try an exceding connection retry
      waitUntilCalled(onRestartCallbackSpy);

      expect(ws_Start_Spy).toHaveBeenCalledTimes(1);
      expect(ws_Restart_Spy).toHaveBeenCalledTimes(MAX_RECONNECTION_RETRIES);
      expect(ws_Shutdown_Spy).toHaveBeenCalledTimes(MAX_RECONNECTION_RETRIES + 1);
      expect(onRestartCallbackSpy).toHaveBeenCalledTimes(MAX_RECONNECTION_RETRIES);
      expect(ws.ActualReconnectionRetries).toBe(MAX_RECONNECTION_RETRIES + 1);

      await ws.Shutdown();
    },
    { timeout: 10000 }
  );
});

describe("Info fetching", () => {
  it("WhenTryingToFetchGroupsData_ShouldFetchThemCorrectlyFromSocket", async () => {
    const internalMockSocket = new BaileysSocketServiceAdapter_Mock();
    const ws = new WhatsSocket({
      delayMilisecondsBetweenMsgs: 0,
      ownImplementationSocketAPIWhatsapp: internalMockSocket,
    });
    await ws.Start();

    const group = await ws.GetRawGroupMetadata("123@g.us");
    expect(group.subject).toBe("Mock Group");
    expect(internalMockSocket.groupMetadata as Mock<typeof internalMockSocket.groupMetadata>).toHaveBeenCalledTimes(1);
  });
});

async function waitUntilCalled(mock: Mock<(args: any) => void>) {
  return new Promise<void>((resolve) => {
    mock.mockImplementationOnce(() => resolve());
  });
}
