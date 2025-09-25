import type { ICommand } from "./ICommand.js";

export enum CommandType {
  Normal = "Normal",
  Tag = "Tag",
}

export type CommandEntry = {
  commandName: string;
  commandObj: ICommand;
};

export default class CommandsSearcher {
  private _normalCommands: Map<string, ICommand> = new Map();
  private _tagCommands: Map<string, ICommand> = new Map();
  /**
   * If provided no command (or not found).
   * This should be executed instead. A global command
   */
  private _defaultCommand?: ICommand;
  private _defaultTag?: ICommand;

  public get Defaults() {
    return {
      Command: this._defaultCommand,
      Tag: this._defaultTag,
    };
  }

  public SetDefaultCommand(commandDefault: ICommand): void {
    this._defaultCommand = commandDefault;
  }
  public SetDefaultTag(commandDefault: ICommand): void {
    this._defaultTag = commandDefault;
  }

  public get NormalCommands(): CommandEntry[] {
    const toReturn: CommandEntry[] = [];
    this._normalCommands.forEach((commandObj, commandName) => toReturn.push({ commandName, commandObj }));
    return toReturn;
  }

  public get TagCommands(): CommandEntry[] {
    const toReturn: CommandEntry[] = [];
    this._tagCommands.forEach((commandObj, commandName) => toReturn.push({ commandName, commandObj }));
    return toReturn;
  }

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
              `Alias '${alias}' for command '${commandNameLowercase}' conflicts with existing command '${com.name}' of type "${CommandType[addCommandAsType]}".`
            );
          }
        }
      });
    }

    // Store the command
    mapToStoreInto.set(commandNameLowercase, commandToAdd);
  }

  public Exists(commandName: string) {
    return this.GetTypeOf(commandName) !== null;
  }

  public GetTypeOf(commandName: string): CommandType | null {
    const commandNameLowerCase: string = commandName.toLowerCase();

    if (this._normalCommands.has(commandNameLowerCase)) return CommandType.Normal;

    if (this._tagCommands.has(commandNameLowerCase)) return CommandType.Tag;

    return null;
  }

  public GetCommand(commandName: string): ICommand | null {
    return this._normalCommands.get(commandName.toLowerCase()) ?? null;
  }

  public GetTag(tagName: string): ICommand | null {
    return this._tagCommands.get(tagName.toLowerCase()) ?? null;
  }

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
