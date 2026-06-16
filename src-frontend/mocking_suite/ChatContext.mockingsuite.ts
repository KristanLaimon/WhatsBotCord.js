import type { IChatContextConfig } from "../bot/internals/ChatContext.js";
import { ChatContext } from "../bot/internals/ChatContext.js";
import type { WhatsappMessage } from "../whats_socket/types.js";
import type { MsgType } from "../types/Msg.types.js";

/**
 * Mocking suite for {@link ChatContext}.
 *
 * This subclass is designed for unit/integration testing where
 * you don't want to actually download media from WhatsApp servers.
 * Instead of using `downloadMediaMessage`, it returns a configurable
 * mock buffer/Uint8Array whenever a multimedia message is awaited.
 *
 * Usage:
 * ```ts
 * const mockCtx = new ChatContext_MockingSuite();
 * mockCtx.SetWaitMultiMediaBufferReturn(new TextEncoder().encode("test"));
 *
 * const buf = await mockCtx.WaitMultimedia(MsgType.Image);
 * // buf === Uint8Array of "test"
 * ```
 */
export default class ChatContext_MockingSuite extends ChatContext {
  /**
   * Internal buffer to be returned when {@link WaitMultimedia} is called.
   * Defaults to `"mock_buffer"`.
   */
  private readonly _defaultBufferToReturn: Uint8Array = new TextEncoder().encode("mock_buffer");

  private _queuedBufferToReturn: Uint8Array[] = [];

  /**
   * Configure the buffer that will be returned in place of a real
   * downloaded multimedia message.
   *
   * @param anyBuffer - The buffer/Uint8Array to return on next `WaitMultimedia` calls.
   */
  public EnqueueMediaBufferToReturn(anyBuffer: Uint8Array) {
    this._queuedBufferToReturn.push(anyBuffer);
  }

  /**
   * Reset mock state to defaults.
   * The mock buffer is reset to `"mock_buffer"`.
   */
  public ClearMocks() {
    this._queuedBufferToReturn = [];
  }

  /**
   * Override of {@link ChatContext.WaitMultimedia}.
   *
   * Instead of downloading media via baileys, this returns the mock buffer
   * set via {@link EnqueueMediaBufferToReturn}.
   *
   * @param msgTypeToWaitFor - Type of multimedia message to wait for.
   * @param localOptions - Optional filters overriding the global context config.
   * @returns The configured mock buffer, or `null` if no matching message was found.
   */
  public override async WaitMultimedia(
    msgTypeToWaitFor: MsgType.Image | MsgType.Sticker | MsgType.Video | MsgType.Document | MsgType.Audio,
    localOptions?: Partial<IChatContextConfig>
  ): Promise<Uint8Array | null> {
    const found: WhatsappMessage | null = await this.WaitMsg(msgTypeToWaitFor, localOptions);
    if (!found) return null;
    const buffertoReturn: Uint8Array = this._queuedBufferToReturn.length > 0 ? this._queuedBufferToReturn.shift()! : this._defaultBufferToReturn;
    return buffertoReturn;
  }
}
