define(['../lib/bower_components/Atem-RequireJS-Config/nodeConfig'],
function(configure) {
    var path = require('path')
      , setup = {
            baseUrl: path.dirname(process.mainModule.filename) + '/../lib'
          , bowerPrefix: 'bower_components'
          , paths: {
                'Atem-MOM': './'
            }
        }
      ;
    return configure.bind(null, setup);
});
