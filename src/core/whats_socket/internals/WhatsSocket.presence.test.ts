import { describe, expect, it, spyOn } from "bun:test";
import { MockAdapter } from "../MockAdapter.js";
import WhatsSocketMock from "../mocks/WhatsSocket.mock.js";
import { WhatsSocket_Submodule_Presence } from "./WhatsSocket.presence.js";

function toolkit() {
  const mockClient = new MockAdapter();
  const mockParent = new WhatsSocketMock(mockClient);
  const presence = new WhatsSocket_Submodule_Presence(mockParent);
  return { mockClient, presence };
}

describe("WhatsSocket.presence", () => {
  it("SetGlobalPresenceState_WhenCalling_ShouldCallClientWithStateAndReturnTrue", async () => {
    const { presence, mockClient } = toolkit();
    const setPresenceStateSpy = spyOn(mockClient, "setPresenceState");

    const result = await presence.SetGlobalPresenceState("online");

    expect(setPresenceStateSpy).toHaveBeenCalledWith("online");
    expect(setPresenceStateSpy).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it("SetGlobalPresenceState_WhenClientThrows_ShouldCatchAndReturnFalse", async () => {
    const { presence, mockClient } = toolkit();
    const setPresenceStateSpy = spyOn(mockClient, "setPresenceState");
    setPresenceStateSpy.mockRejectedValueOnce(new Error("Network Error"));

    const result = await presence.SetGlobalPresenceState("online");

    expect(setPresenceStateSpy).toHaveBeenCalledWith("online");
    expect(result).toBe(false);
  });

  it("StartTyping_WhenCalling_ShouldCallClientWithTypingActivityAndReturnTrue", async () => {
    const { presence, mockClient } = toolkit();
    const setChatActivitySpy = spyOn(mockClient, "setChatActivity");
    const normalizeSpy = spyOn(mockClient, "normalizeJid").mockReturnValue("normalized-jid");

    const result = await presence.StartTyping("some-jid");

    expect(normalizeSpy).toHaveBeenCalledWith("some-jid");
    expect(setChatActivitySpy).toHaveBeenCalledWith("normalized-jid", "typing");
    expect(result).toBe(true);
  });

  it("StartTyping_WhenClientThrows_ShouldCatchAndReturnFalse", async () => {
    const { presence, mockClient } = toolkit();
    const setChatActivitySpy = spyOn(mockClient, "setChatActivity");
    setChatActivitySpy.mockRejectedValueOnce(new Error("Network Error"));

    const result = await presence.StartTyping("some-jid");

    expect(result).toBe(false);
  });

  it("StopTyping_WhenCalling_ShouldCallClientWithIdleActivityAndReturnTrue", async () => {
    const { presence, mockClient } = toolkit();
    const setChatActivitySpy = spyOn(mockClient, "setChatActivity");
    const normalizeSpy = spyOn(mockClient, "normalizeJid").mockReturnValue("normalized-jid");

    const result = await presence.StopTyping("some-jid");

    expect(normalizeSpy).toHaveBeenCalledWith("some-jid");
    expect(setChatActivitySpy).toHaveBeenCalledWith("normalized-jid", "idle");
    expect(result).toBe(true);
  });

  it("StopTyping_WhenClientThrows_ShouldCatchAndReturnFalse", async () => {
    const { presence, mockClient } = toolkit();
    const setChatActivitySpy = spyOn(mockClient, "setChatActivity");
    setChatActivitySpy.mockRejectedValueOnce(new Error("Network Error"));

    const result = await presence.StopTyping("some-jid");

    expect(result).toBe(false);
  });

  it("StartRecording_WhenCalling_ShouldCallClientWithRecordingActivityAndReturnTrue", async () => {
    const { presence, mockClient } = toolkit();
    const setChatActivitySpy = spyOn(mockClient, "setChatActivity");
    const normalizeSpy = spyOn(mockClient, "normalizeJid").mockReturnValue("normalized-jid");

    const result = await presence.StartRecording("some-jid");

    expect(normalizeSpy).toHaveBeenCalledWith("some-jid");
    expect(setChatActivitySpy).toHaveBeenCalledWith("normalized-jid", "recording");
    expect(result).toBe(true);
  });

  it("StartRecording_WhenClientThrows_ShouldCatchAndReturnFalse", async () => {
    const { presence, mockClient } = toolkit();
    const setChatActivitySpy = spyOn(mockClient, "setChatActivity");
    setChatActivitySpy.mockRejectedValueOnce(new Error("Network Error"));

    const result = await presence.StartRecording("some-jid");

    expect(result).toBe(false);
  });

  it("StopRecording_WhenCalling_ShouldCallClientWithIdleActivityAndReturnTrue", async () => {
    const { presence, mockClient } = toolkit();
    const setChatActivitySpy = spyOn(mockClient, "setChatActivity");
    const normalizeSpy = spyOn(mockClient, "normalizeJid").mockReturnValue("normalized-jid");

    const result = await presence.StopRecording("some-jid");

    expect(normalizeSpy).toHaveBeenCalledWith("some-jid");
    expect(setChatActivitySpy).toHaveBeenCalledWith("normalized-jid", "idle");
    expect(result).toBe(true);
  });

  it("StopRecording_WhenClientThrows_ShouldCatchAndReturnFalse", async () => {
    const { presence, mockClient } = toolkit();
    const setChatActivitySpy = spyOn(mockClient, "setChatActivity");
    setChatActivitySpy.mockRejectedValueOnce(new Error("Network Error"));

    const result = await presence.StopRecording("some-jid");

    expect(result).toBe(false);
  });

  it("WithTyping_WhenCalling_ShouldStartTypingThenExecuteActionThenStopTyping", async () => {
    const { presence } = toolkit();
    const startTypingSpy = spyOn(presence, "StartTyping").mockResolvedValue(true);
    const stopTypingSpy = spyOn(presence, "StopTyping").mockResolvedValue(true);

    let actionExecuted = false;
    const action = async () => {
      actionExecuted = true;
      return "result";
    };

    const result = await presence.WithTyping("some-jid", action);

    expect(startTypingSpy).toHaveBeenCalledWith("some-jid");
    expect(actionExecuted).toBe(true);
    expect(stopTypingSpy).toHaveBeenCalledWith("some-jid");
    expect(result).toBe("result");
  });

  it("WithTyping_WhenActionThrows_ShouldStopTypingAndRethrow", async () => {
    const { presence } = toolkit();
    const startTypingSpy = spyOn(presence, "StartTyping").mockResolvedValue(true);
    const stopTypingSpy = spyOn(presence, "StopTyping").mockResolvedValue(true);

    const action = async () => {
      throw new Error("Action Error");
    };

    let error: any;
    try {
      await presence.WithTyping("some-jid", action);
    } catch (e) {
      error = e;
    }

    expect(startTypingSpy).toHaveBeenCalledWith("some-jid");
    expect(error.message).toBe("Action Error");
    expect(stopTypingSpy).toHaveBeenCalledWith("some-jid");
  });

  it("WithRecording_WhenCalling_ShouldStartRecordingThenExecuteActionThenStopRecording", async () => {
    const { presence } = toolkit();
    const startRecordingSpy = spyOn(presence, "StartRecording").mockResolvedValue(true);
    const stopRecordingSpy = spyOn(presence, "StopRecording").mockResolvedValue(true);

    let actionExecuted = false;
    const action = async () => {
      actionExecuted = true;
      return "result";
    };

    const result = await presence.WithRecording("some-jid", action);

    expect(startRecordingSpy).toHaveBeenCalledWith("some-jid");
    expect(actionExecuted).toBe(true);
    expect(stopRecordingSpy).toHaveBeenCalledWith("some-jid");
    expect(result).toBe("result");
  });

  it("WithRecording_WhenActionThrows_ShouldStopRecordingAndRethrow", async () => {
    const { presence } = toolkit();
    const startRecordingSpy = spyOn(presence, "StartRecording").mockResolvedValue(true);
    const stopRecordingSpy = spyOn(presence, "StopRecording").mockResolvedValue(true);

    const action = async () => {
      throw new Error("Action Error");
    };

    let error: any;
    try {
      await presence.WithRecording("some-jid", action);
    } catch (e) {
      error = e;
    }

    expect(startRecordingSpy).toHaveBeenCalledWith("some-jid");
    expect(error.message).toBe("Action Error");
    expect(stopRecordingSpy).toHaveBeenCalledWith("some-jid");
  });
});
