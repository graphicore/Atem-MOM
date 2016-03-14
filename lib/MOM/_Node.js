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
            var master = this.master;
            if(master)
                return this.getIndexPath(master);
            throw new MOMError(this + ' has no master.');
        }
    });

    /**
     * Returns an object if there is any data to be serialized, otherwise null.
     *
     * The object is meant to be consumed by loadData and must be de-/serializable
     * by methods like JSON.stringify or yaml.safeDump without loss.
     */
    _p.dumpData = function() {
        var data = Object.create(null)
          , k, i, l, items, properties = []
          ;
        if(this._id)
            data.id = this._id;
        for(k in this._classes) {
            // we have classes
            data.classes = this.classes;
            break;
        }

        items = this.properties.items;
        for(i=0,l=items.length;i<l;i++)
            properties.push([items[i].name, items[i].value.valueString]);
        if(l)
            data.properties = properties;

        if(this._attachedData)
            for(k in this._attachedData) {
                data.attachedData = this._attachedData;
                break;
            }

        for(k in data)
            // only return data if there is any content
            return data;
        return null;
    };

    _p.loadData = function(data) {
        // FIXME: delay styledict invalidation
        var i, l, classes, name, properties, newProperties;
        if('id' in data)
            this.id = data.id;

        if('classes' in data) {
            // do only if necessary and in a way that the 'classes' event
            // is triggered just once.
            classes = new Set();
            for(i=0,l=data.classes.length;i<l;i++) {
                // check if there are new class names
                name = data.classes[i];
                classes.add(name);
                if(!(name in this._classes)) {
                    // mark for reset
                    this._classes = null;
                    break;
                }
            }
            if(this._classes !== null) {
                for(name in this._classes)
                    // check if there are superfluous class names
                    if(!classes.has(name)) {
                        // mark for reset
                        this._classes = null;
                        break;
                    }
            }
            if(this._classes === null) {
                // reset
                this._classes = Object.create(null);
                this.setClasses(data.classes);
            }
        }

        if('properties' in data) {
            // TODO: similar to the classes block above, this should only
            // trigger a change event if necessary. I keep this for another
            // iteration. Should anyways be implemented in the PropertyDict.
            properties = data.properties;
            newProperties = [];
            for(i=0,l=properties.length;i<l;i++)
                newProperties.push(cpsTools.makeProperty(properties[i][0], properties[i][1]));
            this.properties.splice(0, this.properties.length, newProperties);
        }

        if('attachedData' in data)
            this.attachData(data.attachedData)
    };

    /**
     * Return an array of arrays [
     *      [this.children[n].type, this.children[n].getEssence()],
     *      ...
     * ]
     * If Object.isFrozen(this._children): Return: null
     *
     * If this._children are frozen we consider that they are created
     * by the Constructor. And I derive that they are thus not part of
     * the essence. That means also that a Constructor that freezes it's
     * children must always creates the same "essence" of children by ,
     * itself or otherwise, we must carefully consider the implications.
     *
     * NOTE: there is some variation possible in the return value for
     * OMA implementations. However, the return value of this method will
     * likely be used to compare essences and to perform distinct actions
     * based on that and thus should really only be altered when carefully
     * considered. It is much safer to change dumpData/loadData and
     * in most cases the right thing to do anyways.
     *
     * If you don't change the semantic of the "essence" it should be fine.
     *
     * The return value must be serializable via JSON.stringify or yaml.safeDump
     *
     * TODO: write and link to documentation about the "essence" concept.
     */
    _p.dumpEssence = function() {
        var essence, i, l;
        if(Object.isFrozen(this._children))
            return null;
        essence = [];
        for(i=0,l=this._children.length;i<l;i++)
            essence.push([this._children[i].type, this._children[i].getEssence()]);
        return essence;
    };

    /**
     * This replaces all children with new ones created from the information
     * in "essences"
     *
     * If essences is an empty array, this deletes all children, just like
     * node.splice(0, node.childrenLength);
     */
    _p.loadEssence = function(essence) {
        var i,l, type, data, Constructor, child, children = [];
        for(i=0,l=essence.length;i<l;i++) {
            type = essence[i][0];
            data = essence[i][1];
            Constructor = this.getChildConstructor(type);
            // we can define a factory
            if(typeof Constructor.fromEssence === 'function')
                child = Constructor.fromEssence(data);
            // this is the default
            else {
                child = new Constructor();
                if(data !== null)
                    child.loadEssence(data);
            }
            children.push(child);
        }
        this.splice(0, this._children.length, children);
    };

    return _Node;
});
