import fs from "node:fs";
import { type WAMessage } from "baileys";
import { GetPath } from 'src/libs/BunPath';


const mockPath: string = GetPath("src", "helpers", "Whatsapp.helper.msgs_individual_group.json");
if (!fs.existsSync(mockPath)) {
  throw new Error(`DEVELOPMENT ERROR: Json file with whatsapp mock msgs coudn't be found. Provide the correct path to this file in 'Whatsapp.helper.mocks.ts' file!`)
}
const contents: WAMessage[] = JSON.parse(fs.readFileSync(mockPath).toString());
if (!Array.isArray(contents)) {
  throw new Error(`DEVELOPMENT ERROR: Json file with whatsapp mock msgs FOUND, but it's not an array of expected msgs for some reason... check that`);
}

export const IndividualMsg: WAMessage = contents[0]!;
export const GroupMsg: WAMessage = contents[1]!;