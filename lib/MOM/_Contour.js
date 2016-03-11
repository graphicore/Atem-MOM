define([
    './_Node'
  , 'Atem-MOM/errors'
], function(
    Parent
  , errors
) {
    "use strict";

    var MOMError = errors.MOM;

    /**
     * All children of a MOM Glyph have to inherit from MOM _Contour.
     */
    function _Contour() {
        /*jshint validthis:true*/
        Parent.call(this);
        if(this.constructor.prototype === _p)
            throw new MOMError('MOM _Contour must not be instantiated '
                +'directly');
    }
    var _p = _Contour.prototype = Object.create(Parent.prototype);
    _p.constructor = _Contour;

    _p._cps_whitelist = {
        glyph: 'glyph'
    };

    //inherit from parent
    (function(source) {
        for(var k in source) if(!this.hasOwnProperty(k)) this[k] = source[k];
    }).call(_p._cps_whitelist, Parent.prototype._cps_whitelist);

    Object.defineProperty(_p, 'glyph', {
        get: function() {
            return this._parent;
        }
    });

    return _Contour;
});
