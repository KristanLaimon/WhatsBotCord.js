import type { IWhatsSocketVendorFactory, WhatsSocketLoggerMode } from "../types.js";
import { BaileysWhatsSocketVendorFactory } from "./baileys/BaileysWhatsSocketVendor.js";

export type DefaultWhatsSocketVendorFactoryOptions = {
  loggerMode: WhatsSocketLoggerMode;
  credentialsFolder: string;
};

export function WhatsSocketVendorFactory_CreateDefault(options: DefaultWhatsSocketVendorFactoryOptions): IWhatsSocketVendorFactory {
  return new BaileysWhatsSocketVendorFactory(options);
}
