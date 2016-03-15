define([
    './_Node'
  , './Validators'
], function(
    Parent
  , validators
) {
    "use strict";
    function _PenStrokeCenterChild() {
        //jshint validthis:true
        Parent.call(this);
        Object.freeze(this._children);
    }
    var _p = _PenStrokeCenterChild.prototype = Object.create(Parent.prototype);
    _p.constructor = _PenStrokeCenterChild;

    _p._validators = Object.create(null);
    _p._validators.on = validators.validateVector;
    _p._validators.in = validators.validateVector;
    _p._validators.out = validators.validateVector;

    _p._validators.inLength = validators.validateNumber;
    _p._validators.outLength = validators.validateNumber;
    _p._validators.onLength = validators.validateNumber;
    _p._validators.inDir = validators.validateNumber;
    _p._validators.outDir = validators.validateNumber;
    _p._validators.onDir = validators.validateNumber;
    _p._validators.inDirIntrinsic = validators.validateNumber;
    _p._validators.outDirIntrinsic = validators.validateNumber;

    _p._validators.inTension = validators.validateNumber;
    _p._validators.outTension = validators.validateNumber;

    _p._validators.pointBefore = validators.validateMOMSameType;
    _p._validators.pointAfter = validators.validateMOMSameType;

    return _PenStrokeCenterChild;
});
