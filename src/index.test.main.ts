//Its test framework agnostic!
import { describe, it } from "bun:test";
import type { CommandArgs, IChatContext, ICommand, RawMsgAPI, WhatsappMessage } from "whatsbotcord";
import { MsgHelpers, MsgType, SenderType, WhatsChatMock } from "whatsbotcord";

class MyCommand implements ICommand {
  name: string = "command";
  aliases?: string[] | undefined; // Totally Optional to use (doesn't affect testing)
  description?: string | undefined; // Tottal Ooptional to use (doesn't affect testing)
  async run(ctx: IChatContext, _rawMsgApi: RawMsgAPI, args: CommandArgs): Promise<void> {
    console.log(args.args); // Prints: ["argument1", "argument2"]
    console.log(ctx.FixedChatId); // Prints: "myCustomChatId!@g.us"
    console.log(args.chatId); // Prints: "myCustomChatId!@g.us"
    console.log(ctx.FixedParticipantId); // Prints: "myCustomParticipantId!@whatsapp.es"

    await ctx.SendText("What's your name?");

    //1. You can get the txt easily with this method
    const name: string | null = await ctx.WaitText(/**you can send optiona/additional params!*/ { timeoutSeconds: 3 });
    if (name) await ctx.SendText("Hello " + name + ". Nice to meet you");
    else await ctx.SendText("You didn't respond in 3 seconds..");

    await ctx.SendText("Whats your favorite programming language?");

    //2. Or, you can get the whole object msg and manage it by yourself
    //You can get the complete msg, not only text!
    const programmingNameWhatsResponse: WhatsappMessage | null = await ctx.WaitMsg(MsgType.Text /** you can send optional/additional params*/);
    if (programmingNameWhatsResponse) {
      //To extract the text, you can use this helper (import it from library)
      const favoriteProgrammingName: string | null = MsgHelpers.FullMsg_GetText(programmingNameWhatsResponse);
      if (favoriteProgrammingName) {
        await ctx.SendText("Oh, your favorite language is: ");
      }
    } else {
      await ctx.SendText("You didn't respond in 3 seconds"); //Default timeout time if not specified on ctx.WaitMsg but specified on WhatsChatMock() params options
    }
  }
}

describe("Your Suite Text", () => {
  it("Test 1 with it", async () => {
    //This is the environment mocked your command will be executed
    //Arguments are totally optional
    const chat = new WhatsChatMock(new MyCommand(), {
      //Check how this args are passed into command obj through (ctx, rawMsgApi, args) objects!
      args: ["argument1", "argument2"],
      botSettings: { commandPrefix: "!" },
      cancelKeywords: ["cancel"],
      //Default config when using Wait*() methods, if not provided, it has a default config
      chatContextConfig: { timeoutSeconds: 3 },
      //Override with your custom chatId, normally they end with @g.us but you can use WhatsappIdentifiers.GroupIdentifier constant to get "@g.us" standard
      //Or you can use a chatId@whatsapp.es, found in WhatsappIdentifiers.IndividualUserIdentifier
      chatId: "myCustomChatId!@g.us",
      msgType: MsgType.Text,
      //Override with your custom participantId, normally they end with @lid for newer whats groups or @whatsapp.es on old groups
      //You can use WhatsappIdentifiers.IndividualUserIdentifier for "@whatsapp.es" string constant or WhatsappIdentifiers.LIDIdentifier for "@lid" constant string
      participantId: "myCustomParticipantId!@whatsapp.es",

      //You decide if command should be called from a "private chat" or "group chat"
      senderType: SenderType.Individual,
    });
    //For more complex user interaction, lets say we want to simulate our user send us their name to greet them inside the command.
    //First, we are going to mock user sending "chris" text on the first ctx.WaitText() or ctx.WaitMsg(MsgType.Text), our command have.
    //Order is important, the order they are enqueued, its the order the command will receive them!
    chat.EnqueueIncomingText("chris"); //Or you can use chat.EnqueueIncomingText(null); to return null (timeout error mocking), but the latter feature is pending to add
    chat.EnqueueIncomingText("typescript");
    //@Important: This starts the emulation
    await chat.StartChatSimulation();

    console.log(chat.SentFromCommand.Texts); //Prints (aprox.): [{text: "What's your name?"}, {text: "Hello chris. Nice to meet you", ...}]
    console.log(chat.WaitedFromCommand); //Prints (aprox.): [{options:{timeoutSeconds: 3}}, {options:}]
    //You can retrieve all SentMsgs (from command to outside world chat) with chat.SentFromCommand object
    //YOu can retrieve every time command waited for a msg (from outside world chat to command) with chat.WaitedFromCommand array
    //So you can validate your command send your expected text, or waits correctly
  });
});
