define([
    'Atem-CPS/OMA/_Root'
  , './Univers'
], function(
    Parent
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
        Parent.call(this, controller);
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

    _p._acceptedChildren = [Univers];

    return Multivers;
});
