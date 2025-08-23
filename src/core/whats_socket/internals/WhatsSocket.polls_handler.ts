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

    // Normalize the original poll message right away
    this._pollInfo.pollRawMsg.message = this._normalizePollMessage(this._pollInfo.pollRawMsg.message);

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
        console.error("Original poll message is null or undefined.");
        return [];
      }

      const pollVotes = await getAggregateVotesInPollMessage({
        message: this._pollInfo.pollRawMsg.message,
        //@ts-ignore
        pollUpdates: this._pollUpdates,
      }, this._borrowedSocket.ownJID);

      return pollVotes.map(vote => ({
        Option: vote.name,
        UsersVotesIds: vote.voters,
      }));
    } catch (err) {
      console.error("Error fetching poll results:", err);
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

    // Use an improved log for better debugging
    console.log("Incoming poll update message: ", JSON.stringify(rawUpdateMsg, null, 2));

    if (rawUpdateMsg.message.pollUpdateMessage.pollCreationMessageKey.id === this._pollInfo.pollRawMsg.key.id) {
      this._pollUpdates.push(rawUpdateMsg.message.pollUpdateMessage);
      await this._thisPollUpdate(rawUpdateMsg);
    }
  }

  private async _thisPollUpdate(pollMsg: WAMessage): Promise<void> {
    try {
      const pollVotes = await getAggregateVotesInPollMessage({
        message: this._pollInfo.pollRawMsg.message,
        //@ts-ignore
        pollUpdates: this._pollUpdates,
      }, this._borrowedSocket.ownJID);

      // Find the new updates
      const previousVotes = this._pollUpdates.length > 1 ? await getAggregateVotesInPollMessage({
        message: this._pollInfo.pollRawMsg.message,
        //@ts-ignore
        pollUpdates: this._pollUpdates.slice(0, -1),
      }, this._borrowedSocket.ownJID) : [];

      for (const vote of pollVotes) {
        const option = vote.name;
        const voters = vote.voters;
        const previousVoters = previousVotes.find(v => v.name === option)?.voters || [];

        // Get new voters by comparing the current voters with the previous ones
        const newVoters = voters.filter(voter => !previousVoters.includes(voter));

        for (const voterJid of newVoters) {
          const nickname = pollMsg.pushName ?? '===NONICKNAME===';
          this.onVoteUpdate.CallAll(option, nickname, voterJid);
        }
      }
    } catch (error) {
      console.error('Error processing poll update:', error);
    }
  }

  // New private method to handle different poll message formats
  private _normalizePollMessage(msg: proto.IMessage | undefined | null): proto.IMessage | undefined | null {
    if (!msg) return msg;

    if (msg.pollCreationMessageV3) {
      return {
        ...msg,
        pollCreationMessage: {
          name: msg.pollCreationMessageV3.name,
          selectableOptionsCount: msg.pollCreationMessageV3.selectableOptionsCount,
          options: msg.pollCreationMessageV3.options?.map(o => ({
            optionName: o.optionName // The structure of optionName is a string, not an object
          })),
        },
        pollCreationMessageV3: undefined // Clear the V3 field to avoid conflicts
      } as proto.IMessage;
    }

    return msg;
  }
}