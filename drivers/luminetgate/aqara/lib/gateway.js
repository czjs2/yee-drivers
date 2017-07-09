const crypto = require('crypto')
const events = require('events')

const {AQARA_IV, GATEWAY_HEARTBEAT_INTERVAL_MS, GATEWAY_HEARTBEAT_OFFLINE_RATIO} = require('../constants')
const Magnet = require('./magnet');
const Switch = require('./switch');
const FS = require('q-io/fs');
const _ = require('lodash')
const WQInfo={
  '_color':1,
  'intensity':2,
  'illumination':3,
  'music_id':4,
  'volumn':5,
  'music_switch':6

};
/**
 * gateway 的endpoint定义：
 *
 * ep1  灯光颜色
 * ep2  灯光亮度
 * ep3  光照度(输入）
 * ep2  播放/停止声音
 * ep3  音量
 * 
 */
class Gateway extends events.EventEmitter {
  constructor (opts) {
    super();

    const self = this;
    this._ip = opts.ip;
    this._sid = opts.sid;
    this._sendUnicast = opts.sendUnicast;
    this.evtMaster = opts.evtMaster;
    this._heartbeatWatchdog = null;
    this._rearmWatchdog();
    this.wqs_target = {};
    this._color = { r: 0, g: 0, b: 0 };

    this._subdevices = {};

    const payload = '{"cmd": "get_id_list"}';
    this._sendUnicast(payload);
    this.SubDevType= {};
    this.wqs = {'6':false};

    FS.list(__dirname).then(function(files){
      _.each(files,function(fileName){
        if(/[^.]*\.js$/.test(fileName) && fileName != 'gateway.js'){
            try{
                self.SubDevType[fileName.replace('.js','')] = require("./"+fileName);
            }catch(e){
                console.error(e);
            }

        }
      })
    }).catch(function(e){
        console.error(e);
    });

  }


  enumDevices(){
      const payload = '{"cmd": "get_id_list"}';
      this._sendUnicast(payload);
  }
  _rearmWatchdog () {
    if (this._heartbeatWatchdog) clearTimeout(this._heartbeatWatchdog)
    this._heartbeatWatchdog = setTimeout(() => {
      this.emit('offline')
    }, GATEWAY_HEARTBEAT_INTERVAL_MS * GATEWAY_HEARTBEAT_OFFLINE_RATIO)
  }

  triggerWq(devId,wq,cmd){
    const memories= {devId:devId,memories:{wq_map:[{start:wq,end:wq,len:1}]}};
    var device = this.getDevice(devId);

    this.emit("fireEvent",{devId:devId,wq:wq,value:device.readWQ(wq),cmd:cmd});
    this.evtMaster.emit('RegRead',memories);
  }

  sendQuery(devId){
      const payload = `{"cmd": "read", "sid": "${devId}"}`
      this._sendUnicast(payload)
  }
  _handleMessage (msg) {
    //console.log('messsage:',msg);
    let sid;
    let type;
    let state;
    switch (msg.cmd) {
      case 'get_id_list_ack':
        this._refreshKey(msg.token)

        const payload = `{"cmd": "read", "sid": "${this._sid}"}`
        this._sendUnicast(payload)
        // read subdevices
        for (const sid of JSON.parse(msg.data)) {
          const payload = `{"cmd": "read", "sid": "${sid}"}`
          this._sendUnicast(payload)
        }
        break;
      case 'read_ack':

        sid = msg.sid;
        type = msg.model || "ctrl_neutral2";
        state = JSON.parse(msg.data);

        if (sid === this._sid) { // self
          this._handleState(state,msg.cmd);

          this._ready = true;
          this.emit('ready')
        } else {
          let subdevice;
          if(!type){
            type = "ctrl_neutral2";
          }
          if(this.SubDevType[type] && !this._subdevices[msg.sid]){
            subdevice = new this.SubDevType[type]({sid,sendData:this.writeValueToDev.bind(this),queryData:this.sendQuery.bind(this)});
              this._subdevices[msg.sid]= subdevice;
              subdevice.on('wqChanged',function(wq,cmd){
                  this.triggerWq(msg.sid,wq,cmd);
              }.bind(this));
              subdevice.on('writeError',function(sid){
                  this.emit('writeError',sid)
              }.bind(this))
          }else{
            subdevice = this._subdevices[msg.sid];
          }

            if (subdevice) {

                subdevice._handleState(state,msg.cmd);
            }
          /*switch (type) {
            case 'magnet':
              subdevice = new Magnet({ sid });
              break;
            case 'switch':
              subdevice = new Switch({ sid });
              break;
            default:
              return false
          }*/


        }
        break;
      case 'heartbeat':
        if (msg.sid === this._sid) {
          this._refreshKey(msg.token);
          this._rearmWatchdog()
        }
        break;
      case 'report':
        case 'write_ack':
        state = JSON.parse(msg.data);
        if (msg.sid === this._sid){
            this._handleState(state,msg.cmd); // self
        }
        else {
          let subDevice = this._subdevices[msg.sid];
          if(subDevice)
            subDevice._handleState(state,msg.cmd);
        }
        break
    }

    return true;
  }

  _handleState (state,cmd) {
    if(state.error){
        this.emit('writeError',this._sid);
    }
    if(state.rgb !== undefined){
      const buf = Buffer.alloc(4);
      buf.writeUInt32BE(state.rgb, 0);
      this._color.r = buf.readUInt8(1);
      this._color.g = buf.readUInt8(2);
      this._color.b = buf.readUInt8(3);
      this._intensity = buf.readUInt8(0) // 0-100

      this.wqs[WQInfo._color] = {r:buf.readUInt8(1),g:buf.readUInt8(2),b:buf.readUInt8(3),alpha:buf.readUInt8(0)};
      this.wqs[WQInfo.intensity] = buf.readUInt8(0);
      //this.emit('lightState', { color: this._color, intensity: this._intensity })
      this.triggerWq(this._sid,WQInfo._color,this.wqs[WQInfo._color],cmd);
      this.triggerWq(this._sid,WQInfo.intensity,this.wqs[WQInfo.intensity],cmd);

    }


    if(state.illumination !== undefined){
      this.wqs[WQInfo.illumination] = parseFloat(state.illumination);
      this.triggerWq(this._sid,WQInfo.illumination,this.wqs[WQInfo.illumination],cmd);
    }

    if(state.mid !== undefined){
      if(parseInt(state.mid) === 10000){
        this.wqs[WQInfo.music_switch] = false;
          this.wqs[WQInfo.music_id] = 10000;
      }else{
        this.wqs[WQInfo.music_switch] = true;
        this.wqs[WQInfo.music_id] = state.mid;
      }
        this.triggerWq(this._sid,WQInfo.music_switch,this.wqs[WQInfo.music_switch],cmd);
        this.triggerWq(this._sid,WQInfo.music_id,this.wqs[WQInfo.music_id],cmd);
    }


  }

  _refreshKey (token) {
    try{
        if (token) this._token = token;
        if (!this._password || !this._token) return

        const cipher = crypto.createCipheriv('aes-128-cbc', this._password, AQARA_IV)
        this._key = cipher.update(this._token, 'ascii', 'hex')
        cipher.final('hex'); // useless
    }catch(e){
      console.error('error in setkey:',e);
    }

  }

  writeValueToDev(prop,value,opt){

    let gateway="gateway"
    const payload = `{"cmd": "write", "model": "${(opt && opt.model) || gateway}", "sid": "${(opt && opt.sid) || this._sid}", "short_id": 0, "data": "{\\"${prop}\\":${value}, \\"key\\": \\"${this._key}\\"}"}`
      console.log('payload:',payload);
    this._sendUnicast(payload);
  }
  _writeColor () {
    const buf = Buffer.alloc(4);
    var color = this.wqs[WQInfo._color] || {};
    var alpha = this.wqs[WQInfo.intensity] || 0;
    buf.writeUInt8(alpha, 0);
    buf.writeUInt8(color.r, 1);
    buf.writeUInt8(color.g, 2);
    buf.writeUInt8(color.b, 3);
    const value = buf.readUInt32BE(0);
    this.writeValueToDev('rgb',value);
  }

  get ip () { return this._ip }
  get sid () { return this._sid }
  get ready () { return this._ready }
  get subdevices() {return this._subdevices}
  get password () { return this._password }
  setPassword (password) {
    this._password = password;
    this._refreshKey();
  }

  get color () { return this._color }
  setColor (color) {
    if (!this._ready) return;

    this._color = color;
    this._writeColor()
  }

  get intensity () { return this._intensity }
  setIntensity (intensity) {
    if (!this._ready) return;

    this._intensity = intensity;
    this._writeColor()
  }
  getDevice(devId){
    if(this._sid === devId){
      return this;
    }else{
      return this._subdevices[devId];
    }
  }
  writeWQ(wq,value){
    switch (parseInt(wq)){
      case WQInfo._color:
        this.wqs_target[WQInfo._color] = this.wqs[WQInfo._color] || {};
        this.wqs_target[WQInfo._color]['r'] = value.r;
        this.wqs_target[WQInfo._color]['g'] = value.g;
        this.wqs_target[WQInfo._color]['b'] = value.b;
        this._writeColor();

            break;
      case WQInfo.intensity:
        this.wqs_target[WQInfo.intensity]= value;
        this.pending_write = [WQInfo.intensity];
        this._writeColor();
        break;

      case WQInfo.illumination:
          this.wqs_target[WQInfo.illumination] = value;
          this.pending_write = [WQInfo.illumination];
          this.writeValueToDev('illumination',value);
        break;
      case WQInfo.music_id:
        if(_.isString(value)){
          switch(value.toLowerCase()){
              case 'alarm':
                value = 1;
                break;
              case 'smoke':
                value = 2;
                break;
              default:
                value = 3;
                break;
          }
        }
        this.wqs_target[WQInfo.music_id] = value;
          if(this.wqs_target[WQInfo.music_switch]){
              this.pending_write = [WQInfo.music_id];
            this.writeValueToDev('mid',this.wqs_target[WQInfo.music_id]);
          }
          this.triggerWq(this._sid,WQInfo.music_id,value,'write_ack');
        break;
        case WQInfo.volumn:
            this.wqs_target[WQInfo.volumn] = value;
            if(this.wqs_target[WQInfo.volumn]){
                this.pending_write = [WQInfo.volumn];
                this.writeValueToDev('volumn',this.wqs_target[WQInfo.volumn]);
            }
            this.triggerWq(this._sid,WQInfo.volumn,value,'write_ack');
            break;
      case WQInfo.music_switch:
        this.wqs_target[WQInfo.music_switch] = value;
          if(value ){
              this.pending_write = [WQInfo.music_switch];
            this.writeValueToDev('mid',this.wqs_target[WQInfo.music_id]);
          }else{
              this.pending_write = [WQInfo.music_switch];
            this.writeValueToDev('mid',10000);
          }
          this.triggerWq(this._sid,WQInfo.music_switch,value,'write_ack');
            break;
    }
  }
  readWQ(wq){
    return this.wqs[wq];
  }

    goToConfirm(wq){
      return false;
    }

}

module.exports = Gateway;
