define([
    './_Node'
  , 'Atem-MOM/errors'
  , './PenStrokeLeft'
  , './PenStrokeRight'
], function(
    Parent
  , errors
  , PenStrokeLeft
  , PenStrokeRight
) {
    "use strict";

    var DeprecatedError = errors.Deprecated;

    /**
     * This Element represents a point of a of a MoM PenStroke contour.
     * Its properties are the absolute coordinates of an on-curve point
     * of the centerline of a contour.
     *
     * Eventually it may have a name and an identifier etc.
     *
     * It has three children, in order: left, center, right
     * It doesn't accept add or removal of children.
     *
     */
    function PenStrokeCenter() {
        Parent.call(this);

        this.add(new PenStrokeLeft());  // 0
        this.add(new PenStrokeRight()); // 1
        Object.freeze(this._children);
    }
    var _p = PenStrokeCenter.prototype = Object.create(Parent.prototype);
    _p.constructor = PenStrokeCenter;

    //inherit from parent
    _p._cps_whitelist = {
        left: 'left'
      , center: 'center'
      , right: 'right'
    };
    //inherit from parent
    (function(source) {
        for(var k in source) if(!this.hasOwnProperty(k)) this[k] = source[k];
    }).call(_p._cps_whitelist, Parent.prototype._cps_whitelist);

    Object.defineProperty(_p, 'MOMType', {
        value: 'MOM PenStrokeCenter'
    });

    Object.defineProperty(_p, 'type', {
        /* this is used for CPS selectors */
        value: 'center'
    });

    Object.defineProperty(_p, 'left', {
        get: function() {
            return this._children[0];
        }
    });

    /**
     * This is a legacy construct, when center was a sibling of left and
     * right and point was the common parent. center has now taken the
     * role of the old point.
     *
     * I'm going to raise these errors for a while, until `parent:center`
     * is no longer used by CPS.
     *
     * When removing this, also remove the entry in _cps_whitelist.
     */
    Object.defineProperty(_p, 'center', {
        get: function() {
            //return this;
            throw new DeprecatedError('What used to be the "center" property of this '
                            + 'element is now equivalent with the element '
                            + 'itself: ' + this);
        }
    });

    Object.defineProperty(_p, 'right', {
        get: function() {
            return this._children[2];
        }
    });

    _p._acceptedChildren = Object.create(null);
    _p._acceptedChildren[PenStrokeLeft.prototype.type] = PenStrokeLeft;
    _p._acceptedChildren[PenStrokeRight.prototype.type] = PenStrokeRight;

    return PenStrokeCenter;
});
