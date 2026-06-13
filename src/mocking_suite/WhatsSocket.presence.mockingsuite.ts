import type { IWhatsSocket_Submodule_Presence } from "../core/whats_socket/internals/IWhatsSocket.presence.js";
import type { WhatsappPresenceState } from "../core/whats_socket/types.js";

/**
 * A mocking implementation of `IWhatsSocket_Submodule_Presence` designed for unit testing.
 * This class simulates the behavior of presence management without interacting
 * with the actual WhatsApp socket.
 */
export default class WhatsSocket_Submodule_Presence_MockingSuite implements IWhatsSocket_Submodule_Presence {
  //=================================================== Spy External Methods ==================================================
  public Actions: Array<{
    actionName: keyof IWhatsSocket_Submodule_Presence;
    chatId?: string;
    additionalArguments?: any;
  }> = [];
  //===========================================================================================================================

  public ClearMocks(): void {
    this.Actions = [];
  }

  public async SetGlobalPresenceState(state: WhatsappPresenceState): Promise<boolean> {
    this.Actions.push({
      actionName: "SetGlobalPresenceState",
      additionalArguments: { state },
    });
    return true;
  }

  public async StartTyping(chatId: string): Promise<boolean> {
    this.Actions.push({
      actionName: "StartTyping",
      chatId,
    });
    return true;
  }

  public async StopTyping(chatId: string): Promise<boolean> {
    this.Actions.push({
      actionName: "StopTyping",
      chatId,
    });
    return true;
  }

  public async StartRecording(chatId: string): Promise<boolean> {
    this.Actions.push({
      actionName: "StartRecording",
      chatId,
    });
    return true;
  }

  public async StopRecording(chatId: string): Promise<boolean> {
    this.Actions.push({
      actionName: "StopRecording",
      chatId,
    });
    return true;
  }

  public async WithTyping<T>(chatId: string, action: () => Promise<T>): Promise<T> {
    await this.StartTyping(chatId);
    try {
      return await action();
    } finally {
      await this.StopTyping(chatId);
    }
  }

  public async WithRecording<T>(chatId: string, action: () => Promise<T>): Promise<T> {
    await this.StartRecording(chatId);
    try {
      return await action();
    } finally {
      await this.StopRecording(chatId);
    }
  }
}
