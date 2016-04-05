// 'rootdir' is defined in /bin/node-config.js
define(['rootDir'], function (rootDir) {
    // To make cps library files available in the MOM-Project
    // This is specific for nodeJS. Need more information/use cases to
    // make a better concept and more general useful.
    // This is not yet the final way. Also, write protection
    // is missing!
    var cpsLibIoMounts = [
        // add more of these configuration objects to include more
        // libraries each object yields in a call to MountingIO.mount
        // the keys correlate with the argument names of MountingIO
        // however, Project does some augmentation.
        {
        //  io: io// not needed here, because it is the same io
            mountPoint: 'lib/MOM' // we will need more flexibility here
          , pathOffset: rootDir + '/lib/cpsLib'
        }
    ];
    return cpsLibIoMounts
})
