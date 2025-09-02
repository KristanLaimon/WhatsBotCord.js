// import type { IWhatsSocket } from '../whats_socket/IWhatsSocket';

import type { IWhatsSocket } from "../whats_socket/IWhatsSocket";
import WhatsSocket from "../whats_socket/WhatsSocket";

export default class Bot {

  private _socket!: IWhatsSocket;

  constructor() {
    //Dummy code!
    this._socket = new WhatsSocket();
    this._socket.Start();
  }

  // private _commandSearcher: PENDING
}