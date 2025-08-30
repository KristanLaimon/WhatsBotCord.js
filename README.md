# WhatsBotCord.js

![WhatsBotCord Logo](./.github/media/whatsbotcordjs.png)

> Still in very early development, not ready to use yet!

***WhatsBotCord*** is a lightweight, TypeScript-based library for building WhatsApp bots with a Discord-inspired command system (e.g., ***!hello***). Built as a wrapper around Baileys, it abstracts complex Baileys internals, providing an intuitive, type-safe interface for managing WhatsApp groups and individual chats. Compatible with Bun.js (recommended) and Node.js, it’s designed for developers to create custom bots with ease.

> Note: WhatsBotCord is in early development. Expect rapid updates and new features as the project matures.

# Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Contributing](#contributing)
- License
- Support
- Roadmap
- Notes

## Features

- ***Discord-Inspired Command System***: Create commands (e.g., !hello) with a simple, familiar syntax inspired by Discord bots.
- ***TypeScript Support***8: Fully typed with TypeScript for robust development and autocompletion.
- ****Simplified Baileys Wrapper***: Abstracts complex Baileys internals, making it easy to manage groups, individual senders, and message handling.
- ***Group and Individual Messaging****: Seamlessly interact with WhatsApp groups and individual chats.
- ***Extensible Architecture*: Modular design for adding custom commands and functionality.
- ***Lightweight and Performant***: Optimized for speed and efficiency if using Bun.js (optional).

## Installation
### Prerequisites

- _Bun.js_: Version 1.2.20 or higher (Install Bun) – recommended for optimal performance and mandatory for running tests.

OR

- _Node.js_: Version 16.x or higher (optional, for compatibility if not using Bun.js).


- (_Mandatory_) ***WhatsApp Account****: An active WhatsApp account on a mobile device to scan a QR code for Web Device Login (not an official WhatsApp Business API).


> Warning: WhatsBotCord uses WhatsApp Web Device Login, which is not an official WhatsApp bot API. Excessive usage or spamming may result in a WhatsApp ban.

## Steps

Install the Library:Once published to npm, install WhatsBotCord using:
bun add whatsbiscord

Note: The package is not yet available on npm. Check the Roadmap for updates.

Set Up Your Project:Create a new project or use an existing one. Ensure Bun.js or Node.js is installed.

Authenticate with WhatsApp:Run your bot script to generate a QR code for WhatsApp Web Device Login. Scan the QR code using the WhatsApp mobile app on the device hosting the bot account.

Run the Bot:
bun run your-bot-script.ts



## Usage

### Basic Setup
Import WhatsBotCord and initialize it in your TypeScript/JavaScript file. Example:
```js
// bot.ts
import { WhatsBotCord } from 'whatsbotcord';
const bot = new WhatsBotCord({ prefix: '!' });
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

### Running the Bot
```shell
bun run yourbotmainfile.ts
```
Scan the QR code displayed in the terminal using your WhatsApp mobile app.


# Configuration
Customize WhatsBotCord by providing an options object on bot creation:

- ***Command Prefix***: Set the prefix for commands (default: !).
- ***Group Management***: Specify WhatsApp groups to monitor.
- ***Logging***: Enable/disable debug logs and configure log levels.

Example config.ts:
```js
export default {
  prefix: '!',
  groups: ['group-id-1', 'group-id-2'],
  logging: {
    enabled: true,
    level: 'debug',
  },
};
```
# Report Bugs:
Open a GitHub issue on the Issues page with a detailed description of the bug.
Include steps to reproduce, expected behavior, and actual behavior.

# Contributing
We welcome contributions to WhatsBotCord library!. To contribute:

1. Clone the Repository
```shell
git clone https://github.com/your-username/whatsbotcord.git
cd whatsbiscord
```


## Setting Up Development Environment:
Ensure Bun.js 1.2.20 is installed (required for tests).
Install dependencies:bun install


Testing:

Write tests for new features using the included test framework.
Run tests with Bun.js

To run all fast tests, skipping those long time consuming tests
```shell
bun fastest
```

To run all of them
```shell
bun fulltest
```

> Testing requires Bun.js 1.2.20. This proyect uses Bun testing as framework


# Submit a Pull Request:

Create a branch for your changes: git checkout -b feature/your-feature.
Commit changes with clear messages.
Push to your fork and submit a pull request to the main repository.




# License
This project is licensed under the MIT License. See the LICENSE file for details.
Support
For issues, questions, or feature requests:


# Roadmap


- ✨ Publish to npm for easy installation.
- ✨ Support for bun compile and other compilers for self-executable binaries.
- ✨ Release a comprehensive documentation page.

# Notes

- Most code is documented, and a dedicated documentation page is planned for release soon.
WhatsBotCord is in active development. Features and APIs may change as the project evolves.
- WhatsApp Ban Risk: As WhatsBotCord uses WhatsApp Web Device Login, there is a risk of account bans for spamming or excessive usage. Use responsibly and avoid sending high volumes of messages.
- TypeScript Focus: The library is designed with TypeScript for type safety and developer productivity, eliminating the need to understand Baileys’ complex internals.