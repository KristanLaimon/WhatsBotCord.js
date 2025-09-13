# Whatsbotcord.js

<p align="center">
  <img src="https://github.com/KristanLaimon/WhatsBotCord.js/blob/main/.github/media/whatsbotcordjs.png?raw=true" width="50%"/>
</p>

> Note: WhatsBotCord its on very early beta, not full usable yet, soon will be ready for use.

**_WhatsBotCord_** is a lightweight, TypeScript-based library for building WhatsApp bots with a Discord-inspired command system (e.g., **_!hello_**). Built as a wrapper around Baileys, it abstracts complex Baileys internals, providing an intuitive, type-safe interface for managing WhatsApp groups and individual chats. Compatible with Bun.js (recommended) and Node.js, it’s designed for developers to create custom bots with ease.

# Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
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
npm install whatsbotcord@beta
```

or

```shell
bun i whatsbotcord@beta
```

- **_WhatsApp Account_**: You NEED an active WhatsApp account on a mobile device to scan a QR code for Web Device Login (not an official WhatsApp Business API).
  > Warning: WhatsBotCord uses WhatsApp Web Device Login, which is not an official WhatsApp bot API. Excessive usage or spamming may result in a WhatsApp ban.

## Getting started

Import the library and you can use this minimal code to get started with your first command:

```js
// bot.ts
import Whatsbotcord, { type ChatContext, type CommandArgs, type IBotCommand, type RawMsgAPI, CommandType, MsgType } from "whatsbotcord";

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
import Whatsbotcord, { type ChatContext, type CommandArgs, type IBotCommand, type RawMsgAPI, CommandType, MsgType } from "whatsbotcord";

// ================== Ping.ts ======================
// A command can be created with a class implementing IBotCommand
class PingCommand implements IBotCommand {
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
        /* -> */ await chat.SendImg(imgRecevied);
        await chat.Ok(); //Sends a ✅ reaction emoji to original msg
        //Otherwise, its null
      } else {
        await chat.SendText("No recibí tu mensaje... Fin");
        await chat.Fail(); //Sends a ❌ reaction emoji to original msg
      }
    },
  },
  CommandType.Normal
);
bot.Start();
```

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
