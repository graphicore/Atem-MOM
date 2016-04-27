define([
    './_Node'
  , './Glyph'
], function(
    Parent
  , Glyph
) {
    "use strict";
    /**
     * This Element is the container of all glyphs of a master.
     * It will have some metadata and contain children of type MOM Glyph.
     */
    function Master() {
        Parent.call(this);
    }
    var _p = Master.prototype = Object.create(Parent.prototype);
    _p.constructor = Master;

    Object.defineProperty(_p, 'idManager', {
        value: true
    });

    _p._propertiesDependentOnParent = Parent.prototype._propertiesDependentOnParent
                    .filter(function(name){ return !(name in {'glyph': 1, 'master': 1});});

    Object.defineProperty(_p, 'MOMType', {
        value: 'MOM Master'
    });

    Object.defineProperty(_p, 'type', {
        /* this is used for CPS selectors*/
        value: 'master'
    });

    _p.findGlyph = function( glyphName ) {
        // TODO: check where this is used and replace it completeley with
        // this.getById (which returns undefined instead of null)
        return this.getById(glyphName) || null;
    };

     /**
     * As long as there is just one univers, we don't need to display
     * the multivers and univers selectors
     */
    Object.defineProperty(_p, 'particulars', {
        get: function() {
            return [
                    this._parent ? '' : '(no parent)'
                  , ' '
                  , this.type
                  , (this.id ? '#' + this.id : '')
                  , (this._parent
                        ? ':i(' + this.index + ')'
                        : '')
                ].join('');
        }
    });

    _p._acceptedChildren = Object.create(null);
    _p._acceptedChildren[Glyph.prototype.type] = Glyph;

    function dumpDataToDict(dataDict, node) {
        // properties (4) + attachments (8)
        var data = node.dumpData(false, 4 | 8);
        if(data)
            dataDict[node.masterIndexPath] = data;
    }

    _p.dumpDataToDict = function() {
        var dict = Object.create(null);
        this.walkTreeDepthFirst(dumpDataToDict.bind(null, dict));
        return dict;
    };

    function loadDataFromDict (dataDict, node) {
        var data = dataDict[node.masterIndexPath];
        if(data)
            node.loadData(data);
    }

    _p.loadDataFromDict = function(dict) {
        this.walkTreeDepthFirst(loadDataFromDict.bind(null, dict));
    };

    _p._interpolationCompatibilityTests = [
        function isMaster(other, collect, strictlyCompatible) {
            //jshint unused:vars
            if(!(other instanceof Master))
                return [false, this + ' "'+this.id+'": other item is not a '
                                + 'Master: "' + other +'" (typeof '
                                + (typeof other)+').'];
            return true;
        }
      , function checkGlyphs(other, collect, strictlyCompatible) {
            //jshint validthis:true
            var namesA = Object.create(null)
              , namesB = Object.create(null)
              , i,l, k
              , result
              , childrenOther = other.children
              , messages = []
              , compatible = true
              , excessInOther = [], missingFromOther = []
              ;
            // In our CPS *polation scripts, glyphs are keyed by id not
            // by index. Thus, we need to check by key.
            for(i=0,l=this._children.length;i<l;i++)
                namesA[this._children[i].id] = this._children[i];
            for(i=0,l=childrenOther.length;i<l;i++)
                namesB[childrenOther[i].id] = childrenOther[i];
            for(k in namesA) if(!(k in namesB))
                missingFromOther.push(k);

            // Unless we implement "patching" masters, this breaks interpolation
            // with this Master as the base. But, patching is going to happen.
            if(missingFromOther.length) {
                compatible = false;
                messages.push(this + ' "'+this.id+'": missing glyphs in Master "'
                                + other.id + '": ' + missingFromOther.join(', ')
                                + '.');
            }

            if(strictlyCompatible) {
                for(k in namesB) if(!(k in namesA))
                    excessInOther.push(k);
                if(excessInOther.length) {
                    compatible = false;
                    messages.push(this + ' "'+this.id+'": excess glyphs in Master "'
                        + other.id + '": ' + excessInOther.join(', ') + '.');
                }
            }

            if(!collect && !compatible)
                return [compatible, messages];

            // still compatible, compare the glyphs:

            for(k in namesA) if (k in namesB) {
                result = namesA[k].isInterpolationCompatible(namesB[k]
                                            , collect, strictlyCompatible);
                if(result[0])
                    continue;
                compatible = false;
                Array.prototype.push.apply(messages, result[1]);
                if(!collect)
                    break;
            }
            return [compatible, messages];
        }
    ];

    return Master;
});
