# Changelog

## [0.13.0](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.12.0...v0.13.0) (2025-10-01)

### Features

* WhatsappHelpers.GetWhatsInfoFromWhatsappID ([abab9d3](https://github.com/KristanLaimon/WhatsBotCord.js/commit/abab9d37bc36272dd58ea1d7f0feef6d14b20463))

## [0.12.0](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.11.0...v0.12.0) (2025-09-25)

### Features

* Adding default fallback command or tag to CommandSearcher + docs ([894e55b](https://github.com/KristanLaimon/WhatsBotCord.js/commit/894e55bbfc728047bf686e43e98c2c1af98801b6))
* Bot adds default command (!) and/or default tag (@) to execute if not found as command setting methods ([dd1970a](https://github.com/KristanLaimon/WhatsBotCord.js/commit/dd1970a4de803e5feec63cd85fad2e1e1fb7481e))

### Bug Fixes

* Improves usage of fallbacks inside bot OnMessageIncoming ([8f1e1ae](https://github.com/KristanLaimon/WhatsBotCord.js/commit/8f1e1ae1474e070fe0521302a3940d28ddfa1ea7))

## [0.11.0](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.10.5...v0.11.0) (2025-09-25)

### Features

* Now commands can access to bot settings and commands metadata ([30fd82a](https://github.com/KristanLaimon/WhatsBotCord.js/commit/30fd82af6e81f604c9edb39601272e1cf5cb6734))

### Bug Fixes

* Adding bot settings support inside commands for mocking framework ([818fc87](https://github.com/KristanLaimon/WhatsBotCord.js/commit/818fc87feae8e17fd92b4f3d54df0c9251219dda))
* Fixes typescript type compiler complaints with imports ([4170755](https://github.com/KristanLaimon/WhatsBotCord.js/commit/4170755bac84a7018df0b04c98a9b83e272a335f))

## [0.10.5](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.10.4...v0.10.5) (2025-09-23)

## [0.10.4](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.10.3...v0.10.4) (2025-09-23)

## [0.10.3](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.10.2...v0.10.3) (2025-09-21)

## [0.10.2](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.10.1...v0.10.2) (2025-09-21)

## [0.10.1](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.10.0...v0.10.1) (2025-09-21)

## [0.10.0](https://github.com/KristanLaimon/WhatsBotCord.js/compare/v0.9.1...v0.10.0) (2025-09-21)

### Features

* **botmiddleware:** Now middleware gives you the bot object. To allow more modularity and plug-and-play plugins/middlewares ([97e53d8](https://github.com/KristanLaimon/WhatsBotCord.js/commit/97e53d8af7632fcbb14dddc742028d3f46afefa3))
* **mocking:** Adding support for PN and LID participant msgs ([a577dc8](https://github.com/KristanLaimon/WhatsBotCord.js/commit/a577dc85ae1152bd367b981a6a2c8f78641668ff))
* **mockingframework:** Now sugarsender.mockingsuite returns realistic mock msgs ([d115640](https://github.com/KristanLaimon/WhatsBotCord.js/commit/d1156402c13026d6f2695f24a234a153d7539382))
* Plugin system, and adds 1 official plugin ([19cb7b9](https://github.com/KristanLaimon/WhatsBotCord.js/commit/19cb7b9bfc46246c9b23b8b499624cda4b9f9f2b))

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
