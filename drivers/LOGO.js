/**
 * Created by fx on 16-12-12.
 */
const SendMessage = require('sendmessage');
const WorkerBase = require('../WorkerBase');
const snap7 = require('node-snap7');
const util = require('util');
const Q = require('q');
const InfinitLoop = require('../InfinitLoop');

function LOGO(maxSegLength,minGapLength){
    WorkerBase.call(this,maxSegLength,minGapLength);

}
util.inherits(LOGO,WorkerBase);

LOGO.prototype.connect = function () {

    Q().then(function(){
        return this.snap7Client.Disconnect();
    }.bind(this)).delay(2000).then(function(){
        this.snap7Client.Connect(function (error) {
            if(!error){
                this.setRunningState(this.RUNNING_STATE.CONNECTED);
                SendMessage(process,{cmd:'reconnected'});
            }
            else {
                setTimeout(this.connect.bind(this),0);
                console.error(' >> Connection failed #' + error + ' - ' + this.snap7Client.ErrorText(error));
            }
        }.bind(this));
    }.bind(this));


}

LOGO.prototype.initDriver = function(options,memories){
    this.options = options;
    this.maxSegLength = options.maxSegLength;
    this.minGapLength = options.minGapLength;
    //启动ModbusRTU
    this.snap7Client = new snap7.S7Client();
    this.snap7Client.SetConnectionParams(options.ip, options.localTSAP || 1, options.remoteTSAP || 1);
    this.connected = false;

    this.on('snap7Connect',function (err) {

        if(this.runningState!=this.RUNNING_STATE.CONNECTING){
            this.setRunningState(this.RUNNING_STATE.CONNECTING);
            this.connect();
        }

    }.bind(this));

    this.connect();
    this.setupAutoPoll();

};

LOGO.prototype.initDeviceId = function(devId){
    //this.mbClient.setID(parseInt(devId.replace(/id/i,'')));

}

LOGO.prototype.ReadBI = function(bi_mapItem,devId){

    const aLen = Math.ceil((bi_mapItem.end + 1)/8 );

    return Q.nbind(this.snap7Client.EBRead, this.snap7Client)(0,aLen).then(function (res) {
        const retObj = [];
        for(var i = bi_mapItem.start;i <= bi_mapItem.end; i++){
            retObj.push(res[Math.floor(i/8)] & (0x01 << (i%8))?true:false);
        }
        return Q(retObj);
    }).catch(function (error) {
        console.error(' >> Connection failed. Code #' + error + ' - ' + this.snap7Client.ErrorText(error));

        this.emit('snap7Connect','ReadBI');

        return Q.reject('Connection failed!')
    }.bind(this));

};
LOGO.prototype.ReadBQ = function(mapItem,devId){
    const aLen = Math.ceil((mapItem.end + 1)/8 );

    return Q.nbind(this.snap7Client.ABRead, this.snap7Client)(0, aLen).then(function (res) {
        const retObj = [];
        for (var i = mapItem.start; i <= mapItem.end; i++) {
            retObj.push(res[Math.floor(i / 8)] & (0x01 << (i % 8)) ? true : false);
        }
        return Q(retObj);
    }).catch(function (error) {
        console.error(' >> Connection failed. Code #' + error + ' - ' + this.snap7Client.ErrorText(error));

        this.emit('snap7Connect',error);

        return Q.reject('Connection failed');
    }.bind(this));


};

LOGO.prototype.ReadWI = function(mapItem,devId){
    return [];
};
LOGO.prototype.ReadWQ = function(mapItem,devId){
    return [];
};
LOGO.prototype.WriteBQ = function(mapItem,value,devId){

        var start = Math.floor(mapItem.start / 8);
        var end = Math.floor(mapItem.end / 8);
        return Q.nbind(this.snap7Client.ABRead, this.snap7Client)(start, end - start + 1).then(function (res) {

            for (var j = mapItem.start; j <= mapItem.end; j++) {
                var ins = res.readUInt8(j-mapItem.start);
                if (value[j]) {
                    ins |= (1 << j % 8)
                }
                else {
                    ins &= ~(1 << j % 8)
                }
                res.writeUInt8(ins, j-mapItem.start);
            }
            // console.log('5==> mapItem',JSON.stringify(res))
            return Q.nbind(this.snap7Client.DBWrite, this.snap7Client)(0, start, end - start + 1, res);

        }.bind(this)).catch(function (error) {
            console.error(' >> Connection failed. Code #' + error + ' - ' + this.snap7Client.ErrorText(error));

            this.emit('snap7Connect','WriteBQ');
            return Q.reject('Connection failed!');
        }.bind(this))


};

LOGO.prototype.WriteWQ = function(mapItem,value,devId){

    return [];
};

var _LOGO = new LOGO();