define(['../lib/bower_components/Atem-RequireJS-Config/nodeConfig'],
function(configure) {
    var setup = {
        baseUrl: 'lib'
      , bowerPrefix: 'bower_components'
      , paths: {
            'Atem-MOM': './'
        }
    };

    return configure.bind(null, setup);
});
