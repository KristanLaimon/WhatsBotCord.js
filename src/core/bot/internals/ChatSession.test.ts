import { it, test, expect, spyOn, type Mock } from "bun:test";
import { WhatsSocketSugarSender_Submodule, type WhatsMsgSenderSendingOptions } from 'src/core/whats_socket/internals/WhatsSocket.sugarsenders';
import WhatsSocketMock from 'src/core/whats_socket/mocks/WhatsSocket.mock';
import { ChatSession } from './ChatSession';
import { GroupMsg } from 'src/helpers/Whatsapp.helper.mocks';
import { WhatsappIndividualIdentifier } from 'src/Whatsapp.types';

/**
 * ChatSession Testing Suite
 * * Here we only test how 'ChatSession' (Object) delegates correclty to its internal 
 * * WhatsSocketsugarSender(_Submodule) object with correct params.
 * 
 * All testing corresponding about how msgs are going through socket or any 
 * low-level testing, it's already made on the following files:
 *
 * 1. src/core/whats_socket/internals/WhatsSocket.sugarsenders.test.ts
 * 2. src/core/whats_socket/WhatsSocket.mock.test.ts
 * 3. src/core/wahts_socket/mocks/Whatssocket.mock.test.ts
 */

// ========= Utilities ===========
const chatId: string = GroupMsg.key.remoteJid!;
function GenerateLocalToolKit_ChatSession_FromGroup(): { mockSocket: WhatsSocketMock, sender: WhatsSocketSugarSender_Submodule, chat: ChatSession } {
  const mockSocket = new WhatsSocketMock({ minimumMilisecondsDelayBetweenMsgs: 0 });
  const senderDependency = new WhatsSocketSugarSender_Submodule(mockSocket);
  const chatSession = new ChatSession(GroupMsg.key.remoteJid!, GroupMsg, senderDependency);
  return { mockSocket, sender: senderDependency, chat: chatSession }
}

test("WhenInstatiating_ShouldNotThrowAnyError", () => {
  expect(() => {
    GenerateLocalToolKit_ChatSession_FromGroup();
  }).not.toThrow();
});


it("Text_WhenUsingSendText_ShouldUseCorrectlySugarSender", async () => {
  const { chat, sender } = GenerateLocalToolKit_ChatSession_FromGroup();
  const options: WhatsMsgSenderSendingOptions = {
    sendRawWithoutEnqueue: false,
    mentionsIds: ["testID" + WhatsappIndividualIdentifier, "testID2" + WhatsappIndividualIdentifier]
  };
  const senderTextSpy: Mock<typeof sender.Text> = spyOn(sender, "Text");
  await chat.SendText("Hello world with options", options);
  expect(senderTextSpy).toBeCalledWith(chatId, "Hello world with options", options);
})

