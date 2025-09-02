import type { ICommand } from "./IBotCommand";

export enum CommandType {
  Normal = "Normal",
  Tag = "Tag"
}

export type CommandEntry = {
  commandName: string;
  commandObj: ICommand;
}

//TODO: Create a SUITE TEST
export default class CommandsSearcher {
  private _normalCommands: Map<string, ICommand> = new Map();
  private _tagCommands: Map<string, ICommand> = new Map();

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

  public AddCommand(commandInstance: ICommand, addCommandAsType: CommandType): void {
    const commandNameLowercase = commandInstance.name.toLowerCase();
    const mapToStoreInto: Map<string, ICommand> = addCommandAsType === CommandType.Normal ? this._normalCommands : this._tagCommands;
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
    const aliasLower = possibleAlias.toLowerCase();

    const findInMap = (map: Map<string, ICommand>, type: CommandType) => {
      for (const [, commandObj] of map) {
        if (commandObj.aliases?.some(alias => alias.toLowerCase() === aliasLower)) {
          return { command: commandObj, type };
        }
      }
      return null;
    };

    return findInMap(this._normalCommands, CommandType.Normal)
      ?? findInMap(this._tagCommands, CommandType.Tag);
  }
}