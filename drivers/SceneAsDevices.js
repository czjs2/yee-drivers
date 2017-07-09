/**
 * Created by zhuqizhong on 17-4-27.
 */

const WorkerBase = require('../WorkerBase');

const util = require('util');
const _ = require('lodash');


function SceneAsDevices(maxSegLength, minGapLength) {
    WorkerBase.call(this, maxSegLength, minGapLength);
    this.devices = {};

}
util.inherits(SceneAsDevices, WorkerBase);
SceneAsDevices.prototype.initDriver = function (options, memories) {
    this.rawOptions = options || this.rawOptions;
    if (!this.inited) {
        this.inited = true;
        // init your device here, don't forget to call this.setupEvent() or this.setupAutoPoll()
        //创建一个内部连接house的总线节点
        this.setRunningState(this.RUNNING_STATE.CONNECTED);

        //连接设备


        this.setupEvent();
    }


    _.each(options && options.sids, function (info, sid) {
        this.devices[sid] = this.devices[sid] || {};
        this.devices[sid].eps = this.devices[sid].eps || {};
        this.devices[sid].type = info;
    }.bind(this));

    this.exitsConfig = _.cloneDeep((options && options.sids )|| {});
    this.specConfig = _.cloneDeep( (options && options.extOptions) || {});
    //specconfig里的信息在extendID里

    this.procSpecInOrEx();
};
SceneAsDevices.prototype.WriteWQ = function (mapItem, value, devId) {
    let results = this.CreateWQWriter(mapItem, value, function (reg, regValue) {
        this.devices[devId] = this.devices[devId] || {};
        this.devices[devId].eps = this.devices[devId].eps || {};
        this.devices[devId].eps[reg] = regValue;
        const memories = {devId: devId, memories: {wq_map: [{start: reg, end: reg, len: 1}]}};
        this.emit('RegRead', memories);
    }.bind(this));

};
SceneAsDevices.prototype.ReadWQ = function (mapItem, devId) {
    return this.CreateWQReader(mapItem, function (reg) {
        return (this.devices[devId] && this.devices[devId].eps && this.devices[devId].eps[reg]);
    });
};
SceneAsDevices.prototype.setInOrEx = function (option) {
    this.procSpecInOrEx();
}

util.inherits(SceneAsDevices, WorkerBase);

SceneAsDevices.prototype.procSpecInOrEx = function () {
    let prev_scenes = new Set(_.keys(this.exitsConfig));
    let addDevices = {};
    let delDevices = {};

    _.each(this.specConfig, function (info, sceneId) {

        let item =this.exitsConfig[sceneId] || {};
        let temp_val = {uniqueId:item.uniqueId,nameInGroup:item.nameInGroup,groupId:item.groupId,config:item.config};

        if (!_.isEqual(this.specConfig[sceneId],this.exitsConfig[sceneId])) {
            addDevices[sceneId] = {
                uniqueId: ((info.config && info.config.mode) ? 'SceneAsDevice' : 'SceneAsDeviceCustom'),
                nameInGroup: info.nameInGroup,
                groupId: ".",
                config: {mode: ((info.config && info.config.mode)?info.config.mode:undefined), scene:( (info.config && info.config.mode) ? undefined : sceneId)}
            }
        }
    }.bind(this));
    _.each(this.exitsConfig,function(item,sceneId){
        if(this.specConfig[sceneId] === undefined){
            delDevices[sceneId] = this.exitsConfig[sceneId];
        }
    }.bind(this));


    if (!_.isEmpty(addDevices))
        this.inOrEx({type: "in", devices: addDevices});//uniqueKey:nodeid,uniqueId:nodeinfo.manufacturerid+nodeinfo.productid})
    //console.log('new Devices:',addDevices);
    if (!_.isEmpty(delDevices)) {
        this.inOrEx({type: "ex", devices: delDevices});
    }
}
module.exports = new SceneAsDevices();