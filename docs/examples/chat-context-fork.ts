import type { GroupMetadataInfo } from "../../src/core/whats_socket/internals/WhatsSocket.receiver.js";
import type { AdditionalAPI, CommandArgs, IChatContext, ICommand, WhatsappMessage } from "../../src/index.js";

//Whatsapp Chat:
/**
 * (From a group chat called "MyGroup")
 * User:  !answerinprivate
 *
 *        |
 *        v
 */

//Case 1: This command is being run in group chat
class MyCommand implements ICommand {
  name: string = "answerinprivate";
  public async run(ctx: IChatContext, api: AdditionalAPI, args: CommandArgs): Promise<void> {
    console.log(ctx.FixedSenderType); // SenderType.Group
    //Here chat context is attached to 'MyGroup' context, so all messages goes there and strongly attached to "!mycommand" original msg
    //who triggered it

    const groupInfo: GroupMetadataInfo | null = await ctx.FetchGroupData();
    //If defined, means this command is being run inside a group chat.
    // You can check it as well with args.senderType enum! (e.g SenderType.Group or SenderType.Individual)
    if (groupInfo) {
      ctx.SendText(`Hi to ${groupInfo.groupName}`); // Bot: Hi to 'MyGroup'
    }

    //If you need to change the context to another chat. You can do the following:
    const privateMsgToSender: WhatsappMessage | null = await api.InternalSocket.Send.Text(args.participantIdPN!, "Hi!, im sending you a private msg");
    //If whatsapp is working correctly, this should never be 'null' 🤫.

    //This will recognize the msg, and automatically set the context to: Individual Chat, SenderID
    //with all the same methods you already know from ctx! like ctx.SendText(), ctx.SendImage(), etc
    const ctxToUserPrivateChat = ctx.CloneButTargetedTo({ initialMsg: privateMsgToSender! });
    console.log(ctxToUserPrivateChat.FixedChatId); // SenderType.Individual
    await ctxToUserPrivateChat.SendText("Hi! again, this is not from group any more. We can talk privately 🤫");
    // now you can use ctxToUserPrivateChat.SendImg() and all other familiar methods!
  }
}

new MyCommand();
