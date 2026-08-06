<div align="center">
  <img src="https://raw.githubusercontent.com/KristanLaimon/WhatsBotCord.js/refs/heads/main/.github/media/whatsbotcord_logo.png" alt="WhatsBotCord Logo" width="30%"/>
</div>

# Whatsbotcord.js

![NPM Version](https://img.shields.io/npm/v/whatsbotcord)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/KristanLaimon/WhatsBotCord.js)
![NPM Last Update](https://img.shields.io/npm/last-update/whatsbotcord)
![NPM License](https://img.shields.io/npm/l/whatsbotcord)

**_WhatsBotCord_** is a lightweight, TypeScript-based mini-framework for building WhatsApp bots with a Discord-inspired command system (e.g., `!yourcommand`, `@everyone`). It provides an intuitive, type-safe interface that abstracts the complexity of whatsapp, making it as easy as building a Discord.js bot. Designed by developers, for developers.

> **🔥 Want to know what's new?** Check out the [**latest releases**](https://github.com/KristanLaimon/WhatsBotCord.js/releases) for documentation and usage examples.

🟢 [**Official Documentation Site**](https://whatsbotcord.sbs) | 📃 [**Documentation with AI (DeepWiki)**](https://deepwiki.com/KristanLaimon/WhatsBotCord.js)

---

## Features

- 🤖 **Discord-Inspired Syntax**: If you know how to make a Discord bot, you know how to use WhatsBotCord.
- 🔵 **First-Class TypeScript**: Fully typed for robust development, strict type-checking, and excellent autocompletion.
- 💬 **Context-Aware Messaging**: Easily reply to groups and individual chats using the injected `Context` object.

## Installation

> 📱 **Requirement:** You need an active WhatsApp account on a mobile device to scan the QR code for the Web Device Login (this uses the web protocol, not the official WhatsApp Business API).

Using npm:
```bash
npm install whatsbotcord
```

Using bun:

```shell
bun i whatsbotcord
```

- **_WhatsApp Account_**: You NEED an active WhatsApp account on a mobile device to scan a QR code for Web Device Login (not an official WhatsApp Business API).

## Core Concepts & API

To make creating commands as easy as possible, WhatsBotCord injects a Context (ctx), an API object (api), and the user arguments (args) into every command.

- `ctx (IChatContext)`: Contains details about the current chat and helper methods (e.g., ctx.SendText()).
- `args (CommandArgs)`: An array of strings containing the arguments passed after the command.
- `api (AdditionalAPI)`: Access to lower-level functions if needed.

## Getting started
Here is how you can set up a basic bot and register a command. This library supports both ESM (import) and CommonJS (require).

### Typescript (Recommended)

```ts
  import Whatsbotcord from "whatsbotcord";
  import { type AdditionalAPI, type CommandArgs, type IChatContext, type ICommand } from "whatsbotcord/types";
  
  // 1. Initialize the bot with your preferred prefixes
  const bot = new Whatsbotcord({
      commandPrefix: "!",
      tagPrefix: "@",
  });
  
  // 2. Define a command using the ICommand interface
  class PingCommand implements ICommand {
      name: string = "ping";
      aliases?: string[] = ["p"];
      
      public async run(ctx: IChatContext, api: AdditionalAPI, args: CommandArgs): Promise<void> {
        // ctx.SendText automatically replies to the chat where the command was triggered
        await ctx.SendText("pong! 🏓");
      }
  }
  
  class GreetCommand implements ICommand {
      name: string = "greet";
      
      public async run(ctx: IChatContext, api: AdditionalAPI, commandArgs: CommandArgs): Promise<void> {
        const user = commandArgs.args[0] || "stranger";
        await ctx.SendText(`Hello there, ${user}!`);
      }
  }
  
  // 3. Register commands and start the bot
  bot.Commands.Add(new PingCommand());
  bot.Commands.Add(new GreetCommand());
  
  bot.Start();
```

### JavaScript Example

```js
  import Whatsbotcord from "whatsbotcord";
  import { CreateCommand } from "whatsbotcord/helpers";
  
  const bot = new Whatsbotcord({
    commandPrefix: "!",
    tagPrefix: "@",
  });
  
  const PingCommand = CreateCommand(
    "ping",
    async function (ctx, api, args) {
      await ctx.SendText("pong! 🏓");
    }, 
    {
      aliases: ["p"],
    }
  );
  
  bot.Commands.Add(PingCommand);
  bot.Start();
```

Want to know more?, check the [official documentation site](https://whatsbotcord.sbs)

# Acknowledgment

Thanks to the awesome library [Baileys.js](https://github.com/WhiskeySockets/Baileys) to make
possible to use whatsapp web for automation purposes. Huge congrats for them, without it, this proyect wouldn't even be possible.

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
