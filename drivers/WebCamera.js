/**
 * Created by zhuqizhong on 17-5-18.
 */

const WorkerBase = require('../WorkerBase');

const util = require('util');
const net = require('net');
const _ = require('lodash');


// const config = require('../../config.json');
// var driver_path = (config.drivers || "").replace("$exec$",process.cwd())+"/".replace(/\/\//g,'/');

function WCamera(maxSegLength,minGapLength){
    WorkerBase.call(this,maxSegLength,minGapLength);


}
util.inherits(WCamera,WorkerBase);
WCamera.prototype.initDriver=function(options,memories){
    this.rawOptions = options || this.rawOptions;
    this.maxSegLength = options.maxSegLength  || this.maxSegLength;
    this.minGapLength = options.minGapLength  || this.minGapLength;
    this.inter_device = options.inter_device  || this.inter_device;
    this.interval = options.interval  || this.interval;
    this.timeout = options.timeout  || this.timeout;
    this.devices =  this.devices || {};
    var self = this;
    _.each(options.sids,function(type,devId){
        let classType = require('./WC_Cameras/'+(_.isString(type)?type:type.uniqueId));
        let mediaInfo;
        try{
            mediaInfo = JSON.parse((options && options.media_Infos)  || "")
        }
        catch(e){
            console.error('error media info')
        }
        this.devices[devId] = new classType(mediaInfo && mediaInfo[devId]);
        if(this.devSpecOpts&& this.devSpecOpts[devId] && this.devSpecOpts[devId].param){
            this.devices[devId].setOpt(this.devSpecOpts[devId]);
        }
        this.devices[devId].on('wqChanged',function(wq){
            const memories= {devId:devId,memories:{wq_map:[{start:wq,end:wq,len:1}]}};
            self.emit('RegRead',memories);
        })
    }.bind(this));
    if(options.readConfig){
        try{
            let script = new vm.Script(" definition = " + options.readConfig );
            let newObj = {};
            script.runInNewContext(newObj);
            this.SetAutoReadConfig(newObj.definition);
        }catch(e) {
            console.error('error in read config:', e.message || e);
        };
    }
    if(!this.inited){
        this.inited = true;
        this.setRunningState(this.RUNNING_STATE.CONNECTED);

        //连接设备


        this.setupEvent();
        // init your device here, don't forget to call this.setupEvent() or this.setupAutoPoll()
    }

};
WCamera.prototype.WriteWQ = function (mapItem, value, devId) {

};
WCamera.prototype.ReadWQ = function(mapItem,devId){
    return this.CreateWQReader(mapItem,function(reg,results){
        return (this.devices[devId].readOneWq(reg));
    }.bind(this))
};
WCamera.prototype.setInOrEx = function(option){
    if(!option.isClose ){
        //向网关查询一遍
        var addDevices={};
        var delDevices={};
        //list for all devices here
        setTimeout(function(){
            //3秒后对比数据
            var self = this;
            var rawOptIds = (self.rawOptions && self.rawOptions.sids) ||{};
            let newDevices = this.gatewayMaster.getDevicesList();
            _.each(newDevices,function(devInfo,devId){
                if(rawOptIds[devId] === undefined){
                    addDevices[devId] = devInfo;
                }
            });
            _.each(rawOptIds,function(devInfo,devId){
                if(newDevices[devId] === undefined){
                    delDevices[devId] = devInfo;
                }
            });
            if(!_.isEmpty(addDevices))
                this.inOrEx({type:"in",devices:addDevices});//uniqueKey:nodeid,uniqueId:nodeinfo.manufacturerid+nodeinfo.productid})
            //console.log('new Devices:',addDevices);
            if(!_.isEmpty(delDevices)){
                this.inOrEx({type:"ex",devices:delDevices});
            }
            //console.log('removed Devices:',delDevices);
        }.bind(this),3000);
    }
}


WCamera.prototype.EpsInit = function(deviceId, regInfos,devSpecOpts) {
    WorkerBase.prototype.EpsInit.call(this,deviceId,regInfos,devSpecOpts);
    var devId = devSpecOpts && devSpecOpts.uniqueId;
    if(this.devices[devId] && devSpecOpts && devSpecOpts.param){

        this.devices[devId].setOpt(devSpecOpts.param);
    }

};
module.exports = new WCamera();