const Subdevice = require('./subdevice')
/**
 * ep /wq 定义
 * 1  click
 * 2 pressed /state
 *
 * 60011 battery status
 * 60010 double click
 */
const SWITCH_WQ ={
  'click':1,
  'press':2,
  'dbclick':60010,
  'battery':60011
}
class Switch extends Subdevice {
  constructor (opts) {
    super({ sid: opts.sid, sendData:opts.sendData,type: 'switch' });
      this.wqs[SWITCH_WQ.battery] = 0;
      this.timeHandle = null;
      this.dbTimeHandle = null;
  }

  _handleState (state,cmd) {
    super._handleState(state,cmd)

    if (typeof state.status === 'undefined') return // might be no_close

    switch (state.status) {
      case 'click':
        if(this.timeHandle){
          clearTimeout(this.timeHandle)
        }
        this.wqs[SWITCH_WQ.click] = true;
        this.emit('wqChanged',SWITCH_WQ.click,cmd);
        this.timeHandle = setTimeout(function(){
            this.wqs[SWITCH_WQ.click] = false;
            this.emit('wqChanged',SWITCH_WQ.click,cmd);
        }.bind(this),100);
        break;
      case 'double_click':
          if(this.dbTimeHandle){
              clearTimeout(this.dbTimeHandle)
          }
          this.wqs[SWITCH_WQ.dbclick] = true;
          this.emit('wqChanged',SWITCH_WQ.dbclick,cmd);
          this.dbTimeHandle = setTimeout(function(){
              this.wqs[SWITCH_WQ.dbclick] = false;
              this.emit('wqChanged',SWITCH_WQ.dbclick,cmd);
          }.bind(this),100);
        break;
      case 'long_click_press':
          this.wqs[SWITCH_WQ.press] = true;
          this.emit('wqChanged',SWITCH_WQ.press,cmd);
        break;
      case 'long_click_release':
          this.wqs[SWITCH_WQ.press] = false;
          this.emit('wqChanged',SWITCH_WQ.press,cmd);
        break;
    }
  }

}

module.exports = Switch
