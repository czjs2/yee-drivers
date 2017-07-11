const dgram = require('dgram')
const os = require('os')
const events = require('events');
const _ = require('lodash');
const consts = require('../../../consts')
const {MULTICAST_ADDRESS, DISCOVERY_PORT, SERVER_PORT} = require('./constants');
const Gateway = require('./lib/gateway');

class Aqara extends events.EventEmitter {
  constructor (master) {
    super();
    this.master = master;
    this._gateways = {};

    this.enumDeviceMute =  20;
    this._serverSocket = dgram.createSocket('udp4');
    this._serverSocket.on('listening', () => {
      const networkIfaces = os.networkInterfaces();
      for (const ifaceName in networkIfaces) {
        const networkIface = networkIfaces[ifaceName];

        for (const connection of networkIface) {
          if (connection.family === 'IPv4') {
            this._serverSocket.addMembership(MULTICAST_ADDRESS, connection.address)
          }
        }
      }

      this._triggerWhois();
    });

    setInterval(function(){
      if(this.enumDeviceMute > 0){
        this.enumDeviceMute--;
      }
    }.bind(this),1000);
    this._serverSocket.on('message', this._handleMessage.bind(this));

    this._serverSocket.bind(SERVER_PORT, '0.0.0.0')
  }

  _triggerWhois () {
    console.log('discover gateway:');
    const payload = '{"cmd": "whois"}';
    this._serverSocket.send(payload, 0, payload.length, DISCOVERY_PORT, MULTICAST_ADDRESS)
  }

  get gateways() {
    return this._gateways;
  }
  _handleMessage (msg) {
    const parsed = JSON.parse(msg.toString());

    //console.log('get message:',JSON.stringify(parsed));
    let handled = false;

    switch (parsed.cmd) {
      case 'heartbeat':
        if (!this._gateways[parsed.sid]) {
          handled = true;
          this._triggerWhois();
        }
        break;
      case 'iam':
        handled = true;
        if (this._gateways[parsed.sid])
          break;
        const gateway = new Gateway({
          ip: parsed.ip,
          sid: parsed.sid,
          sendUnicast: (payload) => this._serverSocket.send(payload, 0, payload.length, SERVER_PORT, parsed.ip),
          evtMaster:this.master
        });
          gateway.on('fireEvent',function(data){
              this.emit('fireEvent',data);
          }.bind(this));
          gateway.on('writeError',function(devId){
            this.emit('writeError',devId)
          }.bind(this));
        gateway.on('offline', () => {
          gateway.removeAllListeners('offline');
          gateway.removeAllListeners('updateWQState');
          delete this._gateways[parsed.sid]
          this._triggerWhois();
        });
        this._gateways[parsed.sid]= gateway;
        this.emit('gateway', gateway);

        break;
    }

    if (!handled) { // propagate to gateways
      for (const gateway of _.values(this._gateways)) {
        handled = gateway._handleMessage(parsed);
        if (handled) break
      }
    }

    if (!handled)
      console.log(`not handled: ${JSON.stringify(parsed)}`)
  }
  getDevice(devId){
    let device;
    _.each(this._gateways,function(gw,key){
        let subDev = gw.getDevice(devId);
      if(subDev){
        device = subDev;
        return true;
      }
    });
    return device;
  }
  WriteWQ(wqMap,value,devId){
    let subDev = this.getDevice(devId);
    if(subDev){
      for( let i = wqMap.start;i <= wqMap.end;i++){
        console.log(`write WQ:${i}`)
        this.emit('updateWQState',{devId:devId,wq:i,state:consts.WRITE_STATE.BUSY,param:2});//最多4秒
        subDev.writeWQ(i,value[i]);
      }
    }else{

      console.error(`device ${devId} not found!`);
        this.EnumDevices();
    }
  }
  setTokens(tokens){
    _.each(this._gateways,(gateway,gwId)=>{
        gateway.setPassword(tokens[gwId]);
    });
  }
  ReadWQ(wqMap,devId){
    let subDev = this.getDevice(devId);
    let result = [];
    if(subDev){
      for( let i = wqMap.start;i <= wqMap.end;i++){
        result.push(subDev.readWQ(i));
      }
    }
    return result;
  }
  //重新查询所有的设备
    EnumDevices(){
    if(this.enumDeviceMute === 0){
        this.enumDeviceMute = 20;
        this._triggerWhois();
        setTimeout(()=>{
            _.each(this._gateways,function(gateway){
                gateway.enumDevices();
            })
        },2000)


    }


  }

    /**
     * 获取当前所有的设备信息
     */
    getDevicesList(){
      let result = {};
      _.each(this.gateways,function(gateway,gwId){
        result[gwId] = {uniqueId:'gateway'};
        _.each(gateway.subdevices,function(device,deviceID){
          result[deviceID] =  {uniqueId:device.getType()};
        });
      });
        return result;
    }
}

module.exports = Aqara;
