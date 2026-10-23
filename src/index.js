'use strict';

const { toHaveNoA11yViolations, configureA11yMatchers } = require('./matcher');
const { installInternalsHook } = require('./internals-hook');
const { installListenerHook } = require('./listener-hook');
const { installLiveRegionHook, toHaveAnnounced } = require('./live-regions');

module.exports = {
  toHaveNoA11yViolations,
  configureA11yMatchers,
  toHaveAnnounced,
  installInternalsHook,
  installListenerHook,
  installLiveRegionHook
};
