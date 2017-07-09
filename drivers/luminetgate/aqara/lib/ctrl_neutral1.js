/**
 * Created by zhuqizhong on 17-4-19.
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
    'click':1,
    'light':2,
}
class Ctrl_neutral1 extends Subdevice {
    constructor (opts) {
        super({ sid: opts.sid, sendData:opts.sendData,type: '86ctrl_neutral' });

        this.timeHandle = null;

    }

    _handleState (state,cmd) {
        super._handleState(state,cmd)

        if (typeof state.channel_0 === 'undefined')
            return; // might be no_close

        switch (state.channel_0) {
            case 'click':
                if(this.timeHandle){
                    clearTimeout(this.timeHandle)
                }
                this.wqs[SWITCH_WQ.click] = true;
                this.emit('wqChanged',SWITCH_WQ.click,cmd);
                this.timeHandle = setTimeout(function(){
                    this.wqs[SWITCH_WQ.click] = false;
                    this.emit('wqChanged',SWITCH_WQ.click,cmd);
                }.bind(this),200);
                break;
            case 'on':

                this.wqs[SWITCH_WQ.light] = true;
                this.emit('wqChanged',SWITCH_WQ.light,cmd);

                break;
            case 'off':
                this.wqs[SWITCH_WQ.light] = false;
                this.emit('wqChanged',SWITCH_WQ.light,cmd);

                break;

        }
    }
    writeWQ(wq,value){
        if(parseInt(wq) == SWITCH_WQ.light){
            if(value){
                this.sendDataToDev('channel_0','"on"',{sid:this.getSid(),model:'ctrl_neutral'});
            }else{
                this.sendDataToDev('channel_0','"off"',{sid:this.getSid(),model:'ctrl_neutral'});
            }
        }

    }

}

module.exports = Ctrl_neutral1;
