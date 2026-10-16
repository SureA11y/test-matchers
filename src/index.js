'use strict';

const { toHaveNoA11yViolations } = require('./matcher');
const { installInternalsHook } = require('./internals-hook');

module.exports = { toHaveNoA11yViolations, installInternalsHook };
