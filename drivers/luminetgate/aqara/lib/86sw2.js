/**
 * Created by zhuqizhong on 17-4-20.
 */

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
    'left':1,
    'right':2,
    'bclick':3,
    'ldbclick':60010,
    'rdbclick':60011,

}
class Sw86_2 extends Subdevice {
    constructor (opts) {
        super({ sid: opts.sid, sendData:opts.sendData,type: '86sw2' });

        this.timeHandle = [];


    }

    _handleState (state,cmd) {
        super._handleState(state,cmd)



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
        switch (state.channel_1) {
            case 'click':
                if(this.timeHandle[SWITCH_WQ.right]){
                    clearTimeout(this.timeHandle[SWITCH_WQ.right])
                }
                this.wqs[SWITCH_WQ.right] = true;
                this.emit('wqChanged',SWITCH_WQ.right,cmd);
                this.timeHandle[SWITCH_WQ.right] = setTimeout(function(){
                    this.wqs[SWITCH_WQ.right]= false;
                    this.emit('wqChanged',SWITCH_WQ.right,cmd);
                }.bind(this),200);
                break;
            case 'double_click':

                if(this.timeHandle[SWITCH_WQ.rdbclick]){
                    clearTimeout(this.timeHandle[SWITCH_WQ.rdbclick])
                }
                this.wqs[SWITCH_WQ.rdbclick] = true;
                this.emit('wqChanged',SWITCH_WQ.rdbclick,cmd);
                this.timeHandle[SWITCH_WQ.rdbclick] = setTimeout(function(){
                    this.wqs[SWITCH_WQ.rdbclick]= false;
                    this.emit('wqChanged',SWITCH_WQ.rdbclick,cmd);
                }.bind(this),200);
                break;

        }
        switch (state.dual_channel) {
            case 'both_click':
                if(this.timeHandle[SWITCH_WQ.bclick]){
                    clearTimeout(this.timeHandle[SWITCH_WQ.bclick])
                }
                this.wqs[SWITCH_WQ.bclick] = true;
                this.emit('wqChanged',SWITCH_WQ.bclick,cmd);
                this.timeHandle[SWITCH_WQ.bclick] = setTimeout(function(){
                    this.wqs[SWITCH_WQ.bclick]= false;
                    this.emit('wqChanged',SWITCH_WQ.bclick,cmd);
                }.bind(this),200);
                break;
        }
    }


}

module.exports = Sw86_2;
