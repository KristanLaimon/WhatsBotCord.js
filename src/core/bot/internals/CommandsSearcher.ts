import type { ICommand } from "./IBotCommand";

export enum CommandType {
  Normal,
  Tag
}
//TODO: Create a SUITE TEST
export default class CommandsSearcher {
  private _normalCommands: Map<string, ICommand> = new Map();
  private _tagCommands: Map<string, ICommand> = new Map();

  public get NormalCommands(): Array<[string, ICommand]> {
    return Object.entries(this._normalCommands);
  }

  public get TagCommands(): Array<[string, ICommand]> {
    return Object.entries(this._tagCommands);
  }

  public AddCommand(commandInstance: ICommand, commandType: CommandType = CommandType.Normal): void {
    const commandNameLowercase = commandInstance.name.toLowerCase();
    const mapToStoreInto: Map<string, ICommand> = commandType === CommandType.Normal ? this._normalCommands : this._tagCommands;
    //If already exists, it'll be overwritten
    mapToStoreInto.set(commandNameLowercase, commandInstance);
  }

  public Exists(commandName: string) {
    return this.GetTypeOf(commandName) !== null;
  }

  public GetTypeOf(commandName: string): CommandType | null {
    const commandNameLowerCase: string = commandName.toLowerCase();

    if (this._normalCommands.has(commandNameLowerCase))
      return CommandType.Normal;

    if (this._tagCommands.has(commandNameLowerCase))
      return CommandType.Tag;

    return null;
  }

  public GetCommand(commandName: string): ICommand | null {
    return this._normalCommands.get(commandName.toLowerCase()) ?? null;
  }

  public GetTag(tagName: string): ICommand | null {
    return this._tagCommands.get(tagName.toLowerCase()) ?? null;
  }

  public GetWhateverWithAlias(possibleAlias: string): { command: ICommand, type: CommandType } | null {
    const foundCommand: [string, ICommand] | undefined = Array(...this._normalCommands).find(([_commandNameLowerCased, commandObj]) => {
      if (!commandObj.aliases) return false;
      if (commandObj.aliases.includes(possibleAlias))
        return true;
    });
    if (foundCommand)
      return { command: foundCommand[1], type: CommandType.Normal };

    const foundTag: [string, ICommand] | undefined = Array(...this._tagCommands).find(([_commandNameLowerCased, commandObj]) => {
      if (!commandObj.aliases) return false;
      if (commandObj.aliases.includes(possibleAlias))
        return true;
    });
    if (foundTag)
      return { command: foundTag[1], type: CommandType.Tag };

    return null;
  }
}