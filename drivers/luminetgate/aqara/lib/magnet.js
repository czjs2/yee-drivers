const Subdevice = require('./subdevice')
/**
 * WQ/ep
 * 1 门磁状态
 */
const MagWQ = {
  "state":1
};
class Magnet extends Subdevice {
  constructor (opts) {
    super({ sid: opts.sid, sendData:opts.sendData,type: 'magnet' })

    this._open = null
  }

  _handleState (state,cmd) {
    super._handleState(state,cmd);

    if (typeof state.status === 'undefined') return; // might be no_close

    this._open = state.status === 'open';

    this.wqs[MagWQ.state] = (state.status === 'open'?true:false);
      this.emit('wqChanged',MagWQ.state,cmd);
  }

  isOpen () {
    return this._open
  }
}

module.exports = Magnet;
