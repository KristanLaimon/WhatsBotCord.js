<div align="center">
  <img src="https://raw.githubusercontent.com/KristanLaimon/WhatsBotCord.js/refs/heads/main/.github/media/whatsbotcord_logo.png" width="20%"/>
</div>
<h1 align="center"> Whatsbotcord.js </h1>

**_WhatsBotCord_** is a lightweight, TypeScript-based library for building WhatsApp bots with a Discord-inspired command system (e.g., **_!hello_**). Built as a wrapper around Baileys, it abstracts complex Baileys internals, providing an intuitive, type-safe interface for managing WhatsApp groups and individual chats. Compatible with Bun.js (recommended) and Node.js, it’s designed for developers to create custom bots with ease.

> Note: WhatsBotCord its on very early beta, not full usable yet, soon will be ready for use.

# Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Testing/Mocking](#whatsbotcordjs-mocking--testing)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [Notes](#notes)

## Features

- **_Discord-Inspired Command System_**: Create commands (e.g., !hello) with a simple, familiar syntax inspired by Discord bots.
- **_TypeScript Support_**8: Fully typed with TypeScript for robust development and autocompletion.
- \***_Simplified Baileys Wrapper_**: Abstracts complex Baileys internals, making it easy to manage groups, individual senders, and message handling.
- **\*Group and Individual Messaging\*\***: Seamlessly interact with WhatsApp groups and individual chats.
- _\*\*Extensible Architecture_: Modular design for adding custom commands and functionality.
- **_Lightweight and Performant_**: Optimized for speed and efficiency if using Bun.js (optional).

## Installation

```shell
npm install whatsbotcord
```

or

```shell
bun i whatsbotcord
```

- **_WhatsApp Account_**: You NEED an active WhatsApp account on a mobile device to scan a QR code for Web Device Login (not an official WhatsApp Business API).
  > Warning: WhatsBotCord uses WhatsApp Web Device Login, which is not an official WhatsApp bot API. Excessive usage or spamming may result in a WhatsApp ban.

## Getting started

Import the library and you can use this minimal code to get started with your first command:

```js
// bot.ts
import Whatsbotcord, { type ChatContext, type CommandArgs, type ICommand, type RawMsgAPI, CommandType, MsgType } from "whatsbotcord";

// ========================== MAIN ==============================
const bot = new Whatsbotcord({
  commandPrefix: "!",
  tagCharPrefix: "@",
  credentialsFolder: "./auth",
  loggerMode: "recommended",
});
bot.Commands.Add(
  {
    name: "ping",
    description: "A ping pong command.",
    async run(chat, api, commandArgs) {
      await chat.SendText("pong!");
    },
  },
  CommandType.Normal
);
bot.Start();
```

## More advanced usage

The last example is the easiest way to start but if you want to know how to use it with more options or how
the common worflow is when working with command check the following code.

Here it's creating a simple command that accepts an img, validates its sent from the user and send it back if
is valid.

```js
// bot.ts
import Whatsbotcord, { type ChatContext, type CommandArgs, type ICommand, type RawMsgAPI, CommandType, MsgType } from "whatsbotcord";

// ================== Ping.ts ======================
// A command can be created with a class implementing ICommand
class PingCommand implements ICommand {
  name: string = "ping";
  description: string = "replies with pong!";
  aliases: string[] = ["p"];
  async run(chat: ChatContext, api: RawMsgAPI, commandArgs: CommandArgs): Promise<void> {
    await chat.SendText("Pong!");
  }
}
export default PingCommand;

// ========================== MAIN ==============================
import PingCommand from "./PingComand";
const bot = new Whatsbotcord({
  //Can accept an array of prefixes or only one "!" prefix
  commandPrefix: ["$", "!", "/"],
  tagCharPrefix: ["@"],
  credentialsFolder: "./auth",
  loggerMode: "recommended",
});
//1. You can add commands by just instatiating them or...
bot.Commands.Add(new PingCommand(), CommandType.Normal);
//2. By declaring them directly on Add method (Example of how a command workd)
bot.Commands.Add(
  {
    name: "forwardmsg",
    description: "A simple description for my forwardmsg",
    aliases: ["f"], //You can use !forwardmsg or !f, they are the same!
    async run(chat, api, commandArgs) {
      /**
       * If user uses !forwardmsg argument1 argument2 @someone, this will be ["argument1", "argument2", "@someone]
       * otherwise, will be a [] (empty array) if no args provided
       */
      const arguments: string[] = commandArgs.args;
      await chat.Loading(); ///Sends an ⌛ reaction emoji to original msg that triggered this command
      await chat.SendText("Send me a image:");
      j;
      const imgReceived = await chat.WaitMultimedia(MsgType.Image, { timeoutSeconds: 60, wrongTypeFeedbackMsg: "Hey, send me an img, try again!" });
      //If user has sent the expected msg of type img, this will be a buffer
      if (imgReceived) {
        await chat.SendText("I've received your img, Im going to send it back");
        /* -> */ await chat.SendImgFromBufferWithCaption(imgReceived, ".png", "Im a caption");
        //OR
        /* -> */ await chat.SendImgFromBuffer(imgReceived, ".png");
        await chat.Ok(); //Sends a ✅ reaction emoji to original msg
        //Otherwise, its null
      } else {
        await chat.SendText("I didn't get your msg... End of command");
        await chat.Fail(); //Sends a ❌ reaction emoji to original msg
      }
    },
  },
  CommandType.Normal
);
bot.Start();
```

## Usage with group data and tags

If your command is being called/executed from a group, you can use FetchGroupData() from context object to fetch all info
and send it.
Its kinda tricky how @mentions works, you need to pass the ID of the user formatted in the raw txt msg and send
his ID as an array along the options of SendText.

Steps:

- Lets say we have a user with ID: 234234234234@lid
- You need to convert it into: @234234234234, and send it, but its plain text so far.
- To convert it into a mention, you need to pass in the obj params {mentionIds: ["234234234234@lid"]}

So you would send:

```js
await ctx.SendText("@234234234234", /** Params */ { mentionIds: ["234234234234@lid"] });
```

Yes, that means it _has to be in the same order_, first @234234234234 with index 0 of mentionsIds and so on if
you want to mention many people at once.

There are helpers in this library to convert easily even from a whatsapp msg to fetch its id formatted and ID,
you can use WhatsappHelpers (import it from whatsbordcord lib) to do it easily.

Note: If you use this fetchgroup method when this command is being called from private chat, it will return null;

Heres a real world example of how to recreate the famous "@everyone" command from discord.

```js
import Bot, { type ChatContext, type CommandArgs, type ICommand, type RawMsgAPI, CommandType } from "whatsbotcord";

// =============== EveryoneTag.ts ================
class EveryoneTag implements ICommand {
  name: string = "e";
  description: string = "replies with pong!";
  aliases: string[] = ["test"];
  async run(chat: ChatContext, _: RawMsgAPI, __: CommandArgs): Promise<void> {
    const res = await chat.FetchGroupData();
    if (res) {
      /**
       *  In this case is easy, res comes with res.members which is an array of all members with their
       *  respective @23423423 formatted mention and ID 234234234@lid ready to send. This is abstracted
       *  thanks to this library!
      */
      const mentions = res.members.map((m) => m.asMentionFormatted!);
      const ids = res.members.map((m) => m.rawId!);
      await chat.SendText(mentions.join(" "), { mentionsIds: ids });
    }
  }
}


// ========================== MAIN ==============================
const bot = new Bot({
  commandPrefix: ["$", "!", "/"],
  tagCharPrefix: ["@"],
  credentialsFolder: "./auth",
  loggerMode: "recommended",
});
bot.Commands.Add(new EveryoneTag(), CommandType.Tag);
bot.Start();
```

Then in chat you can easily use @everyone and bot will mention everyone, like discord!

# WhatsBotCord.js Mocking & Testing

You can simulate a full WhatsApp command interaction locally, without touching your real bot or changing any command code. This is perfect for testing, learning, or automating responses.

To do so, import from this library "WhatsChatMock" object, and you can use it as following:

## Getting Started with WhatsChatMock

_WhatsChatMock_ lets you mock a chat environment so your command behaves as if it’s running live.

## Simplest usage

```js
// Test framework agnostic example using WhatsChatMock
import { it } from "your-testing-framework-of-choice";
import type { CommandArgs, IChatContext, ICommand, RawMsgAPI } from "whatsbotcord";
import { WhatsChatMock } from "whatsbotcord";

it("retrieves user input correctly", async () => {
  class Com implements ICommand {
    name = "mynamecommand";

    async run(ctx: IChatContext, _rawMsgApi: RawMsgAPI, _args: CommandArgs): Promise<void> {
      await ctx.SendText("Hello User");
      await ctx.SendText("What's your name?");

      // Wait for user input
      const userName = await ctx.WaitText({ cancelKeywords: ["hello", "world"] }); //Returns: "chris"
      await ctx.SendText("Hello " + userName);
    }
  }

  // Create a mock chat for the command
  const chat = new WhatsChatMock(new Com());

  // Simulate user sending "chris"
  chat.EnqueueIncomingText("chris");

  // Start the simulation
  await chat.StartChatSimulation();

  // Inspect results
  console.log(chat.SentFromCommand.Texts); // [{text:"Hello User"}, {text: "What's your name?"}, {text:"Hello chris"}]
  console.log(chat.WaitedFromCommand); // [{cancelKeywords:["hello","world"]}]
});
```

> Notes:

- EnqueueIncomingText() simulates user messages.
- WaitText() can optionally take cancelKeywords or timeout parameters.

## Advanced example

This example demonstrates full configuration and more complex interactions.

```js
// Test framework agnostic example using WhatsChatMock
import { describe, it } from "your-testing-framework-of-choice";
import type { CommandArgs, IChatContext, ICommand, RawMsgAPI, WhatsappMessage } from "whatsbotcord";
import { MsgHelpers, MsgType, SenderType, WhatsChatMock } from "whatsbotcord";

// Example command implementation
class MyCommand implements ICommand {
  name = "command";

  async run(ctx: IChatContext, _rawMsgApi: RawMsgAPI, args: CommandArgs): Promise<void> {
    console.log("Args:", args.args); // ["argument1", "argument2"]
    console.log("Chat ID:", ctx.FixedChatId); // "myCustomChatId!@g.us"
    console.log("Participant ID:", ctx.FixedParticipantId); // "myCustomParticipantId!@whatsapp.es"

    // Ask for user's name
    await ctx.SendText("What's your name?");
    const name = await ctx.WaitText({ timeoutSeconds: 3 });

    if (name) await ctx.SendText(`Hello ${name}. Nice to meet you`);
    else await ctx.SendText("You didn't respond in 3 seconds..");

    // Ask for favorite programming language
    await ctx.SendText("What's your favorite programming language?");
    const response: WhatsappMessage | null = await ctx.WaitMsg(MsgType.Text);

    if (response) {
      const language = MsgHelpers.FullMsg_GetText(response);
      if (language) await ctx.SendText(`Oh, your favorite language is: ${language}`);
    } else {
      await ctx.SendText("You didn't respond in 3 seconds.");
    }
  }
}

// Test suite
describe("WhatsChatMock Example", () => {
  it("Simulates user interaction with MyCommand", async () => {
    const chat = new WhatsChatMock(new MyCommand(), {
      args: ["argument1", "argument2"],
      botSettings: { commandPrefix: "!" },
      cancelKeywords: ["cancel"],
      chatContextConfig: { timeoutSeconds: 3 },
      chatId: "myCustomChatId!@g.us",
      participantId: "myCustomParticipantId!@whatsapp.es",
      msgType: MsgType.Text,
      senderType: SenderType.Individual,
    });

    // Simulate user responses
    chat.EnqueueIncomingText("chris"); // Response to name question
    chat.EnqueueIncomingText("typescript"); // Response to favorite language question

    await chat.StartChatSimulation();

    console.log("Messages sent by command:", chat.SentFromCommand.Texts);
    console.log("Messages command waited for:", chat.WaitedFromCommand);
  });
});
```

Advanced Notes:

- SentFromCommand: All messages your command sent. Useful for assertions.
- WaitedFromCommand: Logs every WaitText/WaitMsg call.
- chatId / participantId allow custom IDs to simulate groups or individual chats.
- Default timeout for Wait\*() is 3 seconds, can be overridden per command.

# Documentation

Of course, chat or context object provided in commands has a lot more methods availables to send:

- Images
- Videos
- Documents
- Polls
- Ubication (Gps)
- and more
  Which are already documented in code, but im planning to create a small wiki or documentation page dedicated in the
  future for this proyect (Until this proyect reaches 1.0.0 version, will be available). This proyect is still under
  development.

> Scan the QR code displayed in the terminal using your WhatsApp mobile app!

# Report Bugs:

Open a GitHub issue on the Issues page with a detailed description of the bug.
Include steps to reproduce, expected behavior, and actual behavior.

# Contributing

All contributions are welcomed!. You need to take into account the following:

## Setting Up Development Environment:

- Ensure Bun.js 1.2.20 or greater is installed (required for tests).
- Bun.js is used as testing framework

To run all tests but skipping those long time consuming tests

```shell
bun fastest
```

To run all of them

```shell
bun fulltest
```

# Submit a Pull Request:

Create a branch for your changes: git checkout -b feature/your-feature.
Commit changes with clear messages.
Push to your fork and submit a pull request to the main repository.

# License

This project is licensed under the MIT License. See the LICENSE file for details.
