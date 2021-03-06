define([
    './_Node'
  , './validators'
], function(
    Parent
  , validators
) {
    "use strict";
    /**
     * This Element represents a point of a of a MoM Contour (outline).
     * Its properties are the absolute coordinates of an on-curve point
     * of the outline of a contour.
     *
     * It doesn't accept add or removal of children.
     */
    function ContourPoint() {
        Parent.call(this);
        Object.freeze(this._children);
    }
    var _p = ContourPoint.prototype = Object.create(Parent.prototype);
    _p.constructor = ContourPoint;

    Object.defineProperty(_p, 'MOMType', {
        value: 'MOM ContourPoint'
    });

    Object.defineProperty(_p, 'type', {
        /* this is used for CPS selectors */
        value: 'p'
    });

    _p._validators = Object.create(null);
    _p._validators.on = validators.validateVector;
    _p._validators.in = validators.validateVector;
    _p._validators.out = validators.validateVector;

    _p._validators.inLength = validators.validateNumber;
    _p._validators.outLength = validators.validateNumber;
    _p._validators.inDir = validators.validateNumber;
    _p._validators.outDir = validators.validateNumber;
    _p._validators.inTension = validators.validateNumber;
    _p._validators.outTension = validators.validateNumber;

    _p._validators.pointBefore = validators.validateMOMSameType;
    _p._validators.pointAfter = validators.validateMOMSameType;


    return ContourPoint;
});
