# Whatsbotcord.js
<p align="center">
  <img src="https://github.com/KristanLaimon/WhatsBotCord.js/blob/main/.github/media/whatsbotcordjs.png?raw=true" width="50%"/>
</p>

***WhatsBotCord*** is a lightweight, TypeScript-based library for building WhatsApp bots with a Discord-inspired command system (e.g., ***!hello***). Built as a wrapper around Baileys, it abstracts complex Baileys internals, providing an intuitive, type-safe interface for managing WhatsApp groups and individual chats. Compatible with Bun.js (recommended) and Node.js, it’s designed for developers to create custom bots with ease.

> Note: WhatsBotCord its on very early beta, not full usable yet, soon will be ready for use.

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

- ***Discord-Inspired Command System***: Create commands (e.g., !hello) with a simple, familiar syntax inspired by Discord bots.
- ***TypeScript Support***8: Fully typed with TypeScript for robust development and autocompletion.
- ****Simplified Baileys Wrapper***: Abstracts complex Baileys internals, making it easy to manage groups, individual senders, and message handling.
- ***Group and Individual Messaging****: Seamlessly interact with WhatsApp groups and individual chats.
- ***Extensible Architecture*: Modular design for adding custom commands and functionality.
- ***Lightweight and Performant***: Optimized for speed and efficiency if using Bun.js (optional).

## Installation
```shell
npm install whatsbotcord@beta
```
or
```shell
bun i whatsbotcord@beta
```
- ***WhatsApp Account***: You NEED an active WhatsApp account on a mobile device to scan a QR code for Web Device Login (not an official WhatsApp Business API).
> Warning: WhatsBotCord uses WhatsApp Web Device Login, which is not an official WhatsApp bot API. Excessive usage or spamming may result in a WhatsApp ban.

## Usage
Import WhatsBotCord and initialize it in your TypeScript/JavaScript file. Example:
```js
// bot.ts
import whatsbot from 'whatsbotcord';
const bot = new whatsbot({ prefix: '!' });
bot.start();
```

### Creating Commands
Add commands in a commands/ directory or equivalent.
```js
// commands/hello.ts
import { Command } from 'whatsbotcord';

export default new Command({
  name: 'hello',
  description: 'Replies with a greeting',
  execute: async (message) => {
    await message.reply('Hello from WhatsBotCord!');
  },
});
```
> Scan the QR code displayed in the terminal using your WhatsApp mobile app!

# Report Bugs:
Open a GitHub issue on the Issues page with a detailed description of the bug.
Include steps to reproduce, expected behavior, and actual behavior.

# Contributing
All contributions are welcomed!. You need to take into account the following:

## Setting Up Development Environment:
- Ensure Bun.js 1.2.20 is installed (required for tests).
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

# Roadmap
- ✨ Release a comprehensive documentation page.

# Notes
- Most code is documented, and a dedicated documentation page is planned for release soon.
WhatsBotCord is in active development. Features and APIs may change as the project evolves.
- WhatsApp Ban Risk: As WhatsBotCord uses WhatsApp Web Device Login, there is a risk of account bans for spamming or excessive usage. Use responsibly and avoid sending high volumes of messages.
- TypeScript Focus: The library is designed with TypeScript for type safety and developer productivity, eliminating the need to understand Baileys’ complex internals.