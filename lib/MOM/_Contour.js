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

    return _Contour;
});
