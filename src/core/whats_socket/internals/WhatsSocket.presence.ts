import type { WhatsappPresenceState } from "../types.js";
import type { IWhatsSocket_Submodule_Presence } from "./IWhatsSocket.presence.js";
import type { IWhatsSocket } from "../IWhatsSocket.js";

export class WhatsSocket_Submodule_Presence implements IWhatsSocket_Submodule_Presence {
  private readonly _parent: IWhatsSocket;

  constructor(parent: IWhatsSocket) {
    this._parent = parent;
  }

  public async SetGlobalPresenceState(state: WhatsappPresenceState): Promise<boolean> {
    try {
      return await this._parent.Socket.setPresenceState(state);
    } catch {
      return false;
    }
  }

  public async StartTyping(jid: string): Promise<boolean> {
    try {
      return await this._parent.Socket.setChatActivity(this._parent.Socket.normalizeJid(jid), "typing");
    } catch {
      return false;
    }
  }

  public async StopTyping(jid: string): Promise<boolean> {
    try {
      return await this._parent.Socket.setChatActivity(this._parent.Socket.normalizeJid(jid), "idle");
    } catch {
      return false;
    }
  }

  public async StartRecording(jid: string): Promise<boolean> {
    try {
      return await this._parent.Socket.setChatActivity(this._parent.Socket.normalizeJid(jid), "recording");
    } catch {
      return false;
    }
  }

  public async StopRecording(jid: string): Promise<boolean> {
    try {
      return await this._parent.Socket.setChatActivity(this._parent.Socket.normalizeJid(jid), "idle");
    } catch {
      return false;
    }
  }

  public async WithTyping<T>(jid: string, action: () => Promise<T>): Promise<T> {
    await this.StartTyping(jid);

    try {
      return await action();
    } finally {
      await this.StopTyping(jid);
    }
  }

  public async WithRecording<T>(jid: string, action: () => Promise<T>): Promise<T> {
    await this.StartRecording(jid);

    try {
      return await action();
    } finally {
      await this.StopRecording(jid);
    }
  }
}
