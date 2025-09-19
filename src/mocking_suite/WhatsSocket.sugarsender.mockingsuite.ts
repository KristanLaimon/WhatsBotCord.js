import type { WAMessage } from "baileys";
import type {
  IWhatsSocket_Submodule_SugarSender,
  WhatsMsgAudioOptions,
  WhatsMsgDocumentOptions,
  WhatsMsgMediaOptions,
  WhatsMsgPollOptions,
  WhatsMsgSenderSendingOptions,
  WhatsMsgSenderSendingOptionsMINIMUM,
  WhatsMsgUbicationOptions,
} from "../core/whats_socket/internals/IWhatsSocket.sugarsender.js";
import type { WhatsappMessage } from "../core/whats_socket/types.js";
import { autobind } from "../helpers/Decorators.helper.js";
import { WhatsappGroupIdentifier, WhatsappIndividualIdentifier } from "../Whatsapp.types.js";
import { MsgFactory_CreateText } from "./MsgsMockFactory.js";

/**
 * A mocking implementation of `IWhatsSocket_Submodule_SugarSender` designed for unit testing.
 * This class simulates the behavior of sending various WhatsApp message types without interacting
 * with the actual WhatsApp socket. Instead, it stores sent message details in public arrays for
 * verification in tests (e.g., using `expect` assertions).
 *
 * @remarks
 * - All sending methods return a mock `WhatsappMessage` object simulating success.
 * - Chat IDs are normalized to ensure proper group/individual format.
 * - Use `ClearMocks()` to reset all stored message arrays between tests.
 * - This is not intended for production use; it's solely for testing the sugar sender logic.
 *
 * @example
 * ```ts
 * const mockSender = new WhatsSocket_Submodule_SugarSender_MockingSuite();
 * await mockSender.Text("1234567890", "Hello!");
 * expect(mockSender.SentMessages_Texts).toHaveLength(1);
 * expect(mockSender.SentMessages_Texts[0].text).toBe("Hello!");
 * ```
 */
export default class WhatsSocket_Submodule_SugarSender_MockingSuite implements IWhatsSocket_Submodule_SugarSender {
  private readonly UserPushNameMock = "ChatMock User";
  //=================================================== Spy External Methods ==================================================
  //                                                          Text
  /**
   * Array storing details of simulated text messages sent via `Text()`.
   */
  public SentMessages_Texts: Array<{
    chatId: string;
    text: string;
    options?: WhatsMsgSenderSendingOptions;
  }> = [];
  /**
   * Simulates sending a text message to a chat.
   *
   * @param chatId - The chat ID (individual or group).
   * @param text - The message text to send.
   * @param options - Optional sending options (e.g., mentions, normalization).
   * @returns A mock `WhatsappMessage` simulating successful sending.
   *
   * @remarks
   * - Stores the sent details in `SentMessages_Texts` for test verification.
   * - Normalizes the chat ID using `NormalizeChatId`.
   *
   * @example
   * ```ts
   * await mockSender.Text("338839029383" + WhatsappGroupIdentifier, "Hello World!", { normalizeMessageText: true });
   * expect(mockSender.SentMessages_Texts[0].text).toBe("Hello World!");
   * expect(mockSender.SentMessages_Texts[0].options).toEqual({ normalizeMessageText: true });
   * ```
   */
  @autobind
  public async Text(chatId: string, text: string, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    this.SentMessages_Texts.push({ text: text, options: options, chatId: NormalizeChatId(chatId) });
    //TODO: For all create success msgs, create a realistic object msg per type, not just a generic one
    return MsgFactory_CreateText(chatId, null, text, { customSenderWhatsUsername: this.UserPushNameMock });
  }

  //                                                          Img
  /**
   * Array storing details of simulated image messages sent via `Image()`.
   */
  public SentMessages_Imgs: Array<{
    chatId: string;
    imageOptions: WhatsMsgMediaOptions;
    options?: WhatsMsgSenderSendingOptions;
  }> = [];
  /**
   * Simulates sending an image message to a chat.
   *
   * @param chatId - The chat ID (individual or group).
   * @param imageOptions - Options for the image (e.g., source path/buffer, caption, format).
   * @param options - Optional sending options (e.g., mentions).
   * @returns A mock `WhatsappMessage` simulating successful sending.
   *
   * @remarks
   * - Stores the sent details in `SentMessages_Imgs` for test verification.
   * - Does not perform actual file I/O; assumes valid image options.
   *
   * @example
   * ```ts
   * const imageOpts = { source: "./fake.png", caption: "Check this image!" };
   * await mockSender.Image("1234567890", imageOpts);
   * expect(mockSender.SentMessages_Imgs[0].imageOptions).toEqual(imageOpts);
   * ```
   */
  @autobind
  public async Image(chatId: string, imageOptions: WhatsMsgMediaOptions, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    this.SentMessages_Imgs.push({ chatId, imageOptions, options });
    return CreateSuccessWhatsMsg(null, NormalizeChatId(chatId));
  }

  //              ===                                          ReactEmojiToMsg                                       ===
  /**
   * Array storing details of simulated emoji reactions sent via `ReactEmojiToMsg()`.
   */
  public SentMessages_ReactedEmojis: Array<{
    chatId: string;
    rawMsgReactedTo: WAMessage;
    emojiStr: string;
    options?: WhatsMsgSenderSendingOptionsMINIMUM;
  }> = [];

  /**
   * Simulates reacting to a message with an emoji.
   *
   * @param chatId - The chat ID (individual or group).
   * @param rawMsgToReactTo - The original message to react to.
   * @param emojiStr - The emoji string (e.g., "👍").
   * @param options - Optional sending options.
   * @returns A mock `WhatsappMessage` simulating successful reaction.
   *
   * @remarks
   * - Stores the reaction details in `SentMessages_ReactedEmojis` for test verification.
   *
   * @example
   * ```ts
   * const mockMsg = { key: { id: "msg123" } } as WAMessage;
   * await mockSender.ReactEmojiToMsg("1234567890", mockMsg, "❤️");
   * expect(mockSender.SentMessages_ReactedEmojis[0].emojiStr).toBe("❤️");
   * ```
   */
  @autobind
  public async ReactEmojiToMsg(
    chatId: string,
    rawMsgToReactTo: WAMessage,
    emojiStr: string,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WAMessage | null> {
    this.SentMessages_ReactedEmojis.push({ chatId, emojiStr, rawMsgReactedTo: rawMsgToReactTo, options });
    return CreateSuccessWhatsMsg(null, NormalizeChatId(chatId));
  }

  //              ===                                          Stickers                                       ===
  /**
   * Array storing details of simulated sticker messages sent via `Sticker()`.
   */
  public SentMessages_Stickers: Array<{
    chatId: string;
    stickerUrlSource: string | Buffer;
    options?: WhatsMsgSenderSendingOptionsMINIMUM;
  }> = [];
  /**
   * Simulates sending a sticker message to a chat.
   *
   * @param chatId - The chat ID (individual or group).
   * @param stickerUrlSource - Source of the sticker (URL string or Buffer).
   * @param options - Optional sending options.
   * @returns A mock `WhatsappMessage` simulating successful sending.
   *
   * @remarks
   * - Stores the sent details in `SentMessages_Stickers` for test verification.
   * - Does not process or validate the sticker source.
   *
   * @example
   * ```ts
   * const stickerBuffer = Buffer.from("sticker-data");
   * await mockSender.Sticker("1234567890", stickerBuffer);
   * expect(mockSender.SentMessages_Stickers[0].stickerUrlSource).toBe(stickerBuffer);
   * ```
   */
  @autobind
  public async Sticker(chatId: string, stickerUrlSource: string | Buffer, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    this.SentMessages_Stickers.push({ chatId, stickerUrlSource, options });
    return CreateSuccessWhatsMsg(null, NormalizeChatId(chatId));
  }

  //              ===                                          Audio                                       ===
  /**
   * Array storing details of simulated audio messages sent via `Audio()`.
   */
  public SentMessages_Audios: Array<{
    chatId: string;
    audioParams: WhatsMsgAudioOptions;
    options?: WhatsMsgSenderSendingOptionsMINIMUM;
  }> = [];
  /**
   * Simulates sending an audio message to a chat.
   *
   * @param chatId - The chat ID (individual or group).
   * @param audioParams - Options for the audio (e.g., source, ptt flag).
   * @param options - Optional sending options.
   * @returns A mock `WhatsappMessage` simulating successful sending.
   *
   * @remarks
   * - Stores the sent details in `SentMessages_Audios` for test verification.
   *
   * @example
   * ```ts
   * const audioOpts = { source: "./voice.ogg", ptt: true };
   * await mockSender.Audio("1234567890", audioOpts);
   * expect(mockSender.SentMessages_Audios[0].audioParams.ptt).toBe(true);
   * ```
   */
  @autobind
  public async Audio(chatId: string, audioParams: WhatsMsgAudioOptions, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    this.SentMessages_Audios.push({ audioParams, chatId, options });
    return CreateSuccessWhatsMsg(null, NormalizeChatId(chatId));
  }

  //              ===                                          Video                                       ===
  /**
   * Array storing details of simulated video messages sent via `Video()`.
   */
  public SentMessages_Videos: Array<{
    chatId: string;
    videoParams: WhatsMsgMediaOptions;
    options?: WhatsMsgSenderSendingOptions;
  }> = [];
  /**
   * Simulates sending a video message to a chat.
   *
   * @param chatId - The chat ID (individual or group).
   * @param videoParams - Options for the video (e.g., source, caption, format).
   * @param options - Optional sending options.
   * @returns A mock `WhatsappMessage` simulating successful sending.
   *
   * @remarks
   * - Stores the sent details in `SentMessages_Videos` for test verification.
   *
   * @example
   * ```ts
   * const videoOpts = { source: "./clip.mp4", caption: "Watch this!" };
   * await mockSender.Video("1234567890", videoOpts);
   * expect(mockSender.SentMessages_Videos[0].videoParams.caption).toBe("Watch this!");
   * ```
   */
  @autobind
  public async Video(chatId: string, videoParams: WhatsMsgMediaOptions, options?: WhatsMsgSenderSendingOptions): Promise<WAMessage | null> {
    this.SentMessages_Videos.push({ chatId, videoParams, options });
    return CreateSuccessWhatsMsg(null, NormalizeChatId(chatId));
  }

  /**
   * Array storing details of simulated document messages sent via `Document()`.
   */
  public SentMessages_Documents: Array<{
    chatId: string;
    docParams: WhatsMsgDocumentOptions;
    options?: WhatsMsgSenderSendingOptionsMINIMUM;
  }> = [];
  /**
   *
   * Simulates sending a document message to a chat.
   *
   * @param chatId - The chat ID (individual or group).
   * @param docParams - Options for the document (e.g., source path/buffer, filename).
   * @param options - Optional sending options.
   * @returns A mock `WhatsappMessage` simulating successful sending.
   *
   * @remarks
   * - Stores the sent details in `SentMessages_Documents` for test verification.
   *
   * @example
   * ```ts
   * const docOpts = { source: "./report.pdf", fileNameToDisplay: "Report 2025" };
   * await mockSender.Document("1234567890", docOpts);
   * expect(mockSender.SentMessages_Documents[0].docParams.fileNameToDisplay).toBe("Report 2025");
   * ```
   */
  @autobind
  public async Document(chatId: string, docParams: WhatsMsgDocumentOptions, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    this.SentMessages_Documents.push({ chatId, docParams, options });
    return CreateSuccessWhatsMsg(null, NormalizeChatId(chatId));
  }

  /**
   * Array storing details of simulated poll messages sent via `Poll()`.
   */
  public SentMessages_Polls: Array<{
    chatId: string;
    pollTitle: string;
    selections: string[];
    pollParams: WhatsMsgPollOptions;
    moreOptions?: WhatsMsgSenderSendingOptionsMINIMUM;
  }> = [];

  /**
   * Simulates sending a poll message to a chat.
   *
   * @param chatId - The chat ID (individual or group).
   * @param pollTitle - The poll question/title.
   * @param selections - Array of poll options (1-12 items).
   * @param pollParams - Poll-specific options (e.g., multi-select, normalization).
   * @param moreOptions - Additional sending options.
   * @returns A mock `WhatsappMessage` simulating successful sending.
   *
   * @remarks
   * - Stores the sent details in `SentMessages_Polls` for test verification.
   * - Does not validate selection count or normalization in this mock.
   *
   * @example
   * ```ts
   * await mockSender.Poll("1234567890", "Favorite color?", ["Red", "Blue"], { withMultiSelect: false });
   * expect(mockSender.SentMessages_Polls[0].selections).toEqual(["Red", "Blue"]);
   * ```
   */
  @autobind
  public async Poll(
    chatId: string,
    pollTitle: string,
    selections: string[],
    pollParams: WhatsMsgPollOptions,
    moreOptions?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WAMessage | null> {
    this.SentMessages_Polls.push({ chatId, moreOptions, pollParams, pollTitle, selections });
    return CreateSuccessWhatsMsg(null, NormalizeChatId(chatId));
  }

  /**
   * Array storing details of simulated location messages sent via `Location()`.
   *
   * @type {Array<{ chatId: string; ubicationParams: WhatsMsgUbicationOptions; options?: WhatsMsgSenderSendingOptionsMINIMUM }>}
   */
  public SentMessages_Locations: Array<{
    chatId: string;
    ubicationParams: WhatsMsgUbicationOptions;
    options?: WhatsMsgSenderSendingOptionsMINIMUM;
  }> = [];

  /**
   * Simulates sending a location message to a chat.
   *
   * @param chatId - The chat ID (individual or group).
   * @param ubicationParams - Location parameters (e.g., latitude, longitude, name).
   * @param options - Optional sending options.
   * @returns A mock `WhatsappMessage` simulating successful sending.
   *
   * @remarks
   * - Stores the sent details in `SentMessages_Locations` for test verification.
   * - Does not validate coordinates in this mock.
   *
   * @example
   * ```ts
   * const locParams = { degreesLatitude: 40.7128, degreesLongitude: -74.0060, name: "NYC" };
   * await mockSender.Location("1234567890", locParams);
   * expect(mockSender.SentMessages_Locations[0].ubicationParams.degreesLatitude).toBe(40.7128);
   * ```
   */
  @autobind
  public async Location(chatId: string, ubicationParams: WhatsMsgUbicationOptions, options?: WhatsMsgSenderSendingOptionsMINIMUM): Promise<WAMessage | null> {
    this.SentMessages_Locations.push({ chatId, ubicationParams, options });
    return CreateSuccessWhatsMsg(null, NormalizeChatId(chatId));
  }

  /**
   * Array storing details of simulated contact messages sent via `Contact()`.
   *
   * @type {Array<{ chatId: string; contacts: { name: string; phone: string } | Array<{ name: string; phone: string }>; options?: WhatsMsgSenderSendingOptionsMINIMUM }>}
   */
  public SentMessages_Contacts: Array<{
    chatId: string;
    contacts: { name: string; phone: string } | Array<{ name: string; phone: string }>;
    options?: WhatsMsgSenderSendingOptionsMINIMUM;
  }> = [];
  @autobind
  /**
   * Simulates sending a contact (or contacts) message to a chat.
   *
   * @param chatId - The chat ID (individual or group).
   * @param contacts - Single contact or array of contacts (name and phone required).
   * @param options - Optional sending options.
   * @returns A mock `WhatsappMessage` simulating successful sending.
   *
   * @remarks
   * - Stores the sent details in `SentMessages_Contacts` for test verification.
   * - Does not generate vCards or validate contacts in this mock.
   *
   * @example
   * ```ts
   * const contact = { name: "John Doe", phone: "1234567890" };
   * await mockSender.Contact("1234567890", contact);
   * expect(mockSender.SentMessages_Contacts[0].contacts).toEqual(contact);
   * ```
   */
  public async Contact(
    chatId: string,
    contacts: { name: string; phone: string } | Array<{ name: string; phone: string }>,
    options?: WhatsMsgSenderSendingOptionsMINIMUM
  ): Promise<WAMessage | null> {
    this.SentMessages_Contacts.push({ chatId, contacts, options });
    return CreateSuccessWhatsMsg(null, NormalizeChatId(chatId));
  }
  //===========================================================================================================================
  /**
   * Clears all stored mock message arrays, resetting the mocking suite for new tests.
   *
   * @remarks
   * - Call this in `afterEach` hooks to prevent test pollution.
   *
   * @example
   * ```ts
   * afterEach(() => {
   *   mockSender.ClearMocks();
   * });
   * ```
   */
  public ClearMocks(): void {
    this.SentMessages_Texts = [];
    this.SentMessages_Imgs = [];
    this.SentMessages_ReactedEmojis = [];
    this.SentMessages_Stickers = [];
    this.SentMessages_Audios = [];
    this.SentMessages_Videos = [];
    this.SentMessages_Documents = [];
    this.SentMessages_Polls = [];
    this.SentMessages_Locations = [];
    this.SentMessages_Contacts = [];
  }

  // =============== to add =====================
}

/**
 * Creates a mock `WhatsappMessage` simulating a successful message send.
 *
 * @param participantId - Optional participant ID for the message key.
 * @param chatId - The chat ID for the remote JID.
 * @returns A basic `WhatsappMessage` object with a mock key.
 *
 * @remarks
 * - Used internally by all mocking methods to return consistent success responses.
 * - TODO: Enhance to create type-specific mock messages.
 *
 * @internal
 */
function CreateSuccessWhatsMsg(participantId: string | null, chatId: string): WhatsappMessage {
  const toReturn: WhatsappMessage = {
    key: {
      fromMe: false,
      id: "success_id_message_id",
      participant: participantId ?? undefined,
      remoteJid: chatId,
    },
  };
  return toReturn;
}

function NormalizeChatId(rawChatId: string): string {
  if (rawChatId.endsWith(WhatsappIndividualIdentifier)) return rawChatId;
  if (rawChatId.endsWith(WhatsappGroupIdentifier)) {
    return rawChatId;
  } else {
    return rawChatId + WhatsappGroupIdentifier;
  }
}
