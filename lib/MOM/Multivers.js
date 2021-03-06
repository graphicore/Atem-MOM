define([
    // Parent
    './_Node'
    // Root.prototype as a mixin
  , 'Atem-CPS/OMA/_Root'
  , './Univers'
], function(
    Parent
  , Root
  , Univers
) {
    "use strict";
    /**
     * This is the root element of a MOM Tree.
     *
     * This element is the container of all Univers elements of a metapolator
     * project. It's needed for as a scope for cps queries that search
     * in the scope of an entire Univers. And it's used to check if an
     * element belongs to the MOM tree where Multivers is the root. Other
     * than that, has no real use now, but we may do cool stuff with it
     * in the future.
     *
     * It only contains children of type MOM Univers
     */
    function Multivers(controller) {
        Parent.call(this);
        this._controller = controller;
    }
    var _p = Multivers.prototype = Object.create(Parent.prototype);
    _p.constructor = Multivers;

    Object.defineProperty(_p, 'MOMType', {
        value: 'MOM Multivers'
    });

    Object.defineProperty(_p, 'type', {
        /* this is used for CPS selectors*/
        value: 'multivers'
    });

    _p._propertiesDependentOnParent = [];

    _p._acceptedChildren = Object.create(null);
    _p._acceptedChildren[Univers.prototype.type] = Univers;

    _p.dumpWithoutMasters = function(simpleProperties) {
        // Compare this to to the OMA/_Node.dumpTree method for a better
        // understanding of how it works.
        // In short, we do the same but we use the childrens (univers)
        // 'dumpData' method instead of 'dumpTree' which omits the children
        // of the universes.
        // Best thing, this dump is compatible with the default
        // OMA/_Node.loadTree method.
        var data = this.dumpData(simpleProperties)
                                           // the original function is
                                           // 'dumpTree'
          , childrenData = this._dumpChildren('dumpData', [simpleProperties])
          ;
        if(childrenData) {
            if(!data)
                data = Object.create(null);
            data.children = childrenData;
        }
        return data;
    };

    // mixin Root.prototype
    (function(source, target) {
            //  enumerable and non-enumerable properties found directly upon
        var props = Object.getOwnPropertyNames(source)
          , i, l, k, prop
          ;
        for(i=0,l=props.length;i<l;i++) {
            k = props[i];
            if(target.hasOwnProperty(k))
                // don't override properties defined in here.
                continue;

            prop = Object.getOwnPropertyDescriptor(source, k);
            Object.defineProperty(target, k, prop);
        }
    })(Root.prototype, _p);

    return Multivers;
});
