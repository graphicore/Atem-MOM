define([
    'Atem-CPS/CPS/cpsTools'
  , 'Atem-Property-Language/flavouers/MOM/initializePropertyValue'
],
function (
    cpsTools
  , initializePropertyValue
) {
    "use strict";

    // this initializes the cpsTools module with the initializePropertyValue function
    return cpsTools(initializePropertyValue);
});
