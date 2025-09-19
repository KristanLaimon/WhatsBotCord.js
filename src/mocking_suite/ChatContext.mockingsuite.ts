import type { ChatContextConfig } from "../core/bot/internals/ChatContext.js";
import { ChatContext } from "../core/bot/internals/ChatContext.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";
import type { MsgType } from "../Msg.types.js";

/**
 * Mocking suite for {@link ChatContext}.
 *
 * This subclass is designed for unit/integration testing where
 * you don't want to actually download media from WhatsApp servers.
 * Instead of using `downloadMediaMessage`, it returns a configurable
 * mock buffer whenever a multimedia message is awaited.
 *
 * Usage:
 * ```ts
 * const mockCtx = new ChatContext_MockingSuite();
 * mockCtx.SetWaitMultiMediaBufferReturn(Buffer.from("test"));
 *
 * const buf = await mockCtx.WaitMultimedia(MsgType.Image);
 * // buf === Buffer.from("test")
 * ```
 */
export default class ChatContext_MockingSuite extends ChatContext {
  /**
   * Internal buffer to be returned when {@link WaitMultimedia} is called.
   * Defaults to `"mock_buffer"`.
   */
  private _waitMultimedia_BufferToReturn: Buffer = Buffer.from("mock_buffer");

  /**
   * Configure the buffer that will be returned in place of a real
   * downloaded multimedia message.
   *
   * @param anyBuffer - The buffer to return on next `WaitMultimedia` calls.
   */
  public SetWaitMultiMediaBufferReturn(anyBuffer: Buffer) {
    this._waitMultimedia_BufferToReturn = anyBuffer;
  }

  /**
   * Reset mock state to defaults.
   * The mock buffer is reset to `"mock_buffer"`.
   */
  public ClearMocks() {
    this._waitMultimedia_BufferToReturn = Buffer.from("mock_buffer");
  }

  /**
   * Override of {@link ChatContext.WaitMultimedia}.
   *
   * Instead of downloading media via baileys, this returns the mock buffer
   * set via {@link SetWaitMultiMediaBufferReturn}.
   *
   * @param msgTypeToWaitFor - Type of multimedia message to wait for.
   * @param localOptions - Optional filters overriding the global context config.
   * @returns The configured mock buffer, or `null` if no matching message was found.
   */
  public override async WaitMultimedia(
    msgTypeToWaitFor: MsgType.Image | MsgType.Sticker | MsgType.Video | MsgType.Document | MsgType.Audio,
    localOptions?: Partial<ChatContextConfig>
  ): Promise<Buffer | null> {
    const found: WhatsappMessage | null = await this.WaitMsg(msgTypeToWaitFor, localOptions);
    if (!found) return null;
    const buffer = this._waitMultimedia_BufferToReturn;
    return buffer;
  }
}

// constructor(
//   originalSenderID: string | null,
//   fixedChatId: string,
//   initialMsg: WhatsappMessage,
//   senderDependency: IWhatsSocket_Submodule_SugarSender,
//   receiverDependency: IWhatsSocket_Submodule_Receiver,
//   config: ChatContextConfig
// ) {
//   super(originalSenderID, fixedChatId, initialMsg, senderDependency, receiverDependency, config);
// }
