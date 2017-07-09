/**
 * Created by zhuqizhong on 17-4-20.
 */

const Subdevice = require('./subdevice');
/**
 * ep /wq 定义
 * 1  click
 * 2 pressed /state
 *
 * 60011 battery status
 * 60010 double click
 */
const SWITCH_WQ ={
    'left':1,
    'ldbclick':60010,


}
class Sw86_1 extends Subdevice {
    constructor (opts) {
        super({ sid: opts.sid, sendData:opts.sendData,type: '86sw1' });

        this.timeHandle = [];


    }

    _handleState (state,cmd) {
        super._handleState(state);
        switch (state.channel_0) {
            case 'click':
                if(this.timeHandle[SWITCH_WQ.left]){
                    clearTimeout(this.timeHandle[SWITCH_WQ.left])
                }
                this.wqs[SWITCH_WQ.left] = true;
                this.emit('wqChanged',SWITCH_WQ.left,cmd);
                this.timeHandle[SWITCH_WQ.left] = setTimeout(function(){
                    this.wqs[SWITCH_WQ.left]= false;
                    this.emit('wqChanged',SWITCH_WQ.left,cmd);
                }.bind(this),200);
                break;
            case 'double_click':
                if(this.timeHandle[SWITCH_WQ.ldbclick]){
                    clearTimeout(this.timeHandle[SWITCH_WQ.ldbclick])
                }
                this.wqs[SWITCH_WQ.ldbclick] = true;
                this.emit('wqChanged',SWITCH_WQ.ldbclick,cmd);
                this.timeHandle[SWITCH_WQ.ldbclick] = setTimeout(function(){
                    this.wqs[SWITCH_WQ.ldbclick]= false;
                    this.emit('wqChanged',SWITCH_WQ.ldbclick,cmd);
                }.bind(this),200);
                break;
        }

    }


}

module.exports = Sw86_1;
