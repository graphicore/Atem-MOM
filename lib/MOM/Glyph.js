define([
    './_Node'
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

    _p._interpolationCompatibilityTests = [
        function isGlyph(other, collect, strictlyCompatible) {
            //jshint unused:vars
            if(!(other instanceof Glyph))
                return [false, this + ' "'+ this.id + '": other item is not a '
                                +'Glyph: "' + other +'" (typeof '
                                + (typeof other) + ').'];
            return true;
        }
      , function checkEssence(other, collect, strictlyCompatible) {
            var compatible = true
              , messages = []
              , otherChildren = other.children
              , difference
              , i,l, result
              ;

            // even if the other children list is longer, but is
            // compatible in the overlapping set, we don't accept that
            // (it would work), but it's confusing yet and points to
            // an accidental one way compatibility.
            // maybe we can have "patching" glyphs in the future, but
            // it's not number one on the list.
            difference = otherChildren.length - this._children.length;
            if(difference) {
                compatible = false;
                messages.push(this + ' "'+this.id+'": '
                        + (difference > 0 ? 'too many' : 'too few')
                        + ' child elements (' + difference
                        + ') in other glyph.');
                if(!collect)
                    return [compatible, messages];
            }

            l = Math.min(this._children.length, otherChildren.length);
            for(i=0;i<l;i++) {
                result = this._children[i].isInterpolationCompatible(
                            otherChildren[i] ,collect, strictlyCompatible);
                if(result[0])
                    continue;
                messages.push(this + ' "'+this.id+'": '
                            + 'incompatible child at index ' + i +' … ');
                Array.prototype.push.apply(messages, result[1]);
                if(!collect)
                   break;
            }
            return [compatible, messages];
        }
    ];

    return Glyph;
});
