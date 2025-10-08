import { afterEach, beforeEach, describe, expect, mock as fn, it } from "bun:test";
import { skipLongTests } from "../../Envs.js";
import type { IChatContext, ICommand } from "../../index.js";
import Bot from "../bot/bot.js";
import { CommandType } from "../bot/internals/CommandsSearcher.js";
import WhatsSocketMock from "../whats_socket/mocks/WhatsSocket.mock.js";
import OfficialPlugin_OneCommandPerUserAtAtime, { type OfficialPlugin_OneCommandPerUserAtATime_ContextInfo } from "./OneCommandPerUser_Plugin.js";

// A simple command that finishes instantly.
class FastCommand implements ICommand {
  name = "fast";
  async run(ctx: IChatContext): Promise<void> {
    await ctx.SendText("Fast command finished!");
  }
}

// A command that simulates a long-running task by never "finishing".
// We control its completion manually for testing purposes.
class LongCommand implements ICommand {
  name = "long";
  public finishCommand!: () => void;
  private promise!: Promise<void>;

  constructor() {
    this.reset();
  }

  // Allow resetting the promise for each run
  public reset() {
    this.promise = new Promise((resolve) => {
      this.finishCommand = resolve;
    });
  }

  public run = async (ctx: IChatContext): Promise<void> => {
    await ctx.SendText("Long command started...");
    return this.promise;
  };
}

describe("OfficialPlugin_OneCommandPerUserAtATime", () => {
  let bot: Bot;
  let socketMock: WhatsSocketMock;
  const fastCmd = new FastCommand();
  const longCmd = new LongCommand();

  const msgToSend = fn((_ctxInfo: OfficialPlugin_OneCommandPerUserAtATime_ContextInfo, executing: ICommand, newCmd: ICommand) => {
    return `You are already running '${executing.name}'. Cannot start '${newCmd.name}'.`;
  });

  beforeEach(() => {
    socketMock = new WhatsSocketMock();
    bot = new Bot({ ownWhatsSocketImplementation_Internal: socketMock });
    longCmd.reset(); // Reset the long command's state before each test

    bot.Use(
      OfficialPlugin_OneCommandPerUserAtAtime({
        msgToSend,
        timeoutSecondsToForgetThem: 2,
      })
    );

    bot.Commands.Add(fastCmd, CommandType.Normal);
    bot.Commands.Add(longCmd, CommandType.Normal);

    bot.Start();
  });

  afterEach(() => {
    msgToSend.mockClear();
  });

  it("should allow a user to run a command when no other command is active", async () => {
    await socketMock.MockSendMsgAsync({
      key: { remoteJid: "group@g.us", participant: "user1@lid" },
      message: { conversation: "!fast" },
    } as any);

    expect(socketMock.SentMessagesThroughQueue).toHaveLength(1);
    expect(socketMock.SentMessagesThroughQueue[0]?.content).toEqual({ text: "Fast command finished!" });
    expect(msgToSend).not.toHaveBeenCalled();
  });

  it("should BLOCK a user from running a new command while another is active", async () => {
    // 1. Start the long command, but DO NOT await it.
    socketMock.MockSendMsgAsync({
      key: { remoteJid: "group@g.us", participant: "user1@lid" },
      message: { conversation: "!long" },
    } as any);

    // Give the event loop a tick to process the message before we assert
    await new Promise((resolve) => setImmediate(resolve));

    expect(socketMock.SentMessagesThroughQueue[0]?.content).toEqual({ text: "Long command started..." });

    // 2. Attempt to run another command for the SAME user
    await socketMock.MockSendMsgAsync({
      key: { remoteJid: "group@g.us", participant: "user1@lid" },
      message: { conversation: "!fast" },
    } as any);

    expect(socketMock.SentMessagesThroughQueue).toHaveLength(2);
    const blockedMsg = socketMock.SentMessagesThroughQueue[1]?.content as { text: string };
    expect(blockedMsg.text).toContain("You are already running 'long'. Cannot start 'fast'.");

    expect(msgToSend).toHaveBeenCalledTimes(1);
    expect(msgToSend).toHaveBeenCalledWith(expect.anything(), longCmd, fastCmd);

    // Manually finish the command for cleanup
    longCmd.finishCommand();
  });

  it("should allow a user to run a new command AFTER the previous one finishes", async () => {
    // 1. Start the long command (no await)
    socketMock.MockSendMsgAsync({
      key: { remoteJid: "group@g.us", participant: "user1@lid" },
      message: { conversation: "!long" },
    } as any);
    await new Promise((resolve) => setImmediate(resolve));

    // 2. Immediately finish it.
    longCmd.finishCommand();
    await new Promise((resolve) => setImmediate(resolve));

    // 3. Now, run another command.
    await socketMock.MockSendMsgAsync({
      key: { remoteJid: "group@g.us", participant: "user1@lid" },
      message: { conversation: "!fast" },
    } as any);

    expect(socketMock.SentMessagesThroughQueue).toHaveLength(2);
    expect(socketMock.SentMessagesThroughQueue[1]?.content).toEqual({ text: "Fast command finished!" });
    expect(msgToSend).not.toHaveBeenCalled();
  });

  it.skipIf(skipLongTests)("should allow a user to run a command after the lock times out", async () => {
    // 1. Start the long command (no await).
    socketMock.MockSendMsgAsync({
      key: { remoteJid: "group@g.us", participant: "user1@lid" },
      message: { conversation: "!long" },
    } as any);
    await new Promise((resolve) => setImmediate(resolve));

    expect(socketMock.SentMessagesThroughQueue[0]?.content).toEqual({ text: "Long command started..." });

    // 2. Wait for the timeout to expire.
    await new Promise((resolve) => setTimeout(resolve, 2100));

    // 3. Attempt to run another command.
    await socketMock.MockSendMsgAsync({
      key: { remoteJid: "group@g.us", participant: "user1@lid" },
      message: { conversation: "!fast" },
    } as any);

    expect(socketMock.SentMessagesThroughQueue).toHaveLength(2);
    expect(socketMock.SentMessagesThroughQueue[1]?.content).toEqual({ text: "Fast command finished!" });
    expect(msgToSend).not.toHaveBeenCalled();
  });

  it("should allow DIFFERENT users to run commands concurrently", async () => {
    // 1. User1 starts a long command (no await).
    socketMock.MockSendMsgAsync({
      key: { remoteJid: "group@g.us", participant: "user1@lid" },
      message: { conversation: "!long" },
    } as any);
    await new Promise((resolve) => setImmediate(resolve));
    expect(socketMock.SentMessagesThroughQueue[0]?.content).toEqual({ text: "Long command started..." });

    // 2. User2 runs a fast command while user1 is active.
    await socketMock.MockSendMsgAsync({
      key: { remoteJid: "group@g.us", participant: "user2@lid" },
      message: { conversation: "!fast" },
    } as any);

    expect(socketMock.SentMessagesThroughQueue).toHaveLength(2);
    expect(socketMock.SentMessagesThroughQueue[1]?.content).toEqual({ text: "Fast command finished!" });
    expect(msgToSend).not.toHaveBeenCalled();

    // 3. Confirm user1 is still blocked.
    await socketMock.MockSendMsgAsync({
      key: { remoteJid: "group@g.us", participant: "user1@lid" },
      message: { conversation: "!fast" },
    } as any);
    expect(msgToSend).toHaveBeenCalledTimes(1);

    longCmd.finishCommand();
  });

  it("should allow DIFFERENT users to run same command concurrently", async () => {
    // 1. User1 starts a long command (no await).
    socketMock.MockSendMsgAsync({
      key: { remoteJid: "group@g.us", participant: "user1@lid" },
      message: { conversation: "!long" },
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(socketMock.SentMessagesThroughQueue[0]?.content).toEqual({ text: "Long command started..." });

    // 2. User2 runs a long command while user1 is active.
    socketMock.MockSendMsgAsync({
      key: { remoteJid: "group@g.us", participant: "user2@lid" },
      message: { conversation: "!long" },
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(socketMock.SentMessagesThroughQueue[1]?.content).toEqual({ text: "Long command started..." });

    expect(socketMock.SentMessagesThroughQueue).toHaveLength(2);
    // expect(socketMock.SentMessagesThroughQueue[1]?.content).toEqual({ text: "Fast command finished!" });
    expect(msgToSend).not.toHaveBeenCalled();

    // 3. Confirm user1 is still blocked.
    await socketMock.MockSendMsgAsync({
      key: { remoteJid: "group@g.us", participant: "user1@lid" },
      message: { conversation: "!fast" },
    } as any);
    expect(msgToSend).toHaveBeenCalledTimes(1);

    // 3. Confirm user2 is still blocked.
    await socketMock.MockSendMsgAsync({
      key: { remoteJid: "group@g.us", participant: "user2@lid" },
      message: { conversation: "!fast" },
    } as any);
    expect(msgToSend).toHaveBeenCalledTimes(2);

    longCmd.finishCommand();
  });
});
