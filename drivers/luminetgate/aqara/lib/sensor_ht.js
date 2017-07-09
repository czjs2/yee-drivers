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
    'temperature':1,
    'humidity':2,
}
class Sensor_ht extends Subdevice {
    constructor (opts) {
        super({ sid: opts.sid, type: 'Sensor_ht' });

        this.timeHandle = null;

    }

    _handleState (state,cmd) {
        super._handleState(state,cmd)


        if(state.temperature !== undefined){
            this.wqs[SWITCH_WQ.temperature] = parseInt(state.temperature)/100;
            this.emit('wqChanged',SWITCH_WQ.temperature,cmd);
        }
        if(state.humidity !== undefined){
            this.wqs[SWITCH_WQ.humidity] = parseInt(state.humidity)/100;
            this.emit('wqChanged',SWITCH_WQ.humidity,cmd);
        }
    }


}

module.exports = Sensor_ht;
