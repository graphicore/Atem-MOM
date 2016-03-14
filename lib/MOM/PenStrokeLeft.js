define([
    './_Node'
], function(
    Parent
) {
    "use strict";
    function PenStrokeLeft() {
        Parent.call(this);
    }
    var _p = PenStrokeLeft.prototype = Object.create(Parent.prototype);
    _p.constructor = PenStrokeLeft;

    Object.defineProperty(_p, 'MOMType', {
        value: 'MOM PenStrokeLeft'
    });

    Object.defineProperty(_p, 'type', {
        /* this is used for CPS selectors */
        value: 'left'
    });

    return PenStrokeLeft;
});
