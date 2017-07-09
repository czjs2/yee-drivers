const events = require('events')

const {SUBDEVICE_MIN_VOLT, SUBDEVICE_MAX_VOLT} = require('../constants')
const BATTERY = 50001;
const BATTERY_PERCENT = 50002;
class Subdevice extends events.EventEmitter {
  constructor (opts) {
    super(opts)

    this._sid = opts.sid;
    this._type = opts.type;
    this.sendData = opts.sendData;
    this.queryData = opts.queryData;
    this._voltage = null;
    this.wqs = {};
    this.wqs_target = {};


  }

  _handleState (state,cmd) {
    if (typeof state.voltage !== 'undefined') {
      this._voltage = state.voltage;
      this.wqs[BATTERY] = this._voltage;
      this.wqs[BATTERY_PERCENT] = this.getBatteryPercentage();
      this.emit('wqChanged',BATTERY,cmd);
        this.emit('wqChanged',BATTERY_PERCENT,cmd);
    }

      if(state.error){
          this.emit('writeError',this._sid);
      }
  }

  sendDataToDev(prop,value,opt){
    if(this.sendData){
      this.sendData(prop,value,opt);
    }else{
      console.error('cannot send');
    }
  }
  getSid () {
    return this._sid
  }

  getType () {
    return this._type
  }

  getBatteryVoltage () {
    return this._voltage
  }

  getBatteryPercentage () {
    return ((SUBDEVICE_MAX_VOLT - this._voltage) / (SUBDEVICE_MAX_VOLT - SUBDEVICE_MIN_VOLT)) * 100
  }

  writeWQ(wq,value){
    this.wqs_target[parseInt(wq)] = value;

  }
  readWQ(wq){
   // console.log('wq:'+wq+" value:"+this.wqs[wq]);
      return this.wqs[wq];
  }

    goToConfirm(wq){
        this.queryData(this._sid);
        return true;
    }

}

module.exports = Subdevice
