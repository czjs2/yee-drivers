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
    'channel0':1,
    'channel1':2,
}
class Ctrl_neutral2 extends Subdevice {
    constructor (opts) {
         opts.type = '86ctrl_neutral2'
        super(opts);

        this.timeHandle = null;

    }

    _handleState (state,cmd) {
        super._handleState(state,cmd)


        switch (state.channel_0) {

            case 'on':

                this.wqs[SWITCH_WQ.channel0] = true;
                this.emit('wqChanged',SWITCH_WQ.channel0,cmd);

                break;
            case 'off':
                this.wqs[SWITCH_WQ.channel0] = false;
                this.emit('wqChanged',SWITCH_WQ.channel0,cmd);

                break;

        }
        switch (state.channel_1) {
            case 'on':

                this.wqs[SWITCH_WQ.channel1] = true;
                this.emit('wqChanged',SWITCH_WQ.channel1,cmd);

                break;
            case 'off':
                this.wqs[SWITCH_WQ.channel1] = false;
                this.emit('wqChanged',SWITCH_WQ.channel1,cmd);

                break;

        }
    }
    writeWQ(wq,value){
        if(parseInt(wq) === SWITCH_WQ.channel0){
            if(value){
                this.sendDataToDev('channel_0','"on"',{sid:this.getSid(),model:'ctrl_neutral2'});
            }else{
                this.sendDataToDev('channel_0','"off"',{sid:this.getSid(),model:'ctrl_neutral2'});
            }
        }else if(parseInt(wq) === SWITCH_WQ.channel1){
            if(value){
                this.sendDataToDev('channel_1','"on"',{sid:this.getSid(),model:'ctrl_neutral2'});
            }else{
                this.sendDataToDev('channel_1','"off"',{sid:this.getSid(),model:'ctrl_neutral2'});
            }
        }

    }

}

module.exports = Ctrl_neutral2
