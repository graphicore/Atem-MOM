define([
    './_Contour'
], function(
    Parent
) {
    "use strict";
    /**
     * This is a UFO component reference.
     */
    function Component() {
        Parent.call(this);
        Object.freeze(this._children);
    }
    var _p = Component.prototype = Object.create(Parent.prototype);
    _p.constructor = Component;

    //inherit from parent
    (function(source) {
        for(var k in source) if(!this.hasOwnProperty(k)) this[k] = source[k];
    }).call(_p._cps_whitelist, Parent.prototype._cps_whitelist);

    Object.defineProperty(_p, 'MOMType', {
        value: 'MOM Component'
    });

    Object.defineProperty(_p, 'type', {
        /* this is used for CPS selectors*/
        value: 'component'
    });

    // TODO: add CPS-validator: baseGlyphName (string) transformation

    return Component;
});

