/**
 * Created by zhuqizhong on 17-4-18.
 */

const event = require('events');
const WorkerBase = require('../../WorkerBase');

const util = require('util');
const net = require('net');
const Q = require('q');
const _ = require('lodash');
const Aqara = require('./aqara')
const consts = require('../../consts')
var Lock = require('lock');
var lock = Lock();

function LumiGate(maxSegLength, minGapLength) {
    WorkerBase.call(this, maxSegLength, minGapLength);


}
util.inherits(LumiGate, WorkerBase);
LumiGate.prototype.initDriver = function (options, memories) {
    this.rawOptions = options;
    let self = this;
    if (!this.inited) {
        this.inited = true;
        this.gatewayMaster = new Aqara(this);
        this.setRunningState(this.RUNNING_STATE.CONNECTED);
        this.setupEvent();
        this.setupAsyncWQTimer(2000);
        this.gatewayMaster.on('gateway', (gateway) => {
//            console.log('Gateway discovered')
            gateway.on('ready', () => {
                console.log('Gateway is ready')
                gateway.setPassword((options.tokens && options.tokens[gateway.sid]) || 'sotxcen2i4otuj7z');
                gateway.setColor({r: 255, g: 0, b: 0});
                gateway.setIntensity(100)
            });

            gateway.on('offline', () => {
                gateway = null;
                console.log('Gateway is offline')
            });

            gateway.on('subdevice', (device) => {
                console.log('New device')
                console.log(`  Battery: ${device.getBatteryPercentage()}%`)
                console.log(`  Type: ${device.getType()}`)
                console.log(`  SID: ${device.getSid()}`)
                switch (device.getType()) {
                    case 'magnet':
                        console.log(`  Magnet (${device.isOpen() ? 'open' : 'close'})`)
                        device.on('open', () => {
                            console.log(`${device.getSid()} is now open`)
                        });
                        device.on('close', () => {
                            console.log(`${device.getSid()} is now close`)
                        });
                        break;
                    case 'switch':
                        console.log(`  Switch`)
                        device.on('click', () => {
                            console.log(`${device.getSid()} is clicked`)
                        });
                        device.on('doubleClick', () => {
                            console.log(`${device.getSid()} is double clicked`)
                        });
                        device.on('longClickPress', () => {
                            console.log(`${device.getSid()} is long pressed`)
                        });
                        device.on('longClickRelease', () => {
                            console.log(`${device.getSid()} is long released`)
                        });
                        break;
                    default:
                        console.log('devices is:', device);
                        break;
                }
            });
            gateway.on('fireEvent', (data) => {

                    try {


                        let curState = this.wqs_target[data.devId] && this.wqs_target[data.devId][data.wq] && this.wqs_target[data.devId][data.wq].state;

                        function checkConfirm(devId, wq) {
                            let device = gateway.getDevice(devId);
                            if (device && device.goToConfirm && device.goToConfirm(wq)) {
                                self.updateWriteState(devId, wq, consts.WRITE_STATE.CONFIRM);
                            } else {
                                self.updateWriteState(devId, wq, consts.WRITE_STATE.IDLE);
                            }
                        }

                        switch (data.cmd) {
                            case 'read_ack':
                                //不做状态转移的动作
                                if (curState === consts.WRITE_STATE.CONFIRM) {
                                    if (_.isEqual(data.value, this.wqs_target[data.devId][data.wq].value)) {
                                        self.updateWriteState(data.devId, data.wq, consts.WRITE_STATE.IDLE);
                                    } else {
                                        self.updateWriteState(data.devId, data.wq, consts.WRITE_STATE.FAILED);
                                    }
                                }
                                break;
                            case 'write_ack':
                                if (curState !== undefined && curState !== consts.WRITE_STATE.IDLE) {
                                    if (_.isEqual(data.value, this.wqs_target[data.devId][data.wq].value)) {
                                        checkConfirm(data.devId, data.wq);
                                    } else {
                                        self.updateWriteState(data.devId, data.wq, consts.WRITE_STATE.PENDING);
                                    }
                                }
                                break;
                            case 'report':
                                if (_.isEqual(data.value, (this.wqs_target[data.devId] && this.wqs_target[data.devId][data.wq] && this.wqs_target[data.devId][data.wq].value))) {

                                    checkConfirm(data.devId, data.wq);
                                }
                                break;
                        }
                        //self.updateWriteState(value.devId,value.wq,value.state,value.param);
                    } catch (e) {

                    }



            });
            gateway.on('writeError', function (deviceId) {
                lock(consts.STATE_LOCKER, function (release) {

                    _.each(this.wqs_target[deviceId], function (wqValue, wq) {
                        if (wqValue.state === consts.WRITE_STATE.BUSY) {
                            wqValue.state = consts.WRITE_STATE.PENDING;
                        }

                    });
                    release(function () {
                    })();
                }.bind(this));
            });
            gateway.on('updateWQState', (value) => {
                self.updateWriteState(value.devId, value.wq, value.state, value.param);

            })

        });
    }else{
        this.gatewayMaster.setTokens(options.tokens);
    }
}
LumiGate.prototype.WriteWQ = function (mapItem, value, devId) {
    return Q().then(function () {
        this.gatewayMaster.WriteWQ(mapItem, value, devId)
    }.bind(this));
};
LumiGate.prototype.ReadWQ = function (mapItem, devId) {
    return this.gatewayMaster.ReadWQ(mapItem, devId);
};
LumiGate.prototype.setInOrEx = function (option) {
    if (!option.isClose) {
        //向网关查询一遍
        var addDevices = {};
        var delDevices = {};
        this.gatewayMaster.EnumDevices();
        setTimeout(function () {
            //3秒后对比数据
            var self = this;
            var rawOptIds = (self.rawOptions && self.rawOptions.sids) || {};
            let newDevices = this.gatewayMaster.getDevicesList();
            _.each(newDevices, function (devInfo, devId) {
                if (rawOptIds[devId] === undefined) {
                    addDevices[devId] = devInfo;
                }
            });
            _.each(rawOptIds, function (devInfo, devId) {
                if (newDevices[devId] === undefined) {
                    delDevices[devId] = devInfo;
                }
            });
            if (!_.isEmpty(addDevices))
                this.inOrEx({type: "in", devices: addDevices});//uniqueKey:nodeid,uniqueId:nodeinfo.manufacturerid+nodeinfo.productid})
            //console.log('new Devices:',addDevices);
            if (!_.isEmpty(delDevices)) {
                this.inOrEx({type: "ex", devices: delDevices});
            }
            //console.log('removed Devices:',delDevices);
        }.bind(this), 3000);
    }
}

util.inherits(LumiGate, WorkerBase)
module.exports = new LumiGate();