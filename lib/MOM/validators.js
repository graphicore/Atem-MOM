define([
    'Atem-MOM/errors'
  , 'Atem-Math-Tools/Vector'
  , 'Atem-Math-Tools/transform'
  , './_Node'
  , './PenStrokeCenter'
  , './PenStrokeLeft'
  , './PenStrokeRight'
  , './ContourPoint'
], function (
    errors
  , Vector
  , transform
  , _Node
  , PenStrokeCenter
  , PenStrokeLeft
  , PenStrokeRight
  , ContourPoint
) {
    "use strict";

    var ValueError = errors.Value
      , Transform = transform.Transform
      ;

    // common validator functions are shared here
    function validateVector(key, value) {
        //jshint validthis:true
        if(!(value instanceof Vector))
            throw new ValueError('The value of "' + key +'" '
                            + 'must be a Vector, got: "'+ value
                            + '" typeof ' +  typeof value + ' in ' + this);
        return value;
    }

    function validateTransform(key, value) {
        //jshint validthis:true
        if(!(value instanceof Transform))
            throw new ValueError('The value of "' + key +'" '
                            + 'must be a Transformation, got: "' + value
                            + '" typeof ' +  typeof value + ' in ' + this);
        return value;
    }

    function validateString(key, value) {
        //jshint validthis:true
        if(typeof value !== 'string')
            throw new ValueError('The value of "' + key +'" '
                            + 'must be a string, got: "'+ value
                            + '" typeof ' +  typeof value + ' in ' + this);
        return value;
    }



    function validateNumber(key, value) {
        //jshint validthis:true
        if(typeof value !== 'number' || value !== value)
            throw new ValueError('The value of "' + key +'" '
                + 'must be a number, got: '
                + (value !== value
                    ? ' NaN (happens with division by 0 for example)'
                    : '"'+ value + '" typeof: ' +  typeof value
                        + (value && typeof value.constructor === 'function'
                                ? ' a: ' + value.constructor.name
                                : ''
                        )
                )
                + ' in ' + this
            );
        return value;
    }

    function _validateMOM(Constructor, key, value) {
        // jshint validthis:true
        if(!(value instanceof Constructor))
            throw new ValueError('The value of "' + key +'" '
                + 'must be a MOM '+ Constructor.name +', got: '
                + '"'+ value + '" typeof: ' +  typeof value
                + (value && typeof value.constructor === 'function'
                        ? ' a: ' + value.constructor.name
                        : ''
                  )
                + ' in ' + this
            );
        return value;
    }

    function validateMOMNode(key, value) {
        // jshint validthis:true
        return _validateMOM.call(this, _Node, key, value);
    }

    function validateMOMSameType(key, value) {
        // jshint validthis:true
        return _validateMOM.call(this, this.constructor, key, value);
    }

    function validateMOMPenStrokeCenter(key, value) {
        // jshint validthis:true
        return _validateMOM.call(this, PenStrokeCenter, key, value);
    }

    function validateMOMPenStrokeLeft(key, value) {
        // jshint validthis:true
        return _validateMOM.call(this, PenStrokeLeft, key, value);
    }

    function validateMOMPenStrokeRight(key, value) {
        // jshint validthis:true
        return _validateMOM.call(this, PenStrokeRight, key, value);
    }

    function validateMOMContourPoint(key, value) {
        // jshint validthis:true
        return _validateMOM.call(this, ContourPoint, key, value);
    }

    return {
        validateVector: validateVector
      , validateTransform: validateTransform
      , validateString: validateString
      , validateNumber: validateNumber
      , validateMOMNode: validateMOMNode
      , validateMOMSameType: validateMOMSameType
      , validateMOMPenStrokeCenter: validateMOMPenStrokeCenter
      , validateMOMPenStrokeLeft: validateMOMPenStrokeLeft
      , validateMOMPenStrokeRight: validateMOMPenStrokeRight
      , validateMOMContourPoint: validateMOMContourPoint
    };
});
