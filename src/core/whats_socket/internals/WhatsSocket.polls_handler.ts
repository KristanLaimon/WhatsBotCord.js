import Delegate from 'src/libs/Delegate';
import type { IWhatsSocket } from '../IWhatsSocket';

type WhatsVoteInfo = {
  Count: number;
  UserWhatsNickname: number;
  UserPhoneNumber: number;
}

type WhatsPollResult = {
  Option: string;
  Votes: WhatsVoteInfo[];
}

interface IWhatsPoll {
  onVoteUpdate: Delegate<(UserWhatsNickNameVoter: string, UserPhoneNumber: number /**who send that vote; which option */) => void>;

  /**constructor(pollStr:string) */

  GetActualResults(): Promise<WhatsPollResult[]>;

  ToSavableString(): string;
}

export default class WhatsPoll implements IWhatsPoll {
  onVoteUpdate: Delegate<(UserWhatsNickNameVoter: string, UserPhoneNumber: number /**who send that vote; which option */) => void> = new Delegate();

  private _socketByReference: IWhatsSocket;

  constructor(borrowedSocket: IWhatsSocket) {
    this._socketByReference = borrowedSocket;
    //TODO: Finish this class!
  }

  GetActualResults(): Promise<WhatsPollResult[]> {
    throw new Error('Method not implemented.');
  }
  ToSavableString(): string {
    throw new Error('Method not implemented.');
  }

}