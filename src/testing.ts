import { CreateWhatsSocketVendorFactoryMock, MockAdapter } from "./core/whats_socket/MockAdapter.js";
import WhatsSocketMock from "./core/whats_socket/mocks/WhatsSocket.mock.js";
import type { IWhatsappAdapter } from "./core/whats_socket/types.js";
import ChatMock from "./mocking_suite/ChatMock.js";
import WhatsSocket_Submodule_Presence_MockingSuite from "./mocking_suite/WhatsSocket.presence.mockingsuite.js";
import WhatsSocket_Submodule_Receiver_MockingSuite from "./mocking_suite/WhatsSocket.receiver.mockingsuite.js";

/**
 * A syntax-sugar class that automatically initializes a RAM-ONLY adapter Mock (Won't work with whatsapp servers) for TESTING-ONLY
 *
 * @example
 * ```typescript
 * import { MockAdapter } from "whatsbotcord/testing";
 * const adapter = new MockAdapter();
 * const bot = new WhatsBot({ authFolder: "./auth" }, adapter);
 *
 * // Simulate events
 * adapter.mockClient.ev.emit("messages.upsert", { ... });
 * ```
 */
export class MockAdapter implements IWhatsappAdapter {
  public mockClient: MockAdapter;

  constructor() {
    this.mockClient = new MockAdapter();
  }

  public async Create() {
    return this.mockClient;
  }
}

export {
  ChatMock,
  CreateWhatsSocketVendorFactoryMock,
  MockAdapter as GenericSocketVendorClient_Mock,
  WhatsSocket_Submodule_Presence_MockingSuite,
  WhatsSocket_Submodule_Receiver_MockingSuite,
  WhatsSocketMock,
};
