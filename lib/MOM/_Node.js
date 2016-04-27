define([
    'Atem-MOM/errors'
  , 'Atem-CPS/OMA/_Node'
  , 'Atem-MOM/cpsTools'
], function(
    errors
  , Parent
  , cpsTools
) {
    "use strict";

    var MOMError = errors.MOM
      , NotImplementedError = errors.NotImplemented
      ;

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

    _p._propertiesDependentOnParent = ['glyph', 'master', 'univers', 'multivers'];
    Array.prototype.push.apply(_p._propertiesDependentOnParent
                        , Parent.prototype._propertiesDependentOnParent);

    Object.defineProperty(_p, 'MOMType', {
        get: function(){return 'MOM '+ this.constructor.name ;}
    });

    _p._getAncestor = function(momType, getterName) {
        if(!this._parent)
            return null;
        if(this._parent.MOMType === momType)
            return this._parent;
        return this._parent[getterName];
    };

    /***
     * get the univers element of this node.
     *
     * a univers element itself has no univers!
     */
    Object.defineProperty(_p, 'univers', {
        get: function() {
            return this._getAncestor('MOM Univers', 'univers');
        }
    });

    _p._rootType = 'multivers';

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
            return this._getAncestor('MOM Master', 'master');
        }
    });

    Object.defineProperty(_p, 'glyph', {
        get: function() {
            return this._getAncestor('MOM Glyph', 'glyph');
        }
    });

    _p.toString = function() { return ['<', this.MOMType, ' ', this.nodeID, '>'].join('');};

    _p.isMOMNode = function(item) {
        return item instanceof _Node;
    };

    _p.loadData = function(data) {
        this._loadData(cpsTools.makeProperty, data);
    };

    _p._validators = null;

    _p._getValidator = function(key) {
        if( this._validators && key in this._validators )
            return this._validators[key];
        return null;
    };

    /**
     * for parameterDB entries a master based index path is preferable
     * because the parameterDB is always on a per master base. So, we
     * are more flexible without saving the position of the master itself
     * in its univers.
     */
    Object.defineProperty(_p, 'masterIndexPath', {
        get: function() {
            var master = this.type === 'master'
                    ? this
                    : this.master
                    ;
            if(master)
                return this.getIndexPath(master);
            throw new MOMError(this + ' has no master.');
        }
    });

    _p._interpolationCompatibilityTests = null;
    _p.isInterpolationCompatible = function(other, collect /* default: true*/
                                        , strictlyCompatible/*default: true*/) {
        if(!this._interpolationCompatibilityTests)
            throw new NotImplementedError(this + ' does not support the '
                                +'isInterpolationCompatible interface.');

        var accumulate = collect === undefined ? true : !!collect
          , strict = strictlyCompatible === undefined ? true : !!strictlyCompatible
          , compatible = true
          , messages = []
          , i,l, test, result
          ;

        for(i=0,l=this._interpolationCompatibilityTests.length;i<l;i++) {
            test = this._interpolationCompatibilityTests[i];
            result = test.call(this, other, accumulate, strict);
            if(result === true || result[0])
                continue;//passed;
            compatible = false;
            if(typeof result[1] === 'string')
                messages.push(result[1]);
            else
                Array.prototype.push.apply(messages, result[1]);
            break;
        }
        return [compatible, messages];
    };

    return _Node;
});
