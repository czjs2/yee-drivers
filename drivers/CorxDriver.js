/**
 * Created by zhuqizhong on 17-6-17.
 */

const WorkerBase = require('../WorkerBase');

const util = require('util');
const net = require('net');
const Q = require('q');
const _ = require('lodash');
const async = require('async-q')

const Corx = require('./CorxDriver/index')
const dgram = require('dgram');



class CorxDriver extends WorkerBase {
    constructor(maxSegLength, minGapLength) {
        super(maxSegLength || 16, minGapLength||16);
        this.devices = {};
        this.deviceInfo = {};


    }
}
/**
 * 科星设备的驱动模块
 * @param options {sids:{mac:{in:in_num,out:out_num}}}  in_num为输入  out_num为输出端口
 * @param memories
 */
CorxDriver.prototype.initDriver = function (options, memories) {
    this.rawOptions = options || this.rawOptions;
    if (!this.inited) {
        this.inited = true;
        this.setRunningState(this.RUNNING_STATE.CONNECTED);
        this.setupAutoPoll();
    }

    this.deviceInfo = _.cloneDeep(options && options.sids) || {};

    _.each(this.deviceInfo,(devInfo,devId)=>{
        let inPort = devInfo.in || 4;
        let outPort = devInfo.out || 4;
        this.autoReadMaps[devId] = {

            bi_map:[{start:0,end:inPort,len:inPort}],
            bq_map:[{start:0,end:inPort,len:inPort}]
        }
    })
    this.moduleType =options.moduleType || "CorxDriverV1";
    this.enumDevices();

};
CorxDriver.prototype.enumDevices = function () {
    let server = dgram.createSocket('udp4');
    server.on('message', (data, rInfo) => {

        let devId ="";
        _.each(data.slice(2,7),(item)=>{
            devId+=("00"+item.toString(16)).substr(-2);
        })
        if (!this.devices[devId]) {

            this.devices[devId] = new Corx(devId);
        }
        let devInfo = this.deviceInfo[devId] || {};
        console.log('new device found:',JSON.stringify(rInfo))
        this.devices[devId].init(rInfo.address , devInfo.in || 4, devInfo.out || 4);

    })
    server.bind(60001);
    server.on('listening', () => {
        let client = dgram.createSocket('udp4');
        client.bind(function() {
            client.setBroadcast(true);

        })
        let findData = Buffer.from([0, 0, 0, 0, 0]);

        async.eachSeries([0,0,0,0,0],()=>{
            return Q.nbind(client.send,client)(findData,60000,"255.255.255.255");

        }).then(()=>{
            setTimeout( ()=>{
                server.close();
                this.checkDeviceChange();}, 3000);
        }).catch((error)=>{
            console.error('error in enum devices:', error.message || error);
        }).fin(()=>{
            client.close();

        })

    });

};
CorxDriver.prototype.ReadBI = function (mapItem, devId) {
    if(this.devices[devId]){
        return this.devices[devId].readBI(mapItem);
    }else{
        return Q.reject(`device not exist: ${devId}`);
    }
};
CorxDriver.prototype.WriteBQ = function (mapItem, value, devId) {
    if(this.devices[devId]){
        return this.devices[devId].writeBQ(mapItem, value);
    }else{
        return Q.reject(`device not exist: ${devId}`);
    }

};
CorxDriver.prototype.ReadBQ = function (mapItem, devId) {
    if(this.devices[devId]){
        return this.devices[devId].readWq(mapItem);
    }else{
        return Q.reject(`device not exist: ${devId}`);
    }
};
CorxDriver.prototype.WriteWQ = function (mapItem, value, devId) {
    if(this.devices[devId]){
        return this.devices[devId].writeWQ(mapItem, value);
    }else{
        return Q.reject(`device not exist: ${devId}`);
    }

};
CorxDriver.prototype.ReadWQ = function (mapItem, devId) {
    if(this.devices[devId]){
        return this.devices[devId].readWq(mapItem);
    }else{
        return Q.reject(`device not exist: ${devId}`);
    }
};
CorxDriver.prototype.checkDeviceChange = function () {
    var addDevices = {};
    var delDevices = {};
    let devsInCfg = _.keys(this.deviceInfo);
    let devsFound = _.keys(this.devices);
    let addDevIds = _.reject(devsFound,function(devId){
            return (_.indexOf(devsInCfg,devId) !== -1);
    });
    let delDevIds = _.reject(devsInCfg,(devId)=>{
        return (_.indexOf(devsFound,devId) !== -1);
    })



    _.each(addDevIds,  ( devId)=> {
        addDevices[devId] = this.deviceInfo[devId] || {uniqueId:devId,in:4,out:4};
    });
    _.each(delDevIds, ( devId)=>{
        delDevIds[devId] = this.deviceInfo[devId] || {uniqueId:devId,in:4,out:4};
    });
    if (!_.isEmpty(addDevices))
        this.inOrEx({type: "in", devices: addDevices});//uniqueKey:nodeid,uniqueId:nodeinfo.manufacturerid+nodeinfo.productid})
    //console.log('new Devices:',addDevices);
    if (!_.isEmpty(delDevices)) {
        this.inOrEx({type: "ex", devices: delDevices});
    }
};
CorxDriver.prototype.setInOrEx = function (option) {
    this.enumDevices();
};


module.exports = new CorxDriver();