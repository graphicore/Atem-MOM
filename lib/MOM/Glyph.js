define([
    './_Node'
  , './_Contour'
  , './Component'
  , './Contour'
  , './PenStroke'
  , './validators'
], function(
    Parent
  , Component
  , Contour
  , PenStroke
  , validators
) {
    "use strict";
    /*jshint sub:true*/
    /**
     * This Element is the container of all contours of a glyph.
     *
     * Possible candiates for other children would be everything else
     * found in a UFO-Glyph. But, we can make properties about that stuff,
     * too. Guidelines would make a good candidate for further children,
     * because we might actually want to access these via CPS.
     */
    function Glyph() {
        Parent.call(this);
    }
    var _p = Glyph.prototype = Object.create(Parent.prototype);
    _p.constructor = Glyph;

    Object.defineProperty(_p, 'idManager', {
        value: true
    });

    _p._propertiesDependentOnParent = Parent.prototype._propertiesDependentOnParent
                        .filter(function(name){ return name !== 'glyph';});

    Object.defineProperty(_p, 'MOMType', {
        value: 'MOM Glyph'
    });

    Object.defineProperty(_p, 'type', {
        /* this is used for CPS selectors */
        value: 'glyph'
    });

    _p._validators = Object.create(null);
    _p._validators.width = validators.validateNumber;
    _p._validators.height = validators.validateNumber;

    _p._acceptedChildren = Object.create(null);
    _p._acceptedChildren[Component.prototype.type] = Component;
    _p._acceptedChildren[Contour.prototype.type] = Contour;
    _p._acceptedChildren[PenStroke.prototype.type] = PenStroke;

    return Glyph;
});
