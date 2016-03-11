define([
    'Atem-MOM/errors'
  , 'Atem-CPS/OMA/_Node'
], function(
    errors
  , Parent
) {
    "use strict";

    var MOMError = errors.MOM;

    /**
     * The MOM is the structure against which we can run the selector queries
     * of CPS. We must be able to answer the the question "is this element
     * selected by that selector" for each item of the MOM.
     *
     * All Elements of the Metpolator Object Model MOM inherit from _Node.
     * This means, that a test like `item instanceof _Node` must return true.
     */
    function _Node() {
        /*jshint validthis:true*/
        Parent.call(this);
        if(this.constructor.prototype === _p)
            throw new MOMError('MOM _Node must not be instantiated directly');
        this._masterIndexPath = null;
    }

    var _p = _Node.prototype = Object.create(Parent.prototype);
    _p.constructor = _Node;


    _p._cps_whitelist = {
        glyph: 'glyph'
      , master: 'master'
      , univers: 'univers'
      , multivers: 'multivers' // synonymous with root
    };

    //inherit from parent
    (function(source) {
        for(var k in source) if(!this.hasOwnProperty(k)) this[k] = source[k];
    }).call(_p._cps_whitelist, Parent.prototype._cps_whitelist);

    Object.defineProperty(_p, 'MOMType', {
        get: function(){return 'MOM '+ this.constructor.name ;}
    });

    /***
     * get the univers element of this node.
     *
     * a univers element itself has no univers!
     */
    Object.defineProperty(_p, 'univers', {
        get: function() {
            if(!this._parent)
                return null;
            if(this._parent.MOMType === 'MOM Univers')
                return this._parent;
            return this._parent.univers;
        }
    });

    /***
     * Get the multivers element of this node.
     *
     * equivalent to this.root
     */
    Object.defineProperty(_p, 'multivers', {
        get: function() {
            return this.root;
        }
    });

    /***
     * get the master element of this node or null if this node has no master
     *
     * neither multivers nor univers have a master
     */
    Object.defineProperty(_p, 'master', {
        get: function() {
            if(!this._parent)
                return null;
            if(this._parent.MOMType === 'MOM Master')
                return this._parent;
            return this._parent.master;
        }
    });

    Object.defineProperty(_p, 'glyph', {
        get: function() {
            return this._parent && this._parent.glyph || null;
        }
    });

    _p.toString = function() { return ['<', this.MOMType, '>'].join('');};

    _p.isMOMNode = function(item) {
        return item instanceof _Node;
    };

    /**
     * for parameterDB entries a master based index path is preferable
     * because the parameterDB is always on a per master base. So, we
     * are more flexible without saving the position of the master itself
     * in its univers.
     */
    Object.defineProperty(_p, 'masterIndexPath', {
        get: function() {
            var master = this.master
              , indexPath
              , parentPath
              ;
            if(!master)
                return null;

            indexPath = this._masterIndexPath;
            if(indexPath === null) {
                parentPath = this.parent === master
                            ? parentPath = ''
                            : this.parent.masterIndexPath + '/'
                            ;
                indexPath = this._masterIndexPath = parentPath + this._index;
            }
            return indexPath;
        }
    });
    return _Node;
});
