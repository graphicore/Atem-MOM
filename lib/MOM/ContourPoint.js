define([
    './_Node'
], function(
    Parent
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


    return ContourPoint;
});
