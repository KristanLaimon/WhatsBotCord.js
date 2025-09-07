//============= Testing file simulating user consumption ====================
//TODO: Add event when entering into a new group.
import fs from "fs";
import Whatsbotcord, {
  CommandType,
  DebuggingHelpers,
  MsgHelpers,
  MsgType,
  SenderType,
  type ChatContext,
  type CommandArgs,
  type IBotCommand,
  type RawMsgAPI,
} from "src";

class PingCommand implements IBotCommand {
  name: string = "ping";
  description: string = "replies with pong!";
  aliases: string[] = ["p"];
  async run(ctx: ChatContext, _: RawMsgAPI, __: CommandArgs): Promise<void> {
    // ============= ESTE ====================
    // Qué te devuelve un buffer (de data), null if user didn't respond in 5 seconds timeout
    const buffer: Buffer | null = await ctx.WaitMultimedia(MsgType.Video, { timeoutSeconds: 5 });
    if (buffer) {
      fs.writeFileSync("mysticker.webp", buffer);
    }
    //=========  Ó prefieres ==============
    //@ts-expect-error not implemented yet, will be "false" if user
    // didn't respond in 5 seconds timeout, it stores the sticker file directly in you files system
    const success: boolean = await ctx.WaitMultimedia("./stickername", { timeoutSeconds: 5 });
  }
}

class EveryoneTag implements IBotCommand {
  name: string = "everyone";
  aliases?: string[] | undefined = ["all", "a"];
  description: string = "Tag everyone in group";
  async run(_ctx: ChatContext, _rawMsgApi: RawMsgAPI, args: CommandArgs): Promise<void> {
    if (args.senderType === SenderType.Individual) return;
    //TODO: There's no way to retrieve people from group omg
    //Comes from group, we know that!
    //Expected API!
    //@ts-expect-error example of how api should be GroupInfo doesn't exist yet!
    const allMembers = _ctx.GroupInfo!.Participants;
  }
}
// ========================== MAIN ==============================
const bot = new Whatsbotcord({ commandPrefix: "!", credentialsFolder: "./auth", loggerMode: "silent" });
bot.Commands.Add(new PingCommand(), CommandType.Normal);
bot.Commands.Add(new EveryoneTag(), CommandType.Tag);
bot.Use(async (_senderId, chatId, rawMsg, msgType, _senderType, next) => {
  if (msgType === MsgType.Text) {
    const txt: string | null = MsgHelpers.FullMsg_GetText(rawMsg);
    if (txt && txt?.length > 1000) {
      bot.SendMsg.Text(chatId, "To muuch text!!!");
      return;
    }
  }
  next();
});
bot.Use(async (_senderId, _chatId, rawMsg, _msgType, _senderType, next) => {
  DebuggingHelpers.StoreMsgInHistoryJson("./debug.json", rawMsg);
  next();
});
bot.Events.onStartupAllGroupsIn.Subscribe((groups) => {
  console.log("Groups: " + groups.map((group) => JSON.stringify(group)));
});
bot.Start();

//TODO: Testing
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
 * 6. Check all TODO's around the project
 * 7. WhatsSocket.test.ts  ✅~ (Depends too much on baileys lib)   => Test all on* events (4/7 already done!);
 */

// TODO : Features
// [ ] GROUP UTILITES (ICommand, Bot): Give group utilites (fetch all members for example) => Bot should expose GetGroupMetadata and group handling and ChatContext should provide facilities for group info (and group handling?)
// [ ] CHATCONTEXT:  must have a WaitMsg_# (per message type) dedicated.
// [ ] GENERAL: Document Update => Should be capable to RECEIVE and SEND documents!
//        [ ]: Send documents
//              [ ]: Test..
//        [ ]: Receive documents
//              [ ]: Test..
//      @Note: So far, it can recognize and get documents, but not sending (not tested at all) ❌
// [ ]: WhatsSocket.SugarSender: Test MIME types being inferred correctly from WhatsSocket.SugarSender (TESTS) on all MULTIMEDIA SENDING!
// [ ]: WhatsSocket.Start : If internal baileys socket crashes at first run, should reset itself, or console.log user should reset the program. => Document common error cases. When running the same bot twice but in second time doens't work. (Maybe you have an already running instance of this same socket with same credentials)
