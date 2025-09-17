import type { MiscMessageGenerationOptions } from "baileys";
import type { IWhatsSocket } from "../../whats_socket/IWhatsSocket.js";
import type { WhatsappMessage } from "../../whats_socket/types.js";

type MyselfStatusTextParams = Omit<Omit<MiscMessageGenerationOptions, "statusJidList">, "broadcast">;

/**
 * Submodule responsible for sending status updates ("stories")
 * through the WhatsApp socket.
 *
 * This is a lightweight abstraction around the socket API for the
 * `status@broadcast` JID, enabling text uploads visible only to
 * selected WhatsApp IDs.
 *
 * Typical usage (from inside a command):
 * ```ts
 * await api.Myself.Status.UploadText("Working on the bot 🚀", [
 *   "123456789@s.whatsapp.net",
 *   "987654321@s.whatsapp.net",
 * ]);
 * ```
 */
export default class Myself_Submodule_Status {
  /**
   * Reserved WhatsApp ID for the "status" broadcast channel.
   * All status updates must be sent to this JID.
   *
   * @internal
   */
  private readonly IDStatusToSend: string = "status@broadcast";

  private _whatsSocket: IWhatsSocket;

  /**
   * Creates a new `Myself_Submodule_Status` tied to a given socket.
   *
   * @param chatContextOwner - The active WhatsApp socket instance
   * that will handle sending the status update.
   */
  public constructor(chatContextOwner: IWhatsSocket) {
    this._whatsSocket = chatContextOwner;
  }

  /**
   * Uploads a plain text status update, visible only to the provided
   * list of WhatsApp IDs.
   *
   * This method sends a message to the special `status@broadcast` JID
   * with additional metadata indicating which contacts should see it.
   *
   * @param txtToSendToStatus - The text content of the status.
   * @param whatsappIdsToShowStatus - List of WhatsApp user IDs allowed to view the status.
   * All ID's must be PN (PhoneNumber) old version. e.g ["12345@s.whatsapp.net", "anotherID@s.whatsapp.net"]
   *
   * @returns A `WhatsappMessage` object representing the sent status, or `null`
   * if the message failed to send safely.
   *
   * @example
   * ```ts
   * const status = new Myself_Submodule_Status(socket);
   * await status.UploadText("Bot is online ✅", ["12345@s.whatsapp.net"]);
   * ```
   */
  public async UploadText(txtToSendToStatus: string, whatsappIdsToShowStatus: string[], options?: MyselfStatusTextParams): Promise<WhatsappMessage | null> {
    let optionsTosend: MiscMessageGenerationOptions;
    if (options) {
      optionsTosend = { ...options, statusJidList: whatsappIdsToShowStatus, broadcast: true };
    } else {
      optionsTosend = { statusJidList: whatsappIdsToShowStatus, broadcast: true };
    }

    return this._whatsSocket._SendSafe(
      this.IDStatusToSend,
      {
        text: txtToSendToStatus,
      },
      optionsTosend
    );
  }
}
