import Delegate from 'src/libs/Delegate';
import type { IWhatsSocket } from '../IWhatsSocket';
import type { proto, WAMessage } from "baileys";
import { getAggregateVotesInPollMessage } from "baileys";
import type { MsgType, SenderType } from 'src/Msg.types';



type WhatsPollResult = {
  Option: string;
  UsersVotesIds: string[];
}

interface IWhatsPoll {
  isListeningForUpdates: boolean;
  onVoteUpdate: Delegate<(OptionText: string, UserWhatsNickNameVoter: string, User_ID: string /**who send that vote; which option */) => void>;
  /**constructor(borrowedSocket: IWhatsSocket, pollInfo: WhatsPollParamsInfo | pollStrData:string) */
  GetActualResults(): Promise<WhatsPollResult[]>;
  ToSavableString(): string;
}

type WhatsPollParamsInfo = {
  pollRawMsg: WAMessage;
  titleHeader: string;
  pollOptions: string[];
  withMultiSelect: boolean;
}
// type PollUpdateMemory = {
//   pollUpdateMessageKey: proto.IMessageKey;
//   vote: proto.Message.IPollUpdateMessage;
// }

export default class WhatsPoll implements IWhatsPoll {
  public onVoteUpdate: Delegate<(OptionTxt: string, UserWhatsNickNameVoter: string, User_ID: string /**who send that vote; which option */) => void> = new Delegate();
  public isListeningForUpdates: boolean = true;
  private _borrowedSocket: IWhatsSocket;
  private _pollInfo: WhatsPollParamsInfo;
  private _pollUpdates: proto.Message.IPollUpdateMessage[] = []; //Storing poll updates in memory

  constructor(borrowedSocket: IWhatsSocket, pollInfo: WhatsPollParamsInfo) {
    this._borrowedSocket = borrowedSocket;
    this._pollInfo = pollInfo;
    this._onMessageUpsertSubcriber = this._onMessageUpsertSubcriber.bind(this);
    this.StopListeningFromPoll = this.StopListeningFromPoll.bind(this);
    this._borrowedSocket.onMessageUpsert.Subscribe(this._onMessageUpsertSubcriber);
  }

  public StopListeningFromPoll(): void {
    this._borrowedSocket.onMessageUpsert.Unsubsribe(this._onMessageUpsertSubcriber);
    this.isListeningForUpdates = false;
  }

  public async GetActualResults(): Promise<WhatsPollResult[]> {
    try {
      if (!this._pollInfo.pollRawMsg.message) {
        console.error('Poll creation message content is missing');
        return [];
      }

      const pollVotes = await getAggregateVotesInPollMessage({
        message: this._pollInfo.pollRawMsg.message,
        pollUpdates: this._pollUpdates as any,
      });
      // const results: WhatsPollResult[] = pollVotes.map((vote): WhatsPollResult => ({
      //   Option: vote.name,
      //   // UsersVotesIds
      // }),
      const results: WhatsPollResult[] = pollVotes.map((vote): WhatsPollResult => {
        return {
          Option: vote.name,
          UsersVotesIds: vote.voters
        }
      })
      return results;
    } catch (error) {
      console.error('Error fetching poll results:', error);
      return [];
    }
  }
  public ToSavableString(): string {
    throw new Error('Method not implemented.');
  }

  private async _onMessageUpsertSubcriber(_senderId: string | null, _chatId: string, rawUpdateMsg: WAMessage, _msgType: MsgType, _senderType: SenderType) {
    //Not a poll update? Abort
    if (!rawUpdateMsg.message?.pollUpdateMessage) return;
    //They're not from the same chat? Abort
    if ((rawUpdateMsg.key.remoteJid ?? "") !== (this._pollInfo.pollRawMsg.key.remoteJid ?? "")) return;
    //Doesn't have basic poll info (why would that happen?)? Abort
    if (!rawUpdateMsg.message.pollUpdateMessage.pollCreationMessageKey) return;

    if (rawUpdateMsg.message.pollUpdateMessage.pollCreationMessageKey?.id === this._pollInfo.pollRawMsg.key.id) {
      this._pollUpdates.push(rawUpdateMsg.message.pollUpdateMessage);
      await this._thisPollUpdate(rawUpdateMsg);
    }
  }

  private async _thisPollUpdate(pollMsg: WAMessage): Promise<void> {
    try {
      const pollUpdate = {
        pollUpdateMessageKey: pollMsg.message!.pollUpdateMessage!.pollCreationMessageKey,
        vote: pollMsg.message!.pollUpdateMessage, // Will be decrypted by getAggregateVotesInPollMessage
      };

      const pollVotes = await getAggregateVotesInPollMessage({
        message: this._pollInfo.pollRawMsg.message,
        pollUpdates: [pollUpdate as any], // Temporary cast to bypass type issue
      });

      for (const vote of pollVotes) {
        const option = vote.name;
        const voters = vote.voters;
        for (const voterJid of voters) {
          const nickname = pollMsg.pushName ?? "===NONICKNAME===";
          this.onVoteUpdate.CallAll(option, nickname, voterJid);
        }
      }
    } catch (error) {
      console.log("Error processing poll update: " + error);
    }
  }
}
