define([
    'Atem-CPS-whitelisting/whitelisting'
], function(
    whitelisting
) {
    "use strict";

    /**
     * Used to set the skeleton point coordinates to MOM Point and OutlinePoint
     * elements.
     */
    function PointData(obj) {
        for(var k in obj) this[k] = obj[k];
    }
    var _p = PointData.prototype;

    _p._cps_whitelist = {
        on: 'on'
      , in: 'in'
      , out: 'out'
    };

    _p.cpsGet = whitelisting.getMethod;
    _p.cpsHas = whitelisting.hasMethod;


    // NOTE: when changing these values is implemented, the according
    // onPropertyChange/offPropertyChange methods need to be implemented as well
    // see: models/emitterMixin.js for this

    return PointData;
});
