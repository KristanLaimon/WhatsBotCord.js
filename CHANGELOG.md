# Changelog

## [0.21.0](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.20.1...v0.21.0) (2025-10-23)

### Features

* Adding better error msg feedback when waiting non-enqueued msg in mockchat environment ([5a6d3c2](https://github.com/KristanLaimon/WhatsBotCord.js/commit/5a6d3c2fe06ff11133d129ffcba1611d6e2652ce))

## [0.20.1](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.20.0...v0.20.1) (2025-10-22)

### Bug Fixes

* Fixed edge case with Middleware and CommandFoundAfter event (check details) ([2fc6ed1](https://github.com/KristanLaimon/WhatsBotCord.js/commit/2fc6ed17856d8647ee8fd698832cc7600bb95776))

## [0.20.0](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.17.5...v0.20.0) (2025-10-15)

### Features

- **chatcontext:** WaitYesOrNoAnswer sugar method ([00faf16](https://github.com/KristanLaimon/WhatsBotCord.js/commit/00faf164ad9e64ace633b4963051a39312a22e75))

## [0.17.5](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.17.4...v0.17.5) (2025-10-14)

### Bug Fixes

- Fixed QR not displaying due to baileys.js outdated dependency ([7808e9d](https://github.com/KristanLaimon/WhatsBotCord.js/commit/7808e9d6889f1bcb616f39d79918adaf7b7d8282))

## [0.17.4](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.17.3...v0.17.4) (2025-10-14)

## [0.17.3](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.17.2...v0.17.3) (2025-10-11)

### Bug Fixes

- Added support for Enqueueing Empty text strings in mockchat enqueueing mocking framework ([e32d1d5](https://github.com/KristanLaimon/WhatsBotCord.js/commit/e32d1d59a8ab7c36a447ddeb0c0576b8614df5ef))

## [0.17.2](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.17.1...v0.17.2) (2025-10-11)

### Bug Fixes

- Fixing edge case with last feature waiting mock with timeoutSeconds of WaitMsg (receiver.mockingsuite) ([0dd06ca](https://github.com/KristanLaimon/WhatsBotCord.js/commit/0dd06cae08e0fbb65d2b424ad34164fc92673fc5))

## [0.17.1](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.17.0...v0.17.1) (2025-10-11)

## [0.17.0](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.16.0...v0.17.0) (2025-10-11)

### Features

- Adding chatmockg.sendingmsgs option to delay msgs as a real user ([2a465b3](https://github.com/KristanLaimon/WhatsBotCord.js/commit/2a465b3dbca0bb62c487f7165c3693e1bfa90d39))

### Bug Fixes

- Fixed bad strict acceptance results in tests from last feature chatmock ([b3dbe71](https://github.com/KristanLaimon/WhatsBotCord.js/commit/b3dbe71c14c6c2501eb6d7a0abced372811e688b))

## [0.16.0](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.15.0...v0.16.0) (2025-10-10)

### Features

- Middlewares receives senderId_LID and senderId_PN format! ([22a2057](https://github.com/KristanLaimon/WhatsBotCord.js/commit/22a2057197b74f5717ac7d67776f6af787529302))

## [0.15.0](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.14.1...v0.15.0) (2025-10-08)

### Features

- Added new middleware to execute on "FOUND COMMAND" event ([af2317d](https://github.com/KristanLaimon/WhatsBotCord.js/commit/af2317d36cda52991f34db159f39851a93533b10))
- More types availables on index.ts library for clients ([849f457](https://github.com/KristanLaimon/WhatsBotCord.js/commit/849f457023216c38d545a5da2bd8e9e98f09e4c9))

## [0.14.1](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.14.0...v0.14.1) (2025-10-07)

### Bug Fixes

- Fixed future bug with chatcontext not updating initialmsg when being created without initialmsg ([38db038](https://github.com/KristanLaimon/WhatsBotCord.js/commit/38db038e65e86311e02266731f9224f71184c8c8))

## [0.14.0](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.13.0...v0.14.0) (2025-10-07)

### Features

- **chatcontext:** Added Clone() and CloneButTargetedTo() ([25224f5](https://github.com/KristanLaimon/WhatsBotCord.js/commit/25224f5d1773d174335a5c6d107a9eb1429cff30))

## [0.13.0](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.12.0...v0.13.0) (2025-10-01)

### Features

- WhatsappHelpers.GetWhatsInfoFromWhatsappID ([abab9d3](https://github.com/KristanLaimon/WhatsBotCord.js/commit/abab9d37bc36272dd58ea1d7f0feef6d14b20463))

## [0.12.0](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.11.0...v0.12.0) (2025-09-25)

### Features

- Adding default fallback command or tag to CommandSearcher + docs ([894e55b](https://github.com/KristanLaimon/WhatsBotCord.js/commit/894e55bbfc728047bf686e43e98c2c1af98801b6))
- Bot adds default command (!) and/or default tag (@) to execute if not found as command setting methods ([dd1970a](https://github.com/KristanLaimon/WhatsBotCord.js/commit/dd1970a4de803e5feec63cd85fad2e1e1fb7481e))

### Bug Fixes

- Improves usage of fallbacks inside bot OnMessageIncoming ([8f1e1ae](https://github.com/KristanLaimon/WhatsBotCord.js/commit/8f1e1ae1474e070fe0521302a3940d28ddfa1ea7))

## [0.11.0](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.10.5...v0.11.0) (2025-09-25)

### Features

- Now commands can access to bot settings and commands metadata ([30fd82a](https://github.com/KristanLaimon/WhatsBotCord.js/commit/30fd82af6e81f604c9edb39601272e1cf5cb6734))

### Bug Fixes

- Adding bot settings support inside commands for mocking framework ([818fc87](https://github.com/KristanLaimon/WhatsBotCord.js/commit/818fc87feae8e17fd92b4f3d54df0c9251219dda))
- Fixes typescript type compiler complaints with imports ([4170755](https://github.com/KristanLaimon/WhatsBotCord.js/commit/4170755bac84a7018df0b04c98a9b83e272a335f))

## [0.10.5](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.10.4...v0.10.5) (2025-09-23)

## [0.10.4](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.10.3...v0.10.4) (2025-09-23)

## [0.10.3](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.10.2...v0.10.3) (2025-09-21)

## [0.10.2](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.10.1...v0.10.2) (2025-09-21)

## [0.10.1](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.10.0...v0.10.1) (2025-09-21)

## [0.10.0](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.9.1...v0.10.0) (2025-09-21)

### Features

- **botmiddleware:** Now middleware gives you the bot object. To allow more modularity and plug-and-play plugins/middlewares ([97e53d8](https://github.com/KristanLaimon/WhatsBotCord.js/commit/97e53d8af7632fcbb14dddc742028d3f46afefa3))
- **mocking:** Adding support for PN and LID participant msgs ([a577dc8](https://github.com/KristanLaimon/WhatsBotCord.js/commit/a577dc85ae1152bd367b981a6a2c8f78641668ff))
- **mockingframework:** Now sugarsender.mockingsuite returns realistic mock msgs ([d115640](https://github.com/KristanLaimon/WhatsBotCord.js/commit/d1156402c13026d6f2695f24a234a153d7539382))
- Plugin system, and adds 1 official plugin ([19cb7b9](https://github.com/KristanLaimon/WhatsBotCord.js/commit/19cb7b9bfc46246c9b23b8b499624cda4b9f9f2b))

## [0.9.1](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.9.0...v0.9.1) (2025-09-20)

### Bug Fixes

- **mockingframework:** Sugarsender mock fix, it hasn't had been normalizing chatids well before ([5cac66b](https://github.com/KristanLaimon/WhatsBotCord.js/commit/5cac66bde34c862d17433ca3ecfdfe13a3f51b46))

## [0.9.0](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.8.1...v0.9.0) (2025-09-20)

### Features

- **mockingframework:** Added realistic txt msgs ([7e5a9a1](https://github.com/KristanLaimon/WhatsBotCord.js/commit/7e5a9a1682c98197a5a420774138203026af6f4c))
- **mockingframework:** Adding all enqueueing methods pending (ChatMock) ([bcbe9b7](https://github.com/KristanLaimon/WhatsBotCord.js/commit/bcbe9b7b73f9b760a79cf99086c445c9369c5b43))
- **mockingframework:** Adding all realistic msgs generators for mocking ([faa537e](https://github.com/KristanLaimon/WhatsBotCord.js/commit/faa537eae7635d7df81fd9dcfb05eb9cccddeb4e))
- **mockingframework:** Now Chatmocks have a inherited class with custom buffers mocking ([52e04ad](https://github.com/KristanLaimon/WhatsBotCord.js/commit/52e04ad29b6b41a9b6c5cd13ae132ae0b5f5d8e4))

## [0.8.2](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.8.1...v0.8.2) (2025-09-19)

## [0.8.1](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.1.1-beta.13...v0.8.1) (2025-09-19)
