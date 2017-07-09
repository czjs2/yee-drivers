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
    super({ sid: opts.sid,sendData:opts.sendData, type: 'motion' })

    this._open = null
      this.timeHandle = {};
  }

  _handleState (state,cmd) {
    super._handleState(state,cmd);



   if(state.status === 'motion'){
       if(this.timeHandle[MagWQ.state]){
           clearTimeout(this.timeHandle[MagWQ.state])
       }
       this.wqs[MagWQ.state] = true;
       this.emit('wqChanged',MagWQ.state,cmd);
       this.timeHandle[MagWQ.state] = setTimeout(function(){
           this.wqs[MagWQ.state]= false;
           this.emit('wqChanged',MagWQ.state,cmd);
       }.bind(this),61000);
   }
  }

  isOpen () {
    return this._open
  }
}

module.exports = Magnet;
