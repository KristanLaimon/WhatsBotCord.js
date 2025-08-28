import type { AnyMessageContent, WAMessageUpdate, GroupMetadata, WAMessage } from 'baileys';
import { Boom } from "@hapi/boom";

import { type Mock, mock as fn, expect, describe, it, spyOn } from "bun:test";
import type { BaileysWASocket } from './types';
import WhatsSocket from './WhatsSocket';
import WhatsSocketSenderQueue from './internals/WhatsSocket.senderqueue';
import { WhatsSocketSugarSender } from './internals/WhatsSocket.sugarsenders';
import { WhatsappGroupIdentifier, WhatsappIndividualIdentifier } from 'src/Whatsapp.types';
import { MsgType, SenderType } from 'src/Msg.types';


export function CreateBaileysWhatsappMockSocket(): BaileysWASocket {
  const evOn_Mock: Mock<(BaileysWASocket)["ev"]["on"]> = fn();
  const storedEvents: Map<string, ((...args: any[]) => void)[]> = new Map();
  evOn_Mock.mockImplementation((eventName, callBack) => {
    if (!storedEvents.has(eventName)) {
      storedEvents.set(eventName, [callBack])
    }
    else {
      storedEvents.get(eventName)!.push(callBack);
    }
  });

  const evOn_Emit_Mock: Mock<(BaileysWASocket)["ev"]["emit"]> = fn();
  evOn_Emit_Mock.mockImplementation((eventName, ...args: any[]) => {
    const foundSubscribers = storedEvents.get(eventName);
    if (foundSubscribers) {
      for (const subscriberFunct of foundSubscribers) {
        subscriberFunct(...args);
      }
      return true;
    }
    return false;
  });
  return {
    user: { id: 'mock-jid' },
    sendMessage: fn(async (jid: string, content: AnyMessageContent) => {
      return { key: { remoteJid: jid, fromMe: false }, message: content } as WAMessage;
    }),
    groupMetadata: fn(async (chatId: string) => ({
      id: chatId,
      subject: 'Mock Group',
      creation: Date.now(),
      creator: 'mock-user'
    } as unknown as GroupMetadata)),
    ev: {
      on: evOn_Mock,
      emit: evOn_Emit_Mock
    },
    groupFetchAllParticipating: fn(),
    ws: { close: fn(async () => Promise.resolve()) },
  } as unknown as BaileysWASocket;
}

describe("Initialization", () => {
  it("Instatiation_WhenProvidingMockSocket_ShouldUseMockInsteadOfRealOne", async () => {
    const internalMockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({ delayMilisecondsBetweenMsgs: 1, ownImplementationSocketAPIWhatsapp: internalMockSocket });
    await ws.Start();
    //@ts-ignore
    expect(ws._socket).toMatchObject(internalMockSocket);
  })

  it("Instatiation_WhenUsingStartMethod_ShouldSubscribeToCredsUpdateSocket", async () => {
    const internalMockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({ ownImplementationSocketAPIWhatsapp: internalMockSocket, delayMilisecondsBetweenMsgs: 1 });
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
    const internalMockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({ ownImplementationSocketAPIWhatsapp: internalMockSocket, delayMilisecondsBetweenMsgs: 1 });
    await ws.Start();

    //Private field Senderqueue should be instatiated as well
    //@ts-ignore
    expect(ws._senderQueue).toBeDefined();
    //@ts-ignore
    expect(ws._senderQueue).toBeInstanceOf(WhatsSocketSenderQueue);
    expect(ws.Send).toBeDefined();
    expect(ws.Send).toBeInstanceOf(WhatsSocketSugarSender);
  });

  it("WhenInstatiatin_ShouldConfigure;ConfigureConnection();CorrectlyOnSocket", async () => {
    const internalMockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({ ownImplementationSocketAPIWhatsapp: internalMockSocket, delayMilisecondsBetweenMsgs: 1 });
    await ws.Start();

    /**
     * We expect it's internal private method "ConfigureConnection()" uses the
     * 'connection.update' event from socket at least!
     */
    const argumentsCalledWith = (internalMockSocket.ev.on as Mock<typeof internalMockSocket.ev.on>).mock.calls.map(call => ({ EventName: call[0], Callback: call[1] }));
    expect(argumentsCalledWith).toBeDefined();
    const eventNameCalled = argumentsCalledWith.find(call => call.EventName === "creds.update");
    expect(eventNameCalled).toBeDefined();
    //So, from all calls it should at least call the "creds.update"!
  });
});

describe('Messages Sending', () => {
  it('WhenSendingMsgsThroughSendSafe_ShouldSendThemThroughSocket', async () => {
    const internalMockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({ delayMilisecondsBetweenMsgs: 0, ownImplementationSocketAPIWhatsapp: internalMockSocket });
    await ws.Start();
    const result: WAMessage | null = await ws.SendSafe('123@c.us', { text: 'Hello' });
    //@ts-ignore
    expect(result?.message).toEqual({ text: 'Hello' });
    expect(internalMockSocket.sendMessage as Mock<typeof internalMockSocket.sendMessage>).toHaveBeenCalledTimes(1);
  });
});

describe("Events/Delegates", () => {
  it('WhenSendingAMsg_ShouldInvokeWS_onSentMessageDelegate', async () => {
    const internalMockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({ delayMilisecondsBetweenMsgs: 0, ownImplementationSocketAPIWhatsapp: internalMockSocket });
    await ws.Start();

    const onSentMessageSpySubscriber = fn();
    ws.onSentMessage.Subscribe(onSentMessageSpySubscriber);
    // simulate message send
    await ws.Send.Text("fakeChatId" + WhatsappGroupIdentifier, "Hi");
    expect(onSentMessageSpySubscriber).toHaveBeenCalledTimes(1);
  });

  it("WhenReceivingAMsg_ShouldInvokeWS_onMessageUpsertDelegate", async () => {
    //========== Using onMessageUpsert ================
    // Arrange
    const internalMockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({
      delayMilisecondsBetweenMsgs: 0,
      ownImplementationSocketAPIWhatsapp: internalMockSocket
    });
    await ws.Start();

    const subscriberSpy = fn();
    ws.onMessageUpsert.Subscribe(subscriberSpy);

    const fakeChatId = "fakeId" + WhatsappGroupIdentifier;
    const fakeMessage: WAMessage = {
      key: { fromMe: false, remoteJid: fakeChatId, id: "123" },
      message: { conversation: "Hi, im a mocked message from socket!" }
    } as any;

    // Act – simulate incoming Baileys event
    internalMockSocket.ev.emit("messages.upsert", {
      messages: [fakeMessage],
      type: "append"
    });

    // Assert
    expect(subscriberSpy).toHaveBeenCalledTimes(1);

    // extract call args safely
    const [senderId, chatId, msg, msgType, senderType] =
      subscriberSpy.mock.calls[0] as [string | null, string, WAMessage, MsgType, SenderType];

    // Only asserts what WhatsSocket transforms
    expect(senderId).toBeNull(); // group messages = no direct sender id
    expect(chatId).toBe(fakeChatId); // chat id preserved
    expect(msg).toMatchObject(fakeMessage); // received message passed along
    expect(msgType).toBe(MsgType.Text); // classification logic tested
    expect(senderType).toBe(SenderType.Group); // group detection tested
  });

  it("WhenReceivingMsgUpdate_ShouldInvokeWS_onMessageUpdateDelegate", async () => {
    // =================== Using onMessageUpdate =====================
    const internalMockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({ delayMilisecondsBetweenMsgs: 0, ownImplementationSocketAPIWhatsapp: internalMockSocket });
    await ws.Start();

    const subscriberSpy = fn();
    ws.onMessageUpdate.Subscribe(subscriberSpy);

    const fakeChatId = "fakeChatId" + WhatsappGroupIdentifier;
    const mockMsg: WAMessageUpdate = {
      key: {
        fromMe: false,
        participant: "324234234" + WhatsappIndividualIdentifier,
        remoteJid: fakeChatId
      },
      update: {
        pollUpdates: [{}]
      }
    }
    internalMockSocket.ev.emit("messages.update", [mockMsg]);

    expect(subscriberSpy).toHaveBeenCalledTimes(1);
  });

  it("WhenGettingGroupsUPdate_ShouldInvokeWS_onGroupUpdateDelegate", async () => {
    const mockSocket = CreateBaileysWhatsappMockSocket()
    const ws = new WhatsSocket({ ownImplementationSocketAPIWhatsapp: mockSocket, delayMilisecondsBetweenMsgs: 1 });
    await ws.Start();

    const spySubscriber = fn();
    ws.onGroupUpdate.Subscribe(spySubscriber);

    const fakeChatId = "fakeChatIdGroup" + WhatsappGroupIdentifier;
    const mockGroupUpdates: Partial<GroupMetadata>[] = [{
      id: fakeChatId,
      subject: "A mock group update!",
      desc: "Description mock for group update"
    }];

    mockSocket.ev.emit("groups.update", mockGroupUpdates);

    expect(spySubscriber).toHaveBeenCalledTimes(1);
    expect(spySubscriber).toHaveBeenCalledWith(...mockGroupUpdates);
  });
});

describe("Life Cycle: Start/Restart/Shutdown", () => {
  it("WhenStartingNormalWhatsSocket_ShouldBeAbleToStartOnly", async () => {
    //Should last at most, 1 second
    const mockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({
      ownImplementationSocketAPIWhatsapp: mockSocket,
      delayMilisecondsBetweenMsgs: 1
    });
    await ws.Start();
  }, { timeout: 1000 });

  it("WhenStartingNormalWhatsSocket_ShouldBeAbleToStartAndShutdownCompletely", async () => {
    //Should be fast, and avoid leaving any residual promises or unresolved code!.
    const mockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({
      ownImplementationSocketAPIWhatsapp: mockSocket,
      delayMilisecondsBetweenMsgs: 1
    });
    await ws.Start();
    await ws.Shutdown();
    //Max 1 second.
  }, { timeout: 1000 });;

  it("WhenStartingNormalWhatsSocket_ShouldBeAbleToStartAndRestart", async () => {
    const mockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({
      ownImplementationSocketAPIWhatsapp: mockSocket,
      delayMilisecondsBetweenMsgs: 1
    });

    const spyOnStart = spyOn(ws, "Start");
    const spyOnRestart = spyOn(ws, "Restart");

    await ws.Start();
    await ws.Restart();

    expect(spyOnStart).toHaveBeenCalledTimes(1);
    expect(spyOnRestart).toHaveBeenCalledTimes(1);
  });

  it("WhenRestarting_ShouldNotReinstantiateDelegates", async () => {
    const mockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({
      ownImplementationSocketAPIWhatsapp: mockSocket,
      delayMilisecondsBetweenMsgs: 1
    });

    await ws.Start();

    const originalReconnect = ws.onRestart;
    const originalGroupEnter = ws.onGroupEnter;
    const originalGroupUpdate = ws.onGroupUpdate;
    const originalMessageUpdate = ws.onMessageUpdate;
    const originalMessageUpsert = ws.onMessageUpsert;
    const originalSentMessage = ws.onSentMessage;
    const originalStartupAllGroupsIn = ws.onStartupAllGroupsIn;

    await ws.Restart();

    expect(ws.onRestart).toMatchObject(originalReconnect);
    expect(ws.onGroupEnter).toMatchObject(originalGroupEnter);
    expect(ws.onGroupUpdate).toMatchObject(originalGroupUpdate);
    expect(ws.onMessageUpdate).toMatchObject(originalMessageUpdate);
    expect(ws.onMessageUpsert).toMatchObject(originalMessageUpsert);
    expect(ws.onSentMessage).toMatchObject(originalSentMessage);
    expect(ws.onStartupAllGroupsIn).toMatchObject(originalStartupAllGroupsIn);
  });
});

describe("Reconnecting", () => {
  it("WhenSuccessfullyConnected;Ideal;_ShouldFetchGroupMetadataOnce", async () => {
    // ====== Arrange
    const mockSocket = CreateBaileysWhatsappMockSocket();
    const groupFetchAllParticipantsMock =
      mockSocket.groupFetchAllParticipating as Mock<typeof mockSocket.groupFetchAllParticipating>;

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
  });

  it("WhenNotConnected_ShouldCloseItselfAndRestart", async () => {
    const mockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({ ownImplementationSocketAPIWhatsapp: mockSocket, delayMilisecondsBetweenMsgs: 1 });
    await ws.Start();

    const restartFunctSpy: Mock<typeof ws.Restart> = spyOn(ws, "Restart");
    const reconnectSpy = fn();
    ws.onRestart.Subscribe(reconnectSpy);


    function EmitErrorConnection() {
      // Act: simula desconexión con status que permite reconectar
      mockSocket.ev.emit("connection.update", {
        connection: "close",
        lastDisconnect: { error: new Boom("fake error", { statusCode: 408 }) }
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

    // Limpieza para no dejar sockets vivos
    await ws.Shutdown();
  });


  //TODO: Works but... its logging shows a lot of "Socket Closed" way more than expected. CHECK THIS TEST
  it("WhenNonReconnectingInMaxAttemps_ShouldShutdownCompletely", async () => {
    const MAX_RECONNECTION_RETRIES = 2;

    const mockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({
      ownImplementationSocketAPIWhatsapp: mockSocket,
      maxReconnectionRetries: MAX_RECONNECTION_RETRIES
    });

    // mockear Restart para no reenganchar listeners reales
    const ws_Start_Spy: Mock<typeof ws.Start> = spyOn(ws, "Start");
    const ws_Restart_Spy: Mock<typeof ws.Restart> = spyOn(ws, "Restart");

    await ws.Start();

    const spyFunctyOnReconnect = fn();
    ws.onRestart.Subscribe(spyFunctyOnReconnect);
    function EmitConnectionError() {
      mockSocket.ev.emit("connection.update", {
        connection: "close",
        lastDisconnect: { error: new Boom("fake error", { statusCode: 408 }) }
      } as any);
    }

    //Act: Let's use all allowed reconnection retries
    for (let i = 0; i < MAX_RECONNECTION_RETRIES; i++) {
      EmitConnectionError();
      await waitUntilCalled(spyFunctyOnReconnect);
    }

    //Now, lets try an exceding connection retry
    EmitConnectionError();

    expect(spyFunctyOnReconnect).toHaveBeenCalledTimes(MAX_RECONNECTION_RETRIES);
    expect(ws.ActualReconnectionRetries).toBe(MAX_RECONNECTION_RETRIES);
    expect(ws_Start_Spy).toHaveBeenCalledTimes(1); // sólo Start inicial
    expect(ws_Restart_Spy).toHaveBeenCalledTimes(MAX_RECONNECTION_RETRIES);

    await ws.Shutdown();
  }, { timeout: 10000 });
});


describe("Info fetching", () => {
  it('WhenTryingToFetchGroupsData_ShouldFetchThemCorrectlyFromSocket', async () => {
    const internalMockSocket = CreateBaileysWhatsappMockSocket();
    const ws = new WhatsSocket({ delayMilisecondsBetweenMsgs: 0, ownImplementationSocketAPIWhatsapp: internalMockSocket });
    await ws.Start();

    const group = await ws.GetGroupMetadata('123@g.us');
    expect(group.subject).toBe('Mock Group');
    expect(internalMockSocket.groupMetadata as Mock<typeof internalMockSocket.groupMetadata>).toHaveBeenCalledTimes(1);
  });
});


async function waitUntilCalled(mock: Mock<(args: any) => void>) {
  return new Promise<void>((resolve) => {
    mock.mockImplementationOnce(() => resolve());
  });
}
