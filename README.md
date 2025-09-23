<div align="center">
  <img src="https://raw.githubusercontent.com/KristanLaimon/WhatsBotCord.js/refs/heads/main/.github/media/whatsbotcord_logo.png" width="30%"/>
</div>
<h1 align="center"> Whatsbotcord.js </h1>

**_WhatsBotCord_** is a lightweight, TypeScript-based library for building WhatsApp bots with a Discord-inspired command system (e.g., **!yourcommand**, **@everyone**, and _more_). Built as a wrapper around Baileys.js, it abstracts complex Baileys.js internals, providing an intuitive, type-safe interface for managing WhatsApp groups and individual chats. Designed from developers to developers to create custom bots with ease.

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

- **Discord-Inspired Command System**: Create commands (e.g., !hello) with a simple, familiar syntax inspired by Discord bots.
- **TypeScript Support**: Fully typed with TypeScript for robust development and autocompletion.
- **Simplified Baileys Wrapper**: Abstracts complex Baileys internals, making it easy to manage groups, individual senders, and message handling.
- **Group and Individual Messaging**: Seamlessly interact with WhatsApp groups and individual chats.
- **Extensible Architecture**: Modular design for adding custom commands and functionality.
- **Lightweight and Performant**: Optimized for speed and efficiency if using Bun.js (optional).

## Installation

```shell
npm install whatsbotcord
```

or

```shell
bun i whatsbotcord
```

- **_WhatsApp Account_**: You NEED an active WhatsApp account on a mobile device to scan a QR code for Web Device Login (not an official WhatsApp Business API).

## Getting started

Import the library and you can use this minimal code to get started with your first command:

### Javascript

```js
import Whatsbotcord, { CommandType } from "whatsbotcord";

const bot = new Whatsbotcord({
  commandPrefix: "!",
  tagCharPrefix: "@",
  credentialsFolder: "./auth",
  loggerMode: "recommended",
});
bot.Commands.Add(
  {
    name: "ping",
    async run(chat, api, commandArgs) {
      await chat.SendText("pong!");
    },
  },
  CommandType.Normal
);
bot.Start();
```

### Typescript

```ts
import Whatsbotcord, { type AdditionalAPI, type CommandArgs, type IChatContext, CommandType } from "whatsbotcord";

const bot = new Whatsbotcord({
  commandPrefix: "!",
  tagCharPrefix: "@",
  credentialsFolder: "./auth",
  loggerMode: "recommended",
});
bot.Commands.Add(
  {
    name: "ping",
    async run(chat: IChatContext, _api: AdditionalAPI, _commandArgs: CommandArgs): Promise<void> {
      await chat.SendText("pong!");
    },
  },
  CommandType.Normal
);
bot.Start();
```

## More advanced usage

The last example is the easiest way to start, but commonly you will be using
the following worflow when working with them. It shows a little more advance usage and
a basic showcase what this library has to offer.

Here it's creating a simple command that accepts an img, validates its sent from the user, and send it back if
it is valid.

### Javascript

```js
import Whatsbotcord, { CommandType, CreateCommand, MsgType } from "whatsbotcord";

// ================== Ping.js ======================
const pingCommand = CreateCommand(
  "ping",
  async (ctx, api, args) => {
    await ctx.SendText("Pong!");
  },
  { aliases: "p" }
);
export default pingCommand;

// ========================== MAIN ==============================
//import pingCommand from "./Ping.js";
const bot = new Whatsbotcord({
  //Can accept an array of prefixes or only one "!" prefix
  commandPrefix: ["$", "!", "/"],
  tagCharPrefix: ["@"],
  credentialsFolder: "./auth",
  loggerMode: "recommended",
});
//1. You can add commands by just instatiating them or...
bot.Commands.Add(pingCommand, CommandType.Normal);
//2. By declaring them directly on 'Add' method
bot.Commands.Add(
  {
    name: "forwardmsg",
    description: "A simple description for my forwardmsg",
    aliases: ["f"], //You can use !forwardmsg or !f in chat, they are the same!
    async run(chat, api, args) {
      /**
       * If user uses !forwardmsg argument1 argument2 @someone, this will be ["argument1", "argument2", "@someone]
       * otherwise, will be a [] (empty array) if no args provided
       */
      const commandArgs = args.args;
      await chat.Loading(); ///Sends an ⌛ reaction emoji to original msg that triggered this command
      await chat.SendText("Send me a image:");
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

### Typescript

```ts
import Whatsbotcord, { type AdditionalAPI, type ChatContext, type CommandArgs, type IChatContext, type ICommand, CommandType, MsgType } from "whatsbotcord";

// ================== Ping.ts ======================
// A command can be created with a class implementing ICommand
class PingCommand implements ICommand {
  name: string = "ping";
  description: string = "replies with pong!";
  aliases: string[] = ["p"];
  async run(chat: ChatContext, _api: AdditionalAPI, _commandArgs: CommandArgs): Promise<void> {
    await chat.SendText("Pong!");
  }
}
export default PingCommand;

// ========================== MAIN ==============================
const bot = new Whatsbotcord({
  //Can accept an array of prefixes or only one "!" prefix
  commandPrefix: ["$", "!", "/"],
  tagCharPrefix: ["@"],
  credentialsFolder: "./auth",
  loggerMode: "recommended",
});
//1. You can add commands by just instatiating them or...
bot.Commands.Add(new PingCommand(), CommandType.Normal);
//2. By declaring them directly on Add method
bot.Commands.Add(
  {
    name: "forwardmsg",
    aliases: ["f"], //You can use !forwardmsg or !f, they are the same!
    async run(chat: IChatContext, _api: AdditionalAPI, _args: CommandArgs) {
      /**
       * If user uses !forwardmsg argument1 argument2 @someone, this will be ["argument1", "argument2", "@someone]
       * otherwise, will be a [] (empty array) if no args provided
       */
      // const commandArgs: string[] = args.args;
      await chat.Loading(); ///Sends an ⌛ reaction emoji to original msg that triggered this command
      await chat.SendText("Send me a image:");
      const imgReceived = await chat.WaitMultimedia(MsgType.Image, {
        timeoutSeconds: 60,
        wrongTypeFeedbackMsg: "Hey, send me an img, try again!",
        cancelKeywords: ["cancelcustomword"],
      });
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

# Cancelling long commands

If you have long worflows commands, user can cancel them using specific
**cancel words**, by default are "cancel" (english) and "cancelar" (spanish).

Let's say you are using the last example !forwardmsg. Bot is expecting from you to send him a
image msg, but if you want to cancel it (don't want to send it anymore), just send to bot
'cancel' and command will immediately abort.

## **Global Config**

You can configure what words to use as _cancel words_ from Bot constructor config.

```js
const bot = new WhatsbotCord({
  commandPrefix: ["$", "!", "/", "."],
  credentialsFolder: "./auth",
  loggerMode: "recommended",
  delayMilisecondsBetweenMsgs: 1,
  cancelKeywords: ["my", "cancel", "words"], //Here
});
// ... more code
```

## **Local Config**

You can override temporaly just for a "Wait\*()" method which _cancel words_ to use.

```js
const imgReceived = await chat.WaitMultimedia(MsgType.Image, {
  timeoutSeconds: 60,
  wrongTypeFeedbackMsg: "Hey, send me an img, try again!",
  cancelKeywords: ["cancelcustomword"],
});
```

Here, this method will use only \["cancelcustomword"].
But if you use another WaitMultimedia(...) or WaitMsg(...) method, it'll fallback to global config from bot, in
this case will be: ["my", "cancel", "words"]

## Plugins

Of course, you can use plugins to improve dinamically your bot,
either imported from other libraries or official ones.

### One user per command - Plugin \[Official]

Normally, if you use **_!yourcommand_** and its a long process command,
users can send again **_!yourcommand_** (or any other) in chat while the first one
is executing, leading to unexpected behavior.

Of course,
maybe your use case doesn't need it. But, if you need to validate
this, you can use the following pluggin developed officially
from this library.

#### Javascript And Typescript

```js
import WhatsbotCord, { OfficialPlugin_OneCommandPerUserAtATime } from "whatsbotcord";

const bot = new WhatsbotCord({
  /** bot config */
});
/** your commands here with bot.Commands.Add(...) */
bot.Use(
  OfficialPlugin_OneCommandPerUserAtATime({
    msgToSend: (info, lastCommand, actualCommand) => {
      return `
      You can't use !${actualCommand.name}. Wait until finish that last command ${lastCommand.name}`;
    },
    timeoutSecondsToForgetThem: 60 * 5,
  })
);
```

## Usage with group data and tags

You can use commands and make them usable as **_Tags_**, which are called with '@' by default. You can change this
in _tagCharPrefix_ property option when creating your Bot option.

Here this command recreates the famous @everyone command from Discord!

## Javascript

```js
import Bot, { CommandType, CreateCommand } from "whatsbotcord";

const everyoneTag = CreateCommand(
  //Will be used as @everyone
  "everyone",
  async (chat, api, args) => {
    const res = await chat.FetchGroupData();
    if (res) {
      /**
       *  In this case is easy, res comes with res.members which is an array of all members with their
       *  respective ID ready to quote them in msg and send. This is abstracted
       *  thanks to this library!
       */
      const mentions = res.members.map((m) => m.asMentionFormatted);
      const ids = res.members.map((m) => m.rawId);
      await chat.SendText(mentions.join(" "), { mentionsIds: ids });
    }
  },
  //So it can be used like @e
  { aliases: "e" }
);

// ========================== MAIN ==============================
const bot = new Bot({
  commandPrefix: ["$", "!", "/"],
  tagCharPrefix: ["@"],
  credentialsFolder: "./auth",
  loggerMode: "recommended",
});
/** Important, must be with CommandType.Tag prop to work */
bot.Commands.Add(everyoneTag, CommandType.Tag);
bot.Start();

/**
 * Now on whatsapp when someone sends a msg txt "@everyone" or "@e" the
 * command will be executed. (Of course, the bot must be part of that group
 * in first place to even be able to respond)
 */
```

## Typescript

```ts
import type { AdditionalAPI, ChatContext, CommandArgs, ICommand } from "whatsbotcord";
import Bot, { CommandType } from "whatsbotcord";

class EveryoneTag implements ICommand {
  name: string = "e";
  aliases: string[] = ["test"];
  async run(chat: ChatContext, _api: AdditionalAPI, _args: CommandArgs): Promise<void> {
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

/**
 * Now on whatsapp when someone sends a msg txt "@everyone" or "@e" the
 * command will be executed. (Of course, the bot must be part of that group
 * in first place to even be able to respond)
 */
```

# WhatsBotCord.js Mocking & Testing

You can simulate a full WhatsApp command interaction locally, without ever touching your real bot obj or changing any command code!
Perfect for testing and automating responses from your commands.
To do so, import from this library **_ChatMock_** object which lets you mock a whatsapp chat environment so your command
behaves as if it's running live.

## Simplest usage

### Javascript

```js
import { it } from "your-testing-framework-of-choice";
import { ChatMock, CreateCommand } from "whatsbotcord";

const myCommand = CreateCommand(
  /** Command name */
  "mynamecommand",
  /** Code to run when called */
  async (ctx, api, args) => {
    await ctx.SendText("Hello User");
    await ctx.SendText("What's your name?");

    // Wait for user input
    const userName = await ctx.WaitText({ cancelKeywords: ["hello", "world"] }); //Returns: "chris"
    await ctx.SendText("Hello " + userName);
  },
  /** Aditional config (no alias) */
  { aliases: [] }
);

it("retrieves user input correctly", async () => {
  // Create a mock chat for the command
  const chat = new ChatMock(myCommand);

  // Simulate user sending "chris"
  chat.EnqueueIncomingText("chris");

  // Start the simulation
  await chat.StartChatSimulation();

  // Inspect results
  console.log(chat.SentFromCommand.Texts); // [{text:"Hello User"}, {text: "What's your name?"}, {text:"Hello chris"}]
  console.log(chat.WaitedFromCommand); // [{cancelKeywords:["hello","world"]}]
});
```

### Typescript

```ts
import { it } from "your-testing-framework-of-choice";
import type { AdditionalAPI, CommandArgs, IChatContext, ICommand } from "whatsbotcord";
import { ChatMock } from "whatsbotcord";

class Com implements ICommand {
  name = "mynamecommand";

  async run(ctx: IChatContext, _rawMsgApi: AdditionalAPI, _args: CommandArgs): Promise<void> {
    await ctx.SendText("Hello User");
    await ctx.SendText("What's your name?");

    // Wait for user input
    const userName = await ctx.WaitText({ cancelKeywords: ["hello", "world"] }); //Returns: "chris"
    await ctx.SendText("Hello " + userName);
  }
}

it("retrieves user input correctly", async () => {
  // Create a mock chat for the command
  const chat = new ChatMock(new Com());

  // Simulate user sending "chris"
  chat.EnqueueIncomingText("chris");

  // Start the simulation
  await chat.StartChatSimulation();

  // Inspect results
  console.log(chat.SentFromCommand.Texts); // [{text:"Hello User"}, {text: "What's your name?"}, {text:"Hello chris"}]
  console.log(chat.WaitedFromCommand); // [{cancelKeywords:["hello","world"]}]
});
```

## Advanced example

This example demonstrates full configuration and more complex interactions when mocking.

### Javascript

```js
import { describe, it } from "your-testing-framework-of-choice";
import { ChatMock, CreateCommand, MsgHelpers, MsgType, SenderType } from "whatsbotcord";

// For Javascript uses who need to create a command with intelissense help!
const myCommand = CreateCommand(
  /** Command Name */
  "command",
  /** run() command */
  async (ctx, api, args) => {
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
    const response = await ctx.WaitMsg(MsgType.Text);

    if (response) {
      const language = MsgHelpers.FullMsg_GetText(response);
      if (language) await ctx.SendText(`Oh, your favorite language is: ${language}`);
    } else {
      await ctx.SendText("You didn't respond in 3 seconds.");
    }
  },
  /** Optional params */
  {
    aliases: ["com"],
  }
);

// Test suite
describe("WhatsChatMock Example", () => {
  it("Simulates user interaction with MyCommand", async () => {
    const chat = new ChatMock(myCommand, {
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

### Typescript

```ts
import { describe, it } from "your-testing-framework-of-choice";
import type { AdditionalAPI, CommandArgs, IChatContext, ICommand, WhatsappMessage } from "whatsbotcord";
import { ChatMock, MsgHelpers, MsgType, SenderType } from "whatsbotcord";

// Example command implementation
class MyCommand implements ICommand {
  name = "command";

  async run(ctx: IChatContext, _rawMsgApi: AdditionalAPI, args: CommandArgs): Promise<void> {
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
    const chat = new ChatMock(new MyCommand(), {
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

## Mocking Context Behaviour

WhatsApp handles different conversation types: private chats, group chats, communities, and more.
When writing tests, you may want to mock these contexts to simulate how your commands behave.

To avoid confusion, in this documentation we’ll use:

- **_Individual Chat_** → a private one-to-one chat with a user (not a group or community channel).

- **_Group Chat_** → a multi-user group conversation (not community announcements).

### The Basics: WhatsAapp IDs

WhatsApp identifies chats and participants using specific suffixes:

#### Individual Chats

```bash
123123123@whatsapp.es
```

#### Groups

```bash
123123123@g.us
```

#### Group Members Participants (Participant)

Inside groups, participants may appear as:

- LID (Local Identifier) — modern way:

```bash
123123123@lid
```

- PN (Phone Number) — legacy way:

```bash
123123123@whatsapp.es
```

👉 Notice how all IDs end with a specific suffix that tells you what type they are.

You can freely mock these IDs to create the environment you need for testing your commands.

### Mocking behaviour

The type of chat your ChatMock creates depends on the options you pass:

1. No Options → Defaults to Individual Chat

```js
const chat = new ChatMock(new MyCommand());
```

2. Explicit Chat Type (senderType)

```js
const chat = new ChatMock(new MyCommand(), {
  /** ...(all other options) **/
  senderType: SenderType.Individual, // or SenderType.Group
});
```

Forces the mock to be the specified type.

3. Explicit Chat Id

```js
const chat = new ChatMock(new PingCommand(), {
  chatId: "yourGroupId@g.us", //or:  chatId: "yourPrivateChat@whatsapp.es"
});
```

The suffix in chatId determines whether it’s treated as an Individual or Group chat.

4. Adding Participant IDs

```js
const chat = new ChatMock(new PingCommand(), {
  /** ...(all other options) **/
  participantId_LID: "yourId",
  participantId_PN: "yourId",
});
```

Since only groups have participants, this will implicitly become a Group Chat.

5. Mixing Participant IDs + Explicit Type

```js
const chat = new ChatMock(new PingCommand(), {
  participantId_LID: "yourId",
  participantId_PN: "yourId",
  senderType: SenderType.Individual,
});
```

Even if you pass participant IDs, senderType wins and forces it to be an Individual Chat.

#### Priority Rules

When deciding chat type, the following order applies:

1. senderType → highest priority, always overrides.
2. chatId suffix → determines type if provided.
3. Participant IDs (participantId_LID or participantId_PN) → imply a Group Chat if no senderType.
4. No options → defaults to Individual Chat.

⚡ This way, you can precisely control whether your mocked context behaves like an Individual Chat or Group Chat, with or without custom participant IDs.

So, you can see your mocked data this way:

### Typescript (In js works the same)

```ts
import { it } from "your-testing-framework-of-choice";
import type { AdditionalAPI, CommandArgs, IChatContext, ICommand } from "whatsbotcord";
import { ChatMock } from "whatsbotcord";

class Com implements ICommand {
  name = "mynamecommand";
  async run(ctx: IChatContext, _rawMsgApi: AdditionalAPI, args: CommandArgs): Promise<void> {
    console.log(ctx.FixedChatId); // Default: "privateUserChatId@whatsapp.es
    console.log(ctx.FixedParticipantLID); // "yourId@lid"
    console.log(ctx.FixedParticipantPN); // "yourId@whatsapp.es"

    console.log(args.chatId); // Default: "privateUserChatId@whatsapp.es
    console.log(args.participantIdLID); // "yourId@lid"
    console.log(args.participantIdPN); // "yourId@whatsapp.es"
    console.log(args.senderType); // SenderType.Individual
    //Yes, they are the same either in ctx and args, the come from the same chat after all.
  }
}

it("retrieves user input correctly", async () => {
  const chat = new ChatMock(new PingCommand(), {
    participantId_LID: "yourId",
    participantId_PN: "yourId",
    senderType: SenderType.Individual,
  });
  await chat.StartChatSimulation();
});
```

# Documentation

Of course, chat or context object provided in commands has a lot more methods availables to send:

- Images
- Videos
- Documents
- Polls
- Ubication (Gps)

And more which are already documented in code, but I'm planning to create a small wiki or documentation page dedicated in the
future for this proyect. Soon will be available.

# Report Bugs:

Open a GitHub issue on the Issues page with a detailed description of the bug.
Include steps to reproduce, expected behavior, and actual behavior.

# Contributing

All contributions are welcomed!. You need to take into account the following:

## Setting Up Development Environment:

- Bun.js 1.2.20 or greater, is used as testing framework for this proyect

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

# Acknowledgment

Thanks to the awesome library [Baileys.js](https://github.com/WhiskeySockets/Baileys) to make
possible to use whatsapp web for automation purposes. Huge congrats for them, without it, this proyect wouldn't even
be possible.

# License

MIT License

Copyright (c) 2025 KristanLaimon

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
