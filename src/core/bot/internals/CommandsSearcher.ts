import type { ICommand } from "./ICommand.js";
/**
 * Different categories of commands supported by the searcher.
 * - `Normal`: explicit commands that match directly.
 * - `Tag`: commands triggered by a tag (metadata, alias, or secondary marker).
 */
export enum CommandType {
  Normal = "Normal",
  Tag = "Tag",
}

/**
 * Central registry and search helper for commands.
 *
 * Commands are separated into two namespaces:
 * - **Normal commands**: Standard commands invoked by name.
 * - **Tag commands**: Commands bound to tags or metadata.
 *
 * A default command or tag may be defined. These act as a global fallback
 * when no specific match is found.
 */
export type CommandEntry = {
  commandName: string;
  commandObj: ICommand;
};

export default class CommandsSearcher {
  private _normalCommands: Map<string, ICommand> = new Map();
  private _tagCommands: Map<string, ICommand> = new Map();
  /**
   * Optional global fallback command.
   * Executed if no specific "normal" command is matched.
   */
  private _defaultCommand?: ICommand;

  /**
   * Optional global fallback tag command.
   * Executed if no specific "tag" command is matched.
   */
  private _defaultTag?: ICommand;

  /**
   * Provides access to the currently configured defaults.
   * - `Command`: fallback normal command
   * - `Tag`: fallback tag command
   */
  public get Defaults() {
    return {
      Command: this._defaultCommand,
      Tag: this._defaultTag,
    };
  }
  /**
   * Registers the global fallback normal command.
   * Used when no explicit normal command is found.
   */
  public SetDefaultCommand(commandDefault: ICommand): void {
    this._defaultCommand = commandDefault;
  }
  /**
   * Registers the global fallback tag command.
   * Used when no explicit tag command is found.
   */
  public SetDefaultTag(commandDefault: ICommand): void {
    this._defaultTag = commandDefault;
  }
  /**
   * Returns a list of all registered normal commands.
   * Each entry includes the command name and its implementation.
   */
  public get NormalCommands(): CommandEntry[] {
    const toReturn: CommandEntry[] = [];
    this._normalCommands.forEach((commandObj, commandName) => toReturn.push({ commandName, commandObj }));
    return toReturn;
  }
  /**
   * Returns a list of all registered tag commands.
   * Each entry includes the tag name and its implementation.
   */
  public get TagCommands(): CommandEntry[] {
    const toReturn: CommandEntry[] = [];
    this._tagCommands.forEach((commandObj, commandName) => toReturn.push({ commandName, commandObj }));
    return toReturn;
  }

  /**
   * Registers a new command, validating it and adding it to the appropriate
   * namespace (`Normal` or `Tag`).
   *
   * The method ensures that command names are valid (non-empty, single-word),
   * unique within their type, and that their aliases do not conflict with
   * other commands of the same type. All names and aliases are normalized to
   * lowercase for case-insensitive matching.
   *
   * @param commandToAdd The {@link ICommand} instance to register.
   * @param addCommandAsType The type of command, either `CommandType.Normal` (default) or `CommandType.Tag`.
   *
   * @example
   * // Add a simple normal command
   * searcher.Add({ name: 'help', run: ... });
   *
   * // Add a tag command with aliases
   * searcher.Add({ name: 'admin', aliases: ['mod'], run: ... }, CommandType.Tag);
   *
   * @example <caption>Error Scenarios</caption>
   * // Throws error for duplicate command name
   * searcher.Add({ name: 'help', run: ... }); // OK
   * searcher.Add({ name: 'help', run: ... }); // Throws Error
   *
   * // Throws error for alias conflict
   * searcher.Add({ name: 'kick', aliases: ['remove'], run: ... }); // OK
   * searcher.Add({ name: 'ban', aliases: ['remove'], run: ... }); // Throws Error
   *
   * // Throws error for invalid name
   * searcher.Add({ name: 'bad name', run: ... }); // Throws Error
   *
   * @throws {Error} If the command name is empty or contains spaces.
   * @throws {Error} If a command with the same name already exists for the given type.
   * @throws {Error} If an alias conflicts with an existing command's name or aliases of the same type.
   */
  public Add(commandToAdd: ICommand, addCommandAsType: CommandType = CommandType.Normal): void {
    if (!commandToAdd.name || commandToAdd.name.trim() === "") {
      throw new Error("You can't add a command without name!");
    }
    if (commandToAdd.name.split(" ").length > 1) {
      throw new Error(
        "You can not add a command with spaces or vary words length!. E.g: !hola mundo, 'hola mundo' is not a valid name, must be one word only like 'holamundo' or 'hola_mundo'"
      );
    }
    const commandNameLowercase = commandToAdd.name.toLowerCase();
    const mapToStoreInto: Map<string, ICommand> = addCommandAsType === CommandType.Normal ? this._normalCommands : this._tagCommands;

    // Check if a command with the same name already exists
    if (mapToStoreInto.has(commandNameLowercase)) {
      throw new Error(`Bad Args: CommandsSearcher => Command of type "${CommandType[addCommandAsType]}" with name '${commandNameLowercase}' already exists!`);
    }

    // Normalize metadata
    commandToAdd.name = commandNameLowercase;
    if (commandToAdd.aliases) {
      commandToAdd.aliases = commandToAdd.aliases.map((alias) => alias.toLowerCase());
    }

    // Check for alias conflicts
    if (commandToAdd.aliases?.length) {
      mapToStoreInto.forEach((com) => {
        if (!com.aliases?.length) return;

        for (const alias of commandToAdd.aliases!) {
          if (com.aliases!.includes(alias)) {
            throw new Error(
              `Bad Args: CommandsSearcher => Alias '${alias}' for command '${commandNameLowercase}' conflicts with existing command '${com.name}' of type "${CommandType[addCommandAsType]}".`
            );
          }
        }
      });
    }

    // Store the command
    mapToStoreInto.set(commandNameLowercase, commandToAdd);
  }

  /**
   * Checks whether a command exists in either namespace.
   *
   * @example
   * ```ts
   * searcher.Exists("ping"); // true
   * searcher.Exists("unknown"); // false
   * ```
   */
  public Exists(commandName: string) {
    return this.GetTypeOf(commandName) !== null;
  }

  /**
   * Determines the type of a command.
   *
   * @example
   * ```ts
   * searcher.GetTypeOf("ping"); // CommandType.Normal
   * searcher.GetTypeOf("mod");  // CommandType.Tag
   * searcher.GetTypeOf("ghost"); // null
   * ```
   */
  public GetTypeOf(commandName: string): CommandType | null {
    const commandNameLowerCase: string = commandName.toLowerCase();

    if (this._normalCommands.has(commandNameLowerCase)) return CommandType.Normal;

    if (this._tagCommands.has(commandNameLowerCase)) return CommandType.Tag;

    return null;
  }

  /**
   * Retrieves a normal command.
   * Falls back to the default command if not found.
   *
   * @example
   * ```ts
   * searcher.GetCommand("ping"); // returns ICommand for "ping"
   * searcher.GetCommand("unknown"); // returns default command (if set) or null
   * ```
   */
  public GetCommand(commandName: string): ICommand | null {
    return this._normalCommands.get(commandName.toLowerCase()) ?? this._defaultCommand ?? null;
  }

  /**
   * Retrieves a tag command.
   * Falls back to the default tag command if not found.
   *
   * @example
   * ```ts
   * searcher.GetTag("mod"); // returns ICommand for "mod"
   * searcher.GetTag("ghost"); // returns default tag (if set) or null
   * ```
   */
  public GetTag(tagName: string): ICommand | null {
    return this._tagCommands.get(tagName.toLowerCase()) ?? this._defaultTag ?? null;
  }

  /**
   * Finds a command by one of its aliases.
   *
   * @example
   * ```ts
   * searcher.Add({
   *   name: "ban",
   *   aliases: ["block", "remove"],
   *   execute: () => "banned"
   * });
   *
   * searcher.GetWhateverWithAlias("block", CommandType.Normal);
   * // returns the "ban" command
   * ```
   */
  public GetWhateverWithAlias(possibleAlias: string, commandTypeToLookFor: CommandType): ICommand | null {
    const aliasLower = possibleAlias.toLowerCase();

    const findInMap = (map: Map<string, ICommand>) => {
      for (const [, commandObj] of map) {
        if (commandObj.aliases?.some((alias) => alias.toLowerCase() === aliasLower)) {
          return commandObj;
        }
      }
      return null;
    };

    return commandTypeToLookFor === CommandType.Normal ? findInMap(this._normalCommands) : findInMap(this._tagCommands);
  }
}
