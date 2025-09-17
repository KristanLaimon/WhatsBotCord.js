import type { IChatContext, ICommand } from "src/index.js";
import Bot, { type ChatContext, type CommandArgs, type RawMsgAPI, CommandType, SenderType } from "src/index.js";

// =============== EveryoneTag.ts ================
class PingCommand implements ICommand {
  name: string = "ping";
  async run(chat: ChatContext, _: RawMsgAPI, __: CommandArgs): Promise<void> {
    await chat.SendText("Pong");
  }
}
class EveryoneId implements ICommand {
  name: string = "everyone";
  aliases?: string[] = ["e"];
  async run(ctx: ChatContext, _: RawMsgAPI, args: CommandArgs): Promise<void> {
    if (args.senderType === SenderType.Individual) {
      await ctx.SendText("Este comando solo puede ser usado en grupos!");
      return;
    }
    const groupData = await ctx.FetchGroupData();
    if (!groupData) {
      await ctx.SendText("Hubo un error al intentar obtener la data del grupo!...");
      return;
    }
    const allIds = groupData.members.map((m) => m.rawId!);
    const allMentionsIds: string[] = groupData.members.map((m) => m.asMentionFormatted!);
    await ctx.SendText(allMentionsIds.join(" "), { mentionsIds: allIds });
    await ctx.SendText(allMentionsIds.join(" "));
    await ctx.SendText(JSON.stringify(groupData, null, 2));
  }
}

class SendToStateCommand implements ICommand {
  public readonly name: string = "status";
  public readonly aliases?: string[] | undefined = ["st"];
  async run(ctx: IChatContext, rawMsgApi: RawMsgAPI, args: CommandArgs): Promise<void> {
    await ctx.Loading();
    console.log(args.chatId);
    if (args.args.length < 1) {
      await ctx.SendText("You must send the txt to sent to my story!. End..");
      await ctx.Fail();
      return;
    }
    const txtToSendToStory: string = args.args.join(" ");
    const res = await rawMsgApi.InternalSocket._SendRaw(
      "status@broadcast",
      { text: txtToSendToStory },
      //WORKS!!
      { statusJidList: ["5216121407908@s.whatsapp.net"], broadcast: true }
    );
    console.log(res ? res.key.id : "no msg sent");
    await ctx.SendText("Se supone que deberia funcionar. Listo");
    await ctx.Ok();
  }
}

class SendPrivately implements ICommand {
  name: string = "reply";
  async run(ctx: IChatContext, rawMsgApi: RawMsgAPI, args: CommandArgs): Promise<void> {
    if (args.senderType === SenderType.Individual) {
      await ctx.SendText("You must use this command from group!");
      return;
    }
    if (args.args.length < 1) {
      await ctx.SendText("You must use that command with the text to send to you!");
      return;
    }
    await ctx.Loading();
    const txtExtracted: string = args.args.join(" ");
    const fullWhatsId: string = args.originalRawMsg.key.participantAlt!;
    await rawMsgApi.InternalSocket.Send.Text(fullWhatsId, txtExtracted);
    await ctx.Ok();
  }
}
// ========================== MAIN ==============================
const bot = new Bot({
  commandPrefix: ["$", "!", "/", "."],
  tagCharPrefix: ["@"],
  credentialsFolder: "./auth",
  loggerMode: "recommended",
});
bot.Commands.Add(new PingCommand(), CommandType.Normal);
bot.Commands.Add(new EveryoneId(), CommandType.Tag);
bot.Commands.Add(new SendToStateCommand(), CommandType.Normal);
bot.Commands.Add(new SendPrivately(), CommandType.Normal);
bot.Events.onCommandNotFound.Subscribe(async (ctx, commandName) => {
  await ctx.SendText("No has enviado un comando válido, usaste: " + commandName);
});
bot.Settings.defaultEmojiToSendReactionOnFailureCommand = "🦊";
await bot.Start();

// ✅ Essential Testing
/** TODO TESTING:
 * 1. CHECKED ✅ | + ChatContext => Test receive methods (WaitMsgText, WaitMsg)
 * 2. CHECKED ✅ | + Bot.ts   => Test whole functionality as bot obj (not its internals)
 *                ✅ && Middleware internal system
 *                ✅ && Tests for handling command errors (known errors | unknown ones | abortedByUser with 'cancel')
 * 3. + Decorators.helper.ts  =>  ✅  Test if works as decorator
 * 4. + Receiver.test.ts      =>  ✅  Check if sending an incorrect type msg resets the timeout timer!
 * 4.1+ ChatContext.test.ts   =>  ✅  Check that local config on method overrides global config but when
 *                                ✅  not using local config, uses global config instead
 * 5. + CommandSearcher       =>  ✅  Validate assertion for "oneword" comands and preventing "" command names! && Verify command names can't have " " spaces, only 1 word long
 * 6. ✅ Check all TODO's around the project
 * 7. WhatsSocket.test.ts  ✅~ (Depends too much on baileys lib)   => Test all on* events (4/7 already done!);
 */

// [X]: Features TODO
// CHECKED ✅[X] GROUP UTILITES (ICommand, Bot): Give group utilites (fetch all members for example) => Bot should expose GetGroupMetadata and group handling and ChatContext should provide facilities for group info (and group handling?)
// CHECKED ✅[X] CHATCONTEXT:  must have a WaitMsg_# (per message type) dedicated.
// CHECKED ✅[X] GENERAL: Document Update => Should be capable to RECEIVE and SEND documents!
//        CHECKED ✅[X]: Send documents
//              CHECKED [X]: Test..
//        CHECKED ✅[X]: Receive documents
//              CHECKED [X]: Test..
//      @Note: So far, it can recognize and get documents, but not sending (not tested at all) ❌
// ✅[X]: WhatsSocket.SugarSender: Test MIME types being inferred correctly from WhatsSocket.SugarSender (TESTS) on all MULTIMEDIA SENDING!
// ✅[X]: WhatsSocket.Start : If internal baileys socket crashes at first run, should reset itself, or console.log user should reset the program. => Document common error cases. When running the same bot twice but in second time doens't work. (Maybe you have an already running instance of this same socket with same credentials)
// ✅CORRECT al ChatContext sending msgs with good params to handle (only string | buffer && extensiontype!);....
// ✅[X]: Add a default emoji to send to original msgs when occurs an error (configurable on bot instatiation params!)

//#1 TODO: Create testing toolkit for users to simulate chats with these commands!
//TODO: (IMPORTANT) fix testing toolkit, all spy logic should be inside WhatsSocket_Submodule_Receiver and WhatsSocket_Submodule_SugarSender
//      ✅[X]: Need to extract WhatsSocket_Submodule_Receiver into an interface and extract WhatsSocket_Submodule_SugarSender into an interface
//      ✅[X]: Expose configuration to change GroupMetadata!
//      ✅[X]: Need to create a WhatsSocket_Submodule_Receiver mock exposing all waited msgs publicly (won't require a WhatsSocketMock, it won't use any real socket logic)
//      [ ]: Need to create a WhatsSocket_Submodule_SugarSender mock exposing all sent msgs publicly (won't require a WhatsSocketMock, it won't use any real socket logic)
//          [ ]: Do it per send*() type
//                ✅ [X]: Texts
//                [ ]: Imgs
//                [ ]: ReactEmojiToMsg
//                [ ]: Sticker
//                [ ]: Audio
//                [ ]: Video
//                [ ]: Document
//                [ ]: Poll
//                [ ]: Ubication
//      ✅[X]: Instanciate them inside MockChat, using a real ChatContext (Delete ChatContextSpy.ts)
//      ✅[X]: Expose as props, the public waited objs from Receiver
//      ✅[X]: Expose as props, the public sent objs from Sender

//#1.1 Expose many TODO types to src/index.js, I left pending many types to expose! to client.... add them to src/index.js

//#2 Docs Update:
//    [ ]: Source Code Documentation: Improve and document bot EVENTS!! Exon's Feedback! && Improve loggin docs, when creating bot object
//    [ ]: Create documentation page! (with astro?)

/**
 * [ ]: Update to baileys 7.x.x!
 */
