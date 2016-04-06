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

    return Master;
});
