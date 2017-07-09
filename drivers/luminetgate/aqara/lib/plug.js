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
const SWITCH_PLUG ={
    'status':1,
    'voltage':2,
    'power':3,
    'consumed':4

}
class Plug extends Subdevice {
    constructor (opts) {
        super({ sid: opts.sid, sendData:opts.sendData,type: 'plug' });

        this.timeHandle = [];


    }

    _handleState (state,cmd) {
        super._handleState(state,cmd);


        switch (state.status) {
            case 'on':
                this.wqs[SWITCH_PLUG.status]= true;
                this.emit('wqChanged',SWITCH_PLUG.status,cmd);
                break;
            case 'off':
                this.wqs[SWITCH_PLUG.status]= false;
                this.emit('wqChanged',SWITCH_PLUG.status,cmd);
                break;
        }

        if(state.load_voltage !== undefined){
            this.wqs[SWITCH_PLUG.voltage]= state.load_voltage/1000;
            this.emit('wqChanged',SWITCH_PLUG.voltage,cmd);
        }
        if(state.load_power !== undefined){
            this.wqs[SWITCH_PLUG.power]= state.load_power;
            this.emit('wqChanged',SWITCH_PLUG.power,cmd);
        }
        if(state.power_consumed !== undefined){
            this.wqs[SWITCH_PLUG.consumed]= state.load_power;
            this.emit('wqChanged',SWITCH_PLUG.consumed,cmd);
        }


    }
    writeWQ(wq,value){
        if(parseInt(wq) == SWITCH_PLUG.status){
            if(value){
                this.sendDataToDev('status',`"on"`,{sid:this.getSid(),model:'plug'});
            }else{
                this.sendDataToDev('status',`"off"`,{sid:this.getSid(),model:'plug'});
            }
        }

    }


}

module.exports = Plug;
