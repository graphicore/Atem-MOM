define([
    'Atem-CPS/errors'
], function(
    atemErrors
) {
    var errors = Object.create(atemErrors)
      , makeError = atemErrors.makeError.bind(null, errors)
      ;

    makeError('MOM', undefined, errors.OMA);
    makeError('Import', undefined, errors.MOM);
    makeError('ImportPenstroke', undefined, errors.Import);
    makeError('ImportContour', undefined, errors.Import);

    return errors;
});
