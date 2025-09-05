//TODO: Make test suite
/**
 * Bot.ts Suite testing
 * 1. [] Can be instantiable
 * 2. [] Are all options setted by default (non-undefined internal options check)
 * 3. [] Can register commands (normal and tags) without strange behavior
 *    3.1. [] What happens if 2 commands have the same name? (should throw error)
 *    3.2. [] What happens if 2 commands have same alias? (should throw error)
 * 6. [] Can run commands and tags
 *      [] Can differentiate tags and commands (if having a tag with same name like a command)
 *      [] Can run a command with their ALIAS ONLY
 *      [] Commands receives correct arguments from the bot
 *          [] For incoming quoted msg, should send argument successfully to command
 * 7. [] Unexpected exception: Should not break bot and console.log error instead serialized as json text
 * 8. [] Expected Error "Command rejection": Should not break and console log like info
 * 9. [] Expected Error "command not rejection" (by timeout): Should console.log gracefully
 * 10. [] Middlware system add correctly new middlewares
 *        [] If all middleware are success, should continue with internal command processing
 *        [] If middleware chain stopped, should NOT continue with internal command processing
 *  */

/**
 * Out of scope but: (WhatsSocket improve suite testing)
 * 1. [] Test if all whatssocket EVENTS works as expected (needs manual testing... ofc)
 *        (Already know it works by the whole +100 tests that uses it!)
 *        TESTEABLE     [X] onIncomingMsg: Delegate<(senderId: string | null, chatId: string, rawMsg: WhatsappMessage, msgType: MsgType, senderType: SenderType) => void>; *        [] onUpdateMsg: Delegate<(senderId: string | null, chatId: string, rawMsgUpdate: WhatsappMessage, msgType: MsgType, senderType: SenderType) => void>;
 *        TESTEABLE     [] onSentMessage: Delegate<(chatId: string, rawContentMsg: AnyMessageContent, optionalMisc?: MiscMessageGenerationOptions) => void>;
 *        TESTEABLE     [] onRestart: Delegate<() => Promise<void>>;
 *        MANUAL TEST   [] onGroupEnter: Delegate<(groupInfo: GroupMetadata) => void>;
 *        MANUAL TEST[] onGroupUpdate: Delegate<(groupInfo: Partial<GroupMetadata>) => void>;
 *        TESTEABLE [] onStartupAllGroupsIn: Delegate<(allGroupsIn: GroupMetadata[]) => void>;
 */
