define([
    'Atem-CPS/errors'
], function(
    atemErrors
) {
    var errors = Object.create(atemErrors)
      , makeError = atemErrors.makeError.bind(null, errors)
      ;

    makeError('MOM', undefined, errors.OMA);

    return errors;
});
