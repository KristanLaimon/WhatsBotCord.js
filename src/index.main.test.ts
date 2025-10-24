import { test } from "bun:test";
import type { AdditionalAPI, CommandArgs, IChatContext } from "./index.js";
import { type ICommand, ChatMock, SenderType } from "./index.js";

test("Issue before update testt", async () => {
  class Com implements ICommand {
    name: string = "com";
    public async run(_ctx: IChatContext, _api: AdditionalAPI, args: CommandArgs): Promise<void> {
      console.log(args.participantIdLID); //It could be string | null
      console.log(args.participantIdPN); //It could be string | null
    }
  }
  const chat = new ChatMock(new Com(), {
    // participantId_LID: undefined, //this sets args.participantLID to "fakeParticipantID@lid"
    // participantId_PN: undefined, // this sets args.participantPN to  "fakeParticipantID@s.whatsapp.net"
    senderType: SenderType.Group,
  });
  const chat2 = new ChatMock(new Com(), {
    participantId_LID: "", //this sets args.participantLID to "fakeParticipantID@lid"
    participantId_PN: "", // this sets args.participantPN to  "fakeParticipantID@s.whatsapp.net"
    senderType: SenderType.Group,
  });

  //So... how can I set participantId_LID to null? when simulating it comes from individual chat
  //or error with whatsapp servers when fetching that arg.variable?
  await chat.StartChatSimulation();
  await chat2.StartChatSimulation();
});
