'use strict';

const { toHaveNoA11yViolations, configureA11yMatchers } = require('./matcher');
const { toHaveAnnounced } = require('./announced');
const { installInternalsHook, installListenerHook, installLiveRegionHook } = require('./hooks');

module.exports = {
  toHaveNoA11yViolations,
  configureA11yMatchers,
  toHaveAnnounced,
  installInternalsHook,
  installListenerHook,
  installLiveRegionHook
};
