import Delegate from 'src/libs/Delegate';
import type { IWhatsSocket } from '../IWhatsSocket';
import type { proto, WAMessage } from 'baileys';
import { getAggregateVotesInPollMessage } from 'baileys';
import type { MsgType, SenderType } from 'src/Msg.types';

type WhatsPollResult = {
  Option: string;
  UsersVotesIds: string[];
};

interface IWhatsPoll {
  isListeningForUpdates: boolean;
  onVoteUpdate: Delegate<(OptionText: string, UserWhatsNickNameVoter: string, User_ID: string) => void>;
  GetActualResults(): Promise<WhatsPollResult[]>;
  ToSavableString(): string;
}

type WhatsPollParamsInfo = {
  pollRawMsg: WAMessage;
  titleHeader: string;
  pollOptions: string[];
  withMultiSelect: boolean;
};

export default class WhatsPoll implements IWhatsPoll {
  public onVoteUpdate: Delegate<(OptionText: string, UserWhatsNickNameVoter: string, User_ID: string) => void> = new Delegate();
  public isListeningForUpdates: boolean = true;
  private _borrowedSocket: IWhatsSocket;
  private _pollInfo: WhatsPollParamsInfo;
  private _pollUpdates: proto.Message.IPollUpdateMessage[] = [];

  constructor(borrowedSocket: IWhatsSocket, pollInfo: WhatsPollParamsInfo) {
    this._borrowedSocket = borrowedSocket;
    this._pollInfo = pollInfo;
    this._onMessageUpsertSubcriber = this._onMessageUpsertSubcriber.bind(this);
    this.StopListeningFromPoll = this.StopListeningFromPoll.bind(this);
    this._borrowedSocket.onMessageUpsert.Subscribe(this._onMessageUpsertSubcriber);
  }

  public StopListeningFromPoll(): void {
    this._borrowedSocket.onMessageUpsert.Unsubscribe(this._onMessageUpsertSubcriber);
    this.isListeningForUpdates = false;
  }

  public async GetActualResults(): Promise<WhatsPollResult[]> {
    try {
      if (!this._pollInfo.pollRawMsg.message) {
        console.error('Poll creation message content is missing');
        return [];
      }

      // Log the poll creation message to verify its structure
      console.log('Poll Creation Message:', JSON.stringify(this._pollInfo.pollRawMsg.message, null, 2));

      const pollVotes = await getAggregateVotesInPollMessage({
        message: this._pollInfo.pollRawMsg.message,
        pollUpdates: this._pollUpdates,
      });

      // Log the aggregated votes for debugging
      console.log('Aggregated Votes:', JSON.stringify(pollVotes, null, 2));

      const results: WhatsPollResult[] = pollVotes.map((vote): WhatsPollResult => ({
        Option: vote.name,
        UsersVotesIds: vote.voters,
      }));

      return results;
    } catch (error) {
      console.error('Error fetching poll results:', error);
      return [];
    }
  }

  public ToSavableString(): string {
    try {
      return JSON.stringify({
        pollId: this._pollInfo.pollRawMsg.key.id,
        chatId: this._pollInfo.pollRawMsg.key.remoteJid,
        titleHeader: this._pollInfo.titleHeader,
        pollOptions: this._pollInfo.pollOptions,
        withMultiSelect: this._pollInfo.withMultiSelect,
      });
    } catch (error) {
      console.error('Error serializing poll:', error);
      return '';
    }
  }

  private async _onMessageUpsertSubcriber(_senderId: string | null, _chatId: string, rawUpdateMsg: WAMessage, _msgType: MsgType, _senderType: SenderType) {
    if (!rawUpdateMsg.message?.pollUpdateMessage) return;
    if ((rawUpdateMsg.key.remoteJid ?? '') !== (this._pollInfo.pollRawMsg.key.remoteJid ?? '')) return;
    if (!rawUpdateMsg.message.pollUpdateMessage.pollCreationMessageKey) return;

    if (rawUpdateMsg.message.pollUpdateMessage.pollCreationMessageKey.id === this._pollInfo.pollRawMsg.key.id) {
      this._pollUpdates.push(rawUpdateMsg.message.pollUpdateMessage);
      await this._thisPollUpdate(rawUpdateMsg);
    }
  }

  private async _thisPollUpdate(pollMsg: WAMessage): Promise<void> {
    try {
      const pollVotes = await getAggregateVotesInPollMessage({
        message: this._pollInfo.pollRawMsg.message,
        pollUpdates: this._pollUpdates,
      });

      for (const vote of pollVotes) {
        const option = vote.name;
        const voters = vote.voters;
        for (const voterJid of voters) {
          const nickname = pollMsg.pushName ?? '===NONICKNAME===';
          this.onVoteUpdate.CallAll(option, nickname, voterJid);
        }
      }
    } catch (error) {
      console.error('Error processing poll update:', error);
    }
  }
}