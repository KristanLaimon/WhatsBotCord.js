import { expect, mock as fn, spyOn, test } from "bun:test";
import { MockGroupTxtMsg } from "../../mocks/MockIndividualGroup.mock.js";
import WhatsSocketMock from "../whats_socket/mocks/WhatsSocket.mock.js";
import Bot, { type WhatsbotcordMiddlewareFunct_OnFoundCommand } from "./bot.js";
import { CommandType } from "./internals/CommandsSearcher.js";
import type { ICommand } from "./internals/ICommand.js";

// A simple mock command for testing purposes.
class MockCommand implements ICommand {
  name = "testcmd";
  // The run method is spied on to see if it gets called.
  async run(): Promise<void> {}
}

/**
 * Internal toolkit for creating a bot instance with a mocked socket.
 */
const toolkit = () => {
  const mockSocket = new WhatsSocketMock();
  const bot = new Bot({
    ownWhatsSocketImplementation_Internal: mockSocket,
    commandPrefix: "!",
  });
  return { socket: mockSocket, bot };
};

test("Middleware_OnCommandFound: When chain completes, should execute command", async () => {
  // 1. Arrange
  const { bot, socket } = toolkit();
  const commandToRun = new MockCommand();
  const commandRunSpy = spyOn(commandToRun, "run");

  const executionOrder: string[] = [];

  // Create mock middleware functions
  const middleware1 = fn<WhatsbotcordMiddlewareFunct_OnFoundCommand>(async (_bot, _sId, __, _cId, _rMsg, _mType, _sType, cmd, next) => {
    expect(cmd.name).toBe(commandToRun.name); // Ensure the correct command is passed
    executionOrder.push("middleware1");
    await next();
  });

  const middleware2 = fn<WhatsbotcordMiddlewareFunct_OnFoundCommand>(async (_bot, _sId, __, _cId, _rMsg, _mType, _sType, cmd, next) => {
    expect(cmd.name).toBe(commandToRun.name);
    executionOrder.push("middleware2");
    await next();
  });

  // Subscribe a spy to the completion event
  const onChainEndSpy = fn((success: boolean) => {
    expect(success).toBe(true);
    executionOrder.push("chain-end");
  });
  bot.Events.onFoundCommandMiddlewareEnd.Subscribe(onChainEndSpy);

  // Register middleware and command
  bot.Use_OnCommandFound(middleware1);
  bot.Use_OnCommandFound(middleware2);
  bot.Commands.Add(commandToRun, CommandType.Normal);
  await bot.Start();

  // 2. Act
  // Trigger the bot by simulating an incoming command message
  await socket.MockSendMsgAsync(MockGroupTxtMsg, {
    replaceTextWith: `!${commandToRun.name}`,
  });

  // 3. Assert
  // All middlewares should have been called
  expect(middleware1).toHaveBeenCalledTimes(1);
  expect(middleware2).toHaveBeenCalledTimes(1);

  // The completion event should have fired with `true`
  expect(onChainEndSpy).toHaveBeenCalledTimes(1);

  // The command's run method should have been executed
  expect(commandRunSpy).toHaveBeenCalledTimes(1);

  // Verify the execution order
  expect(executionOrder).toEqual(["middleware1", "middleware2", "chain-end"]);
});

test("Middleware_OnCommandFound: When chain is broken, should NOT execute command", async () => {
  // 1. Arrange
  const { bot, socket } = toolkit();
  const commandToRun = new MockCommand();
  const commandRunSpy = spyOn(commandToRun, "run");

  const executionOrder: string[] = [];

  const middleware1 = fn<WhatsbotcordMiddlewareFunct_OnFoundCommand>(async (_bot, _sId, _PN, _cId, _rMsg, _mType, _sType, _cmd, next) => {
    executionOrder.push("middleware1");
    await next();
  });

  // This middleware will break the chain by not calling next()
  const breakingMiddleware = fn<WhatsbotcordMiddlewareFunct_OnFoundCommand>((_bot, _sId, _PN, _cId, _rMsg, _mType, _sType, _cmd, _next) => {
    executionOrder.push("breaking-middleware");
    // No call to next() here
  });

  const middleware3 = fn<WhatsbotcordMiddlewareFunct_OnFoundCommand>(async (_bot, _sId, _PN, _cId, _rMsg, _mType, _sType, _cmd, next) => {
    executionOrder.push("middleware3"); // This should never be reached
    await next();
  });

  // Subscribe a spy to the completion event
  const onChainEndSpy = fn((success: boolean) => {
    expect(success).toBe(false); // Expect the chain to fail
    executionOrder.push("chain-end");
  });
  bot.Events.onFoundCommandMiddlewareEnd.Subscribe(onChainEndSpy);

  // Register middleware and command
  bot.Use_OnCommandFound(middleware1);
  bot.Use_OnCommandFound(breakingMiddleware);
  bot.Use_OnCommandFound(middleware3); // This will not run
  bot.Commands.Add(commandToRun, CommandType.Normal);
  await bot.Start();

  // 2. Act
  await socket.MockSendMsgAsync(MockGroupTxtMsg, {
    replaceTextWith: `!${commandToRun.name}`,
  });

  // 3. Assert
  // Only middleware up to the breaking point should be called
  expect(middleware1).toHaveBeenCalledTimes(1);
  expect(breakingMiddleware).toHaveBeenCalledTimes(1);
  expect(middleware3).not.toHaveBeenCalled();

  // The completion event should have fired with `false`
  expect(onChainEndSpy).toHaveBeenCalledTimes(1);

  // The command's run method should NOT have been executed
  expect(commandRunSpy).not.toHaveBeenCalled();

  // Verify the partial execution order
  expect(executionOrder).toEqual(["middleware1", "breaking-middleware", "chain-end"]);
});
