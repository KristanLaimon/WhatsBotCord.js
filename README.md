<div align="center">
  <img src="https://raw.githubusercontent.com/KristanLaimon/WhatsBotCord.js/refs/heads/main/.github/media/whatsbotcord_logo.png" width="30%"/>
</div>
<h1 align="center"> Whatsbotcord.js </h1>

![NPM Version](https://img.shields.io/npm/v/whatsbotcord)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/KristanLaimon/WhatsBotCord.js)
![NPM Last Update](https://img.shields.io/npm/last-update/whatsbotcord)
![NPM License](https://img.shields.io/npm/l/whatsbotcord)

**_WhatsBotCord_** is a lightweight, TypeScript-based library for building WhatsApp bots with a Discord-inspired command system (e.g., **!yourcommand**, **@everyone**, and _more_). Built as a wrapper around Baileys.js, it abstracts complex Baileys.js internals, providing an intuitive, type-safe interface for managing WhatsApp groups and individual chats. Designed from developers to developers to create custom bots with ease.
**🔥 Want to know what's new?** Check out the [**latest releases**](https://github.com/KristanLaimon/WhatsBotCord.js/releases) for documentation and usage examples.

🟢 [Official Documentation Site (In progress)](https://whats-bot-cord-js-documentation.vercel.app/)
📃 [Documentation with AI (DeepWiki)](https://deepwiki.com/KristanLaimon/WhatsBotCord.js)

> This project has been battle-tested enough, I'm currently creating release candidates for the final v1.0.0. Documentation site is now online!

## Features

- 🤖 **Discord-Inspired Command System**: Create commands (e.g., !hello) with a simple, familiar syntax inspired by Discord bots.
- 🔵 **TypeScript Support**: Fully typed with TypeScript for robust development and autocompletion.
- ✨ **Simplified Baileys Wrapper**: Abstracts complex Baileys internals, making it easy to manage groups, individual senders, and message handling.
- 💬 **Group and Individual Messaging**: Seamlessly interact with WhatsApp groups and individual chats.
- 🧩 **Extensible Architecture**: Modular design for adding custom commands and functionality.
- 🚀 **Lightweight and Performant**: Optimized for speed and efficiency if using Bun.js (optional).

## Importing support

This library works with:

- ESM Modules (import and export)
- CJS CommonJs (const & require)

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
  tagPrefix: "@",
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
  tagPrefix: "@",
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

Want to know more?, check the [official documentation site (In progress)](https://whats-bot-cord-js-documentation.vercel.app/)

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
