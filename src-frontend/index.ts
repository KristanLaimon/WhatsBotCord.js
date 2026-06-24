import Whatsbotcord from "./bot/bot.js";
import {
  MsgHelper_FullMsg_GetMsgType,
  MsgHelper_FullMsg_GetQuotedMsg,
  MsgHelper_FullMsg_GetQuotedMsgText,
  MsgHelper_FullMsg_GetSenderType,
  MsgHelper_FullMsg_GetText,
  MsgHelper_ProtoMsg_GetMsgType,
  MsgHelper_QuotedMsg_GetText,
} from "./helpers/Msg.helper.js";
import {
  WhatsappHelper_ExtractFromWhatsappID,
  WhatsappHelper_ExtractWhatsappInfoFromMention,
  WhatsappHelper_ExtractWhatsappInfoInfoFromSenderRawMsg,
  WhatsappHelper_isFullWhatsappIdUser,
  WhatsappHelper_isLIDIdentifier,
  WhatsappHelper_isMentionId,
} from "./helpers/Whatsapp.helper.js";

// === Types deps exporting ===
import type {
  WhatsbotcordMiddlewareFunct,
  WhatsbotcordMiddlewareFunct_OnFoundCommand,
  WhatsbotcordPlugin,
  WhatsBotGroup,
  WhatsBotPresence,
} from "./bot/bot.js";
import type { IChatContextConfig } from "./bot/internals/ChatContext.js";
import type { CommandEntry } from "./bot/internals/CommandsSearcher.js";
import type { CommandArgs } from "./bot/internals/CommandsSearcher.types.js";
import type { IChatContext, IChatGroupAPI } from "./bot/internals/IChatContext.js";
import type { AdditionalAPI, ICommand } from "./bot/internals/ICommand.js";
import type { WorkflowNumericArgs } from "./utils/WorkflowNumeric.types.js";

import type { WhatsappIDInfo } from "./helpers/Whatsapp.helper.js";
import type {
  MockEnqueueParamsDocument,
  MockEnqueueParamsLocation,
  MockEnqueueParamsMinimal,
  MockEnqueueParamsMultimedia,
  MockEnqueueParamsMultimediaMinimal,
  MockingChatParams,
} from "./mocking_suite/ChatMock.js";
import type { IWhatsSocket_Submodule_Group } from "./whats_socket/internals/IWhatsSocket.groups.js";
import type { IWhatsSocket_Submodule_Receiver } from "./whats_socket/internals/IWhatsSocket.receiver.js";
import type { IWhatsSocket_Submodule_SugarSender } from "./whats_socket/internals/IWhatsSocket.sugarsender.js";
import type { GroupMetadataInfo, WhatsSocketReceiverError } from "./whats_socket/internals/WhatsSocket.receiver.js";
import type { IMsgServiceSocketMinimum, IWhatsSocket, IWhatsSocket_EventsOnly_Module } from "./whats_socket/IWhatsSocket.js";
import type {
  IWhatsappAdapter,
  IWhatsappSocketAdapterClient,
  WhatsappGroupMetadata,
  WhatsappMessage,
  WhatsappPresenceState,
  WhatsSocketGroupParticipantsUpdate,
  WhatsSocketLoggerMode,
} from "./whats_socket/types.js";
import type { WhatsSocketOptions } from "./whats_socket/WhatsSocket.js";

export type {
  AdditionalAPI,
  IChatContextConfig as ChatContextConfig,
  CommandArgs,
  CommandEntry,
  GroupMetadataInfo,
  IChatContext,
  IChatGroupAPI,
  ICommand,
  IMsgServiceSocketMinimum,
  IWhatsSocket,
  IWhatsSocket_EventsOnly_Module,
  IWhatsSocket_Submodule_Group,
  IWhatsSocket_Submodule_Receiver,
  IWhatsSocket_Submodule_SugarSender,
  IWhatsappSocketAdapterClient as IWhatsSocketVendorClient,
  IWhatsappAdapter as IWhatsSocketVendorFactory,
  WhatsbotcordMiddlewareFunct_OnFoundCommand as MiddlewareFunct_OnFoundCommand,
  MockEnqueueParamsDocument,
  MockEnqueueParamsLocation,
  MockEnqueueParamsMinimal,
  MockEnqueueParamsMultimedia,
  MockEnqueueParamsMultimediaMinimal,
  MockingChatParams,
  WhatsappGroupMetadata,
  WhatsappIDInfo,
  WhatsappMessage,
  WhatsappPresenceState,
  WhatsbotcordMiddlewareFunct,
  WhatsbotcordPlugin,
  WhatsBotGroup,
  WhatsBotPresence,
  WhatsSocketGroupParticipantsUpdate,
  WhatsSocketLoggerMode,
  WhatsSocketOptions,
  WhatsSocketReceiverError,
  WorkflowNumericArgs,
};

// == Runtime deps exporting ==
  import Bot from "./bot/bot.js";
  import { ChatContext } from "./bot/internals/ChatContext.js";
  import { CommandType } from "./bot/internals/CommandsSearcher.js";
  import CreateCommand from "./helpers/CommandForJs.helper.js";
  import { WhatsappIdType } from "./helpers/Whatsapp.helper.js";
  import Delegate from "./libs/Delegate.js";
  import ChatMock from "./mocking_suite/ChatMock.js";
  import { MsgType, SenderType } from "./types/Msg.types.js";
  import { WhatsappGroupIdentifier, WhatsappLIDIdentifier, WhatsappPhoneNumberIdentifier } from "./types/Whatsapp.types.js";
  import { WorkFlowNumericMany } from "./utils/WorkflowNumeric.many.js";
  import { WorkflowNumericSingle } from "./utils/WorkflowNumeric.single.js";
  import { WhatsSocketReceiverHelper_isReceiverError, WhatsSocketReceiverMsgError } from "./whats_socket/internals/WhatsSocket.receiver.js";
  import WhatsSocket from "./whats_socket/WhatsSocket.js";

export {
  ChatContext,
  ChatMock,
  CommandType,
  CreateCommand,
  Delegate,
  MsgType,
  SenderType,
  WhatsappIdType,
  Bot as Whatsbotcord,
  WhatsSocket,
  WhatsSocketReceiverMsgError,
  WorkFlowNumericMany,
  WorkflowNumericSingle,
};

// === Helpers ===

export const WhatsappIdentifiers = {
  Group_Suffix_ID: WhatsappGroupIdentifier,
  LID_Suffix_ID: WhatsappLIDIdentifier,
  PhoneNumber_Suffix_ID: WhatsappPhoneNumberIdentifier,
};

export const WhatsappHelpers = {
  GetWhatsInfoFromSenderMsg: WhatsappHelper_ExtractWhatsappInfoInfoFromSenderRawMsg,
  GetWhatsInfoFromWhatsappID: WhatsappHelper_ExtractFromWhatsappID,
  GetWhatsInfoFromMentionStr: WhatsappHelper_ExtractWhatsappInfoFromMention,
  IsLIDId: WhatsappHelper_isLIDIdentifier,
  IsMentionString: WhatsappHelper_isMentionId,
  IsPNId: WhatsappHelper_isFullWhatsappIdUser,
  IdentifiersPostfixes: WhatsappIdentifiers,
};

export const Helpers = {
  Msg: {
    FullMsg_GetQuotedMsgText: MsgHelper_FullMsg_GetQuotedMsgText,
    FullMsg_GetMsgType: MsgHelper_FullMsg_GetMsgType,
    FullMsg_GetText: MsgHelper_FullMsg_GetText,
    FullMsg_GetQuotedMsgObj: MsgHelper_FullMsg_GetQuotedMsg,
    FullMsg_GetSenderType: MsgHelper_FullMsg_GetSenderType,
    QuotedMsg_GetText: MsgHelper_QuotedMsg_GetText,
    AnyMsg_GetMsgType: MsgHelper_ProtoMsg_GetMsgType,
  },
  Whatsapp: WhatsappHelpers,
  ChatContext_IsWaitError: WhatsSocketReceiverHelper_isReceiverError,
};

// === Main Default Export ===
export default Whatsbotcord;
