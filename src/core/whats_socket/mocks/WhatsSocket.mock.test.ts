import { describe, it, expect } from "bun:test";
import { WhatsappGroupIdentifier } from "../../../Whatsapp.types";
import WhatsSocketMock from "./WhatsSocket.mock";

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
    expect(socketMock.SentMessagesThroughQueue.length).toBe(0);
    expect(socketMock.SentMessagesThroughRaw.length).toBe(0);
    expect(socketMock.GroupsIDTriedToFetch.length).toBe(0);
  });

  it("WhenSendingMsgsThroughSocket_MustBeSent", async () => {
    const socketMock = new WhatsSocketMock();

    expect(socketMock.SentMessagesThroughQueue).toHaveLength(0);
    expect(socketMock.SentMessagesThroughRaw).toHaveLength(0);
    await socketMock.SendSafe(`chatIdtest${WhatsappGroupIdentifier}`, { text: "First messsage" });
    expect(socketMock.SentMessagesThroughQueue.length).toBe(1);
    await socketMock.SendSafe(`chatIdtest${WhatsappGroupIdentifier}`, { text: "Second messsage" });
    expect(socketMock.SentMessagesThroughQueue.length).toBe(2);
    await socketMock.SendSafe(`chatIdtest${WhatsappGroupIdentifier}`, { text: "Third messsage" });
    expect(socketMock.SentMessagesThroughQueue.length).toBe(3);

    //Of course, socketMock.SentMessagesThroughRaw will have 3 elements as well, the enqueue calls Raw method when finishes!
    expect(socketMock.SentMessagesThroughRaw.length).toBe(3);
  });

  it("Clear_WhenSocketMockHasBeenUseALot_ShouldCleanItself", async () => {
    const socketMock = new WhatsSocketMock();
    socketMock.onRestart.Subscribe((() => { }) as any);
    socketMock.onMessageUpsert.Subscribe(() => { });
    socketMock.onGroupEnter.Subscribe(() => { });
    socketMock.onGroupUpdate.Subscribe(() => { });
    socketMock.onStartupAllGroupsIn.Subscribe(() => { });

    expect(socketMock.onRestart.Length).toBe(1);
    expect(socketMock.onMessageUpsert.Length).toBe(1);
    expect(socketMock.onGroupEnter.Length).toBe(1);
    expect(socketMock.onGroupUpdate.Length).toBe(1);
    expect(socketMock.onStartupAllGroupsIn.Length).toBe(1);

    expect(socketMock.SentMessagesThroughQueue).toHaveLength(0);
    expect(socketMock.SentMessagesThroughRaw).toHaveLength(0);
    await socketMock.SendSafe(`chatIdtest${WhatsappGroupIdentifier}`, { text: "Hello world" });
    expect(socketMock.SentMessagesThroughQueue).toHaveLength(1);
    expect(socketMock.SentMessagesThroughRaw).toHaveLength(1);



    socketMock.ClearMock();

    expect(socketMock.SentMessagesThroughQueue).toHaveLength(0);
    expect(socketMock.SentMessagesThroughRaw).toHaveLength(0);
    expect(socketMock.onRestart.Length).toBe(0);
    expect(socketMock.onMessageUpsert.Length).toBe(0);
    expect(socketMock.onGroupEnter.Length).toBe(0);
    expect(socketMock.onGroupUpdate.Length).toBe(0);
    expect(socketMock.onStartupAllGroupsIn.Length).toBe(0);
    expect(socketMock.GroupsIDTriedToFetch).toEqual([]);
  });
});

