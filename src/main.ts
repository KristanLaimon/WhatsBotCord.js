import Bot from "src/core/bot/bot";
import { MsgHelper_GetMsgTypeFromRawMsg, MsgHelper_GetQuotedMsgTextFrom } from "src/helpers/Msg.helper";
import {
  WhatsappHelper_ExtractWhatsappIdFromMention,
  WhatsappHelper_ExtractWhatsappIdInfoFromSenderRawMsg,
  WhatsappHelper_isFullWhatsappIdUser,
  WhatsappHelper_isLIDIdentifier,
  WhatsappHelper_isMentionId,
} from "src/helpers/Whatsapp.helper";

// Helpers namespace
const MsgHelpers = {
  GetTextFromQuotedMsg: MsgHelper_GetQuotedMsgTextFrom,
  GetMsgTypeFrom: MsgHelper_GetMsgTypeFromRawMsg,
};

const WhatsappHelpers = {
  GetWhatsInfoFromSenderMsg: WhatsappHelper_ExtractWhatsappIdInfoFromSenderRawMsg,
  GetWhatsInfoFromMentionStr: WhatsappHelper_ExtractWhatsappIdFromMention,
  IsLidIdentifier: WhatsappHelper_isLIDIdentifier,
  IsMentionString: WhatsappHelper_isMentionId,
  IsIDIdentifier: WhatsappHelper_isFullWhatsappIdUser,
};

export default Bot;
export { MsgHelpers, WhatsappHelpers };
