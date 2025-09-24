import { expect, test } from "bun:test";
import { MockGroupTxtMsg } from "../mocks/MockIndividualGroup.mock.js";
import { WhatsappGroupIdentifier, WhatsappIndividualIdentifier, WhatsappLIDIdentifier } from "../Whatsapp.types.js";
import WhatsSocket_Submodule_Receiver_MockingSuite from "./WhatsSocket.receiver.mockingsuite.js";

const LID_fake = "myParticipantIdLid" + WhatsappLIDIdentifier;
const PN_fake = "myParticipant" + WhatsappIndividualIdentifier;
const CHATID_FAKE = "chatIdFake" + WhatsappGroupIdentifier;

test("ShouldNotThrowErrorWhenInstatiating", () => {
  expect(() => {
    new WhatsSocket_Submodule_Receiver_MockingSuite();
  }).not.toThrow();
});

test("ShouldClearMocksCorrectly", async (): Promise<void> => {
  const suite = new WhatsSocket_Submodule_Receiver_MockingSuite();

  // Configuring MockChat.SetGroupMetadata (is just a wrapper around suite.SetGroupMetadataMock())
  suite.SetGroupMetadataMock({
    groupName: "Overridden Group",
  });

  // Arrange: put some mocks
  // 1. Adding msg to wait
  suite.AddWaitMsg({ rawMsg: MockGroupTxtMsg });

  // 2. Let's say the command is being executed. It waits for the message
  suite.Waited.push({
    waitedMsgType: 1 as any,
    chatId: CHATID_FAKE,
    partipantId_LID: LID_fake,
    participantId_PN: PN_fake,
  });

  // 3. Sanity check before clearing
  expect(suite["_queueWait"]?.length ?? 0).toBeGreaterThan(0);
  expect(suite.Waited.length).toBeGreaterThan(0);
  expect(suite.GroupMetadataToSendMock?.groupName).toBe("Overridden Group");

  // Act
  suite.ClearMocks();

  // Assert
  expect(suite["_queueWait"]?.length ?? 0).toBe(0); //There are no pending waited msg to send to "command"
  expect(suite.Waited.length).toBe(0); //No msgs waited successfully after command execution
  expect(suite.GroupMetadataToSendMock?.groupName).toBe("DEFAULT_groupname"); // should be with default name
  expect(suite.GroupMetadataToSendMock?.id.endsWith(WhatsappGroupIdentifier)).toBe(true); //should have a default chatId with correct suffix
});
