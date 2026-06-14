# Release Notes: WhatsBotCord.js v1.1.0

Bienvenidos a la versión **1.1.0** de **WhatsBotCord.js**. Esta versión introduce cambios arquitectónicos profundos, un nuevo sistema de módulos tipados para gestionar Grupos y Presencia, y una drástica mejora en la experiencia del desarrollador (DX) gracias a los nuevos *Sub-path Exports*.

---

## 1. Arquitectura de Adaptadores (Vendor Adapters) y Unit Testing

El cambio arquitectónico más grande en esta versión es la total abstracción de `Baileys.js`. El bot ya no tiene un acoplamiento fuerte con Baileys, sino que ahora opera bajo una arquitectura de **Adaptadores (Vendor Adapters)**.

### Inyección de Adaptadores Personalizados
Ahora la clase principal `WhatsBot` acepta un segundo parámetro opcional en su constructor que implementa la interfaz `IWhatsappAdapter`. Si no se provee, el bot automáticamente usará el adaptador oficial de Baileys (`BaileysWhatsSocketAdapter`).

```typescript
import { WhatsBot } from "whatsbotcord";
// Opcional: Importar un adaptador custom
// import { MyCustomWhatsappWebJsAdapter } from "./my-adapter";

const bot = new WhatsBot({ authFolder: "./auth" }); // Usa Baileys por defecto
// const bot = new WhatsBot({ authFolder: "./auth" }, new MyCustomWhatsappWebJsAdapter());
```

### Utilidades de Testing (Mocking)
Gracias a esta nueva abstracción, ahora es posible realizar **Unit Testing y E2E Testing** en tu bot sin necesidad de escanear un código QR o conectarte a los servidores de WhatsApp. Se expone una nueva herramienta de testing: `MockAdapter`.

```typescript
import { WhatsBot, CommandType } from "whatsbotcord";
import { MockAdapter, ChatMock } from "whatsbotcord/testing";

// 1. Inicializa el bot con el adaptador falso (inicia instantáneamente en memoria)
const mockAdapter = new MockAdapter();
const bot = new WhatsBot({ authFolder: "./auth" }, mockAdapter);

// 2. Puedes añadir comandos y probarlos
bot.Commands.AddCommand(CommandType.Normal, {
  name: "ping",
  async run(ctx) {
    await ctx.SendText("pong!");
  }
});

// 3. Puedes usar ChatMock para simular que un usuario real envió un mensaje
const chatSimulation = new ChatMock(bot.Commands.NormalCommands[0]);
await chatSimulation.StartChatSimulation(); // Simula el envío de "!ping"
```

---

## 2. Visión General: El Nuevo Módulo de Grupos

Anteriormente, las acciones sobre grupos de WhatsApp carecían de una interfaz unificada. Con esta actualización, hemos creado el **Módulo de Grupos**.

**Cambios Críticos en la API (Reglas Generales):**

1. **PascalCase:** Siguiendo un estilo similar a C#, todos los métodos del módulo de grupos comienzan con letra mayúscula (ej. `GetMetadata`, `AddParticipants`).
2. **Retornos Booleanos Seguros:** Las acciones operativas (como modificar administradores) ya no devuelven un confuso array sin tipar. Ahora retornan un claro y simple **`Promise<boolean>`**.
3. **Manejo Interno de Errores:** Todos los métodos de este módulo están envueltos internamente en bloques `try/catch`. Si una operación falla, el método simplemente retornará `false` en lugar de crashear el bot.

### Puntos de Acceso para Módulos Integrados

La API de Grupos (y Presencia) está diseñada para ser accesible desde los dos contextos principales:

- **Desde un Comando (`ChatContext`):** `chat.Group`
- **Desde Fuera de un Comando (`Bot Instance`):** `bot.Groups`

---

## 3. Listado Completo de la API de Grupos

### Obtención de Datos y Metadata

- **`FetchGroupData(chatId?: string): Promise<GroupMetadataInfo | null>`**
  Retorna la información del grupo fuertemente parseada a un formato de alto nivel (`GroupMetadataInfo`).
  ```typescript
  const info = await chat.Group.FetchGroupData(chat.FixedChatId);
  if (info) {
    console.log(`El grupo se llama: ${info.groupName}`);
    console.log(`Tiene ${info.members.length} miembros.`);
  }
  ```

- **`GetMetadata(groupId: string): Promise<WhatsappGroupMetadata>`**
  Devuelve la metadata "cruda" proporcionada directamente por WhatsApp.
  ```typescript
  const metadata = await chat.Group.GetMetadata(chat.FixedChatId);
  console.log("Fecha de creación:", metadata.creation);
  ```

- **`GetAll(): Promise<WhatsappGroupMetadata[]>`**
  Retorna un arreglo con la metadata de todos los grupos en los que el bot se encuentra actualmente.
  ```typescript
  const todosLosGrupos = await bot.Groups.GetAll(); // Usando bot.Groups global
  console.log(`El bot está en ${todosLosGrupos.length} grupos.`);
  ```

- **`FindByName(name: string): Promise<WhatsappGroupMetadata | null>`**
  Busca entre todos los grupos en los que está el bot y devuelve la metadata del primero que coincida exactamente.
  ```typescript
  const grupo = await bot.Groups.FindByName("Administradores VIP");
  if (grupo) {
    console.log(`Grupo encontrado con ID: ${grupo.id}`);
  }
  ```

- **`IsBotAdmin(groupId: string): Promise<boolean>`**
  Evalúa si el bot posee rango de Administrador en el grupo especificado.
  ```typescript
  const esAdmin = await chat.Group.IsBotAdmin(chat.FixedChatId);
  if (!esAdmin) {
    await chat.SendText("Necesito ser administrador para hacer esto.");
  }
  ```

### Acciones de Administración de Participantes

- **`AddParticipants(groupId: string, participants: string[]): Promise<boolean>`**
  Añade una lista de usuarios al grupo.
  ```typescript
  const exito = await chat.Group.AddParticipants(chat.FixedChatId, ["1234567890@s.whatsapp.net"]);
  if (exito) await chat.SendText("¡Usuario añadido al grupo!");
  ```

- **`RemoveParticipants(groupId: string, participants: string[]): Promise<boolean>`**
  Expulsa a una lista de usuarios del grupo.
  ```typescript
  const seLogro = await chat.Group.RemoveParticipants(chat.FixedChatId, ["1234567890@s.whatsapp.net"]);
  if (seLogro) await chat.SendText("Usuario expulsado.");
  ```

- **`PromoteParticipants(groupId: string, participants: string[]): Promise<boolean>`**
  Otorga permisos de administrador a los usuarios especificados.
  ```typescript
  const promovido = await chat.Group.PromoteParticipants(chat.FixedChatId, ["1234567890@s.whatsapp.net"]);
  if (promovido) await chat.SendText("Ahora eres Administrador.");
  ```

- **`DemoteParticipants(groupId: string, participants: string[]): Promise<boolean>`**
  Retira los permisos de administrador a los usuarios especificados.
  ```typescript
  const degradado = await chat.Group.DemoteParticipants(chat.FixedChatId, ["1234567890@s.whatsapp.net"]);
  if (degradado) await chat.SendText("Te he quitado el administrador.");
  ```

- **`RemoveAllParticipants(groupId: string): Promise<void>`**
  Expulsa a **todos** los participantes del grupo (excepto al bot).
  ```typescript
  await chat.SendText("Iniciando purga total...");
  await chat.Group.RemoveAllParticipants(chat.FixedChatId);
  ```

### Acciones de Grupo y Limpieza

- **`Leave(groupId: string): Promise<void>`**
  Hace que el bot abandoné voluntariamente el grupo.
  ```typescript
  await chat.SendText("Me voy de este grupo. ¡Adiós!");
  await chat.Group.Leave(chat.FixedChatId);
  ```

- **`DeleteChat(groupId: string): Promise<void>`**
  Elimina el historial del grupo de la bandeja del cliente.
  ```typescript
  // A menudo se usa junto con Leave
  await bot.Groups.Leave("123@g.us");
  await bot.Groups.DeleteChat("123@g.us");
  ```

- **`Cleanup(groupId: string): Promise<void>`**
  Realiza una limpieza interna de la caché de memoria del grupo en la instancia del bot.
  ```typescript
  await chat.Group.Cleanup(chat.FixedChatId);
  ```

---

## 4. Nuevo Módulo de Presencia (Presence API)

Se ha añadido el nuevo módulo de **Presencia (Presence)** para controlar el estado en línea del bot y su actividad de chat (escribiendo, grabando audio) de manera programática.

### API de Estado Global

- **`bot.InternalSocket.Presence.SetGlobalPresenceState(state: "online" | "offline"): Promise<boolean>`**
  Configura la visibilidad global del bot.
  ```typescript
  // Marcar al bot como desconectado globalmente para todos los chats
  await bot.InternalSocket.Presence.SetGlobalPresenceState("offline");
  ```

### API de Actividad en Chat (Escribiendo / Grabando)

- **`StartTyping(jid: string): Promise<boolean>` / `StopTyping(jid: string): Promise<boolean>`**
  Inicia o detiene el indicador de "escribiendo..." en un chat específico.
  ```typescript
  await chat.Presence.StartTyping(chat.FixedChatId);
  // ... hacer una búsqueda en la base de datos (lento) ...
  await chat.Presence.StopTyping(chat.FixedChatId);
  await chat.SendText("Listo, aquí tienes los resultados.");
  ```

- **`StartRecording(jid: string): Promise<boolean>` / `StopRecording(jid: string): Promise<boolean>`**
  Inicia o detiene el indicador de "grabando audio..." en un chat específico.
  ```typescript
  await chat.Presence.StartRecording(chat.FixedChatId);
  // ... generar un archivo de voz TTS ...
  await chat.Presence.StopRecording(chat.FixedChatId);
  await chat.SendAudio(bufferDeAudio);
  ```

### Helpers Automáticos (Recomendados)

Para simplificar el control de estados y evitar que el indicador se quede encendido por accidente si ocurre una excepción, se implementaron métodos `With*` que envuelven una Promesa y manejan el inicio y detención automáticamente.

- **`WithTyping<T>(jid: string, action: () => Promise<T>): Promise<T>`**
- **`WithRecording<T>(jid: string, action: () => Promise<T>): Promise<T>`**

```typescript
await chat.Presence.WithTyping(chat.FixedChatId, async () => {
  const respuestaAPI = await fetch("https://api.example.com/data");
  const data = await respuestaAPI.json();
  await chat.SendText(`Datos obtenidos: ${data.result}`);
}); // <-- Se detiene de escribir automáticamente al finalizar la promesa
```

---

## 5. Mejoras de Modularización y "Sub-path Exports"

Con la versión v1.1.0, la librería introduce **Sub-path Exports** para mejorar la experiencia de desarrollo (DX), permitiendo importar herramientas específicas sin saturar tu aplicación en producción. El API principal `whatsbotcord` no ha sufrido rupturas (*non-breaking change*).

Ahora puedes acceder a módulos especializados de forma limpia:

- **`whatsbotcord/testing`**: Herramientas para Unit Testing (`MockAdapter`, `ChatMock`, `GenericSocketVendorClient_Mock`).
- **`whatsbotcord/helpers`**: Funciones utilitarias como extractores de menciones, formatos de texto, etc.
- **`whatsbotcord/types`**: Interfaces y tipados de TypeScript puros (`ICommand`, `ChatContext`, etc.).
- **`whatsbotcord/debugging`**: Utilidades específicas de depuración (ej. `Debug_StoreWhatsMsgHistoryInJson`).

**Ejemplo de uso modularizado:**
```typescript
import { WhatsBot } from "whatsbotcord";
import { MockAdapter } from "whatsbotcord/testing";
import type { ICommand } from "whatsbotcord/types";
```

Además, el código base fue reestructurado internamente:
* Los tipos pasaron a la carpeta `/src/types/`.
* Los archivos de playground se movieron de la raíz de `/src` a `/src/playground/`.
* El sistema de empaquetado usa ahora `tsdown` generando *chunks* optimizados sin duplicidad de código.
