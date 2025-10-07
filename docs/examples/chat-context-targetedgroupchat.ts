import type { AdditionalAPI, CommandArgs, IChatContext, ICommand } from "../../src/index.js";

class AnnounceInAnotherGroupCommand implements ICommand {
  name: string = "announce";

  public async run(ctx: IChatContext, _api: AdditionalAPI, args: CommandArgs): Promise<void> {
    //!announce Hi this is my announcement => ["Hi", "this", "is", "my", "announcement"] => "Hi this is my announcement"
    const announcement = args.args.join(" ");
    const targetGroupId = "1234567890@g.us"; // ID of the announcements group

    // Create a new context targeted at the announcements group.
    const announcementCtx = ctx.CloneButTargetedToGroupChat({
      groupChatId: targetGroupId,
    });

    // Send the message to the other group.
    await announcementCtx.SendText(`📢 Announcement: ${announcement}`);
    await ctx.SendText("I've posted your message in the announcements group!");
  }
}

new AnnounceInAnotherGroupCommand();
