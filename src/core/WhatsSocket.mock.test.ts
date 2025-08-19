import { describe, it, expect } from "../TestSuite";
import WhatsSocketMock from './WhatsSocket.mock';

describe("WhatsSocketMock Generally", () => {

  it("WhenInstatiatingWithNoParams_ShouldNotThrowError", () => {
    expect(() => {
      new WhatsSocketMock();
    }).not.toThrow();
  });

  it("WhenInstatiatingWithNoParams_ShouldBeOffByDefault", () => {
    const socketMock = new WhatsSocketMock();
    expect(socketMock.IsOn).toBe(false);
  });

  it("WhenInstatiatingWithNoParams_ShouldBeCleanedAtFirst", () => {
    const socketMock = new WhatsSocketMock();

    expect(socketMock.SentMessagesHistoryReadOnly.length).toBe(0);
    expect(socketMock.GroupsIDTriedToFetch.length).toBe(0);
  })

  it("WhenSendingMsgsThroughSocket_ShouldBeStoredCorrectly", async () => {
    const socketMock = new WhatsSocketMock();

    expect(socketMock.SentMessagesHistoryReadOnly).toHaveLength(0);

    await socketMock.Send("chatId@g.us", { text: "First messsage" });
    expect(socketMock.SentMessagesHistoryReadOnly.length).toBe(1);
    await socketMock.Send("chatId@g.us", { text: "Second messsage" });
    expect(socketMock.SentMessagesHistoryReadOnly.length).toBe(2);
    await socketMock.Send("chatId@g.us", { text: "Third messsage" });
    expect(socketMock.SentMessagesHistoryReadOnly.length).toBe(3);
  });

  it("Clear_WhenSocketMockHasBeenUseALot_ShouldCleanItself", () => {
    const socketMock = new WhatsSocketMock();
    socketMock.onReconnect.Subscribe((() => { }) as any);
    socketMock.onIncomingMessage.Subscribe(() => { });
    socketMock.onGroupEnter.Subscribe(() => { });
    socketMock.onGroupUpdate.Subscribe(() => { });
    socketMock.onStartupAllGroupsIn.Subscribe(() => { });

    expect(socketMock.onReconnect.Length).toBe(1);
    expect(socketMock.onIncomingMessage.Length).toBe(1);
    expect(socketMock.onGroupEnter.Length).toBe(1);
    expect(socketMock.onGroupUpdate.Length).toBe(1);
    expect(socketMock.onStartupAllGroupsIn.Length).toBe(1);

    expect(socketMock.SentMessagesHistoryReadOnly).toHaveLength(0);
    socketMock.Send("chatIDTest@g.us", { text: "Hello world" });
    expect(socketMock.SentMessagesHistoryReadOnly).toHaveLength(1);


    socketMock.ClearMock();

    expect(socketMock.SentMessagesHistoryReadOnly).toHaveLength(0);
    expect(socketMock.onReconnect.Length).toBe(0);
    expect(socketMock.onIncomingMessage.Length).toBe(0);
    expect(socketMock.onGroupEnter.Length).toBe(0);
    expect(socketMock.onGroupUpdate.Length).toBe(0);
    expect(socketMock.onStartupAllGroupsIn.Length).toBe(0);
    expect(socketMock.SentMessagesHistoryReadOnly).toEqual([]);
    expect(socketMock.GroupsIDTriedToFetch).toEqual([]);
  });
});

