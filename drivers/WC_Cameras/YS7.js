/**
 * Created by zhuqizhong on 17-5-18.
 */
const EventEmitter = require( 'events')
class YS7 extends EventEmitter{

    constructor(options){
        super();
        this.options = options || {};
        if(options ){
            setTimeout(function(){
                if(options.ld)
                    this.emit('wqChanged',3);
                if(options.deviceSerial){
                    this.emit('wqChanged',10);
                }
                if(options.cameraNo){
                    this.emit('wqChanged',11);
                }
            }.bind(this),1000)
        };

    }

    readOneWq(regNo){
        if(parseInt(regNo) === 3){
            return (this.options && this.options.ld);
        }
    }

    setOpt(devSpecOpt){
        this.options.ld = devSpecOpt.ld;
        this.emit('wqChanged',3);
    }
    release(){
        this.removeAllListeners('wqChanged');
    }
};
module.exports = YS7;