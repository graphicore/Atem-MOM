define([
    'Atem-MOM/errors'
], function(
    errors
) {
    "use strict";

    var KeyError = errors.Key;

    /**
     * A ducktyped GlyphSet for BasePen, so that glyphs can be looked
     * up in the MOM-Master, that is the first argument.
     **/
    function MasterGlyphSet(master, drawFunc) {
        this._master = master;
        this._drawFunc = drawFunc;
    }

    var _p = MasterGlyphSet.prototype;
    _p.constructor = MasterGlyphSet;

    _p.get = function(name) {
        var glyph = this._master.getById(name)
          , result
          ;
        if(!glyph)
            throw new KeyError('Glyph "'+name+'" not found');
        // the result is also a ducktyped "glyph" which needs a draw method in BasePen
        result = Object.create(null);
        result.draw = this._drawFunc.bind(glyph);
    };

    return MasterGlyphSet;
});
