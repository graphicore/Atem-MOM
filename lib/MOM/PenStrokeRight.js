define([
    './_Node'
], function(
    Parent
) {
    "use strict";
    function PenStrokeRight() {
        Parent.call(this);
    }
    var _p = PenStrokeRight.prototype = Object.create(Parent.prototype);
    _p.constructor = PenStrokeRight;

    Object.defineProperty(_p, 'MOMType', {
        value: 'MOM PenStrokeRight'
    });

    Object.defineProperty(_p, 'type', {
        /* this is used for CPS selectors */
        value: 'right'
    });

    return PenStrokeRight;
});
