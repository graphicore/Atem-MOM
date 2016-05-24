define([
    'Atem-CPS/_Controller'
], function(
    Parent
) {
    "use strict";
    function Controller() {
        Parent.apply(this, arguments);
    }
    var _p = Controller.prototype = Object.create(Parent.prototype);

    _p.getCPSName = function(node) {
        // TODO: a cpsFile property in MOM/_Node that works like this would
        // be appropriate. Then we'd just return node.cpsFile || null in here.
        // But this bit does the job as well. It would be more formalized
        // having this in MOM though.
        // First check on node if it has a "cpsFile" property
        // attached and if not resort to the following default rule.
        // to determine a cps file.
        var cpsFile = node.getAttachment('cpsFile')
          , cpsFileNameHost
          ;
        if(!cpsFile) {
            // The default:
                        // the root is its own cps file name host
            cpsFileNameHost = (node.isRoot() && node)
                        // unvivers uses cpsFile of multivers (root)
                        || (node.type === 'univers' && node.root)
                        // master defines its own cpsFile
                        || (node.type === 'master' && node)
                        // for all children of master, master defines cpsFile
                        // this expects the leftover nodes to be all descendants
                        // of master. So, if we decide to
                        || node.master;
            if(cpsFileNameHost)
                cpsFile = cpsFileNameHost.getAttachment('cpsFile');
        }
        return cpsFile || null;
    };

    return Controller;
});
