/**
 * *******************************************************
 * AOS-IO (Animate on scroll - IntersectionObserver version)
 * High-performance alternative using IntersectionObserver API
 * *******************************************************
 */

// Inline debounce — replaces lodash.debounce for zero dependencies
const debounce = (fn, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
};

const listen = (target, event, fn) => {
  target.addEventListener(event, fn);
  listeners.push({ target, event, fn });
};

import mutationObserver from './libs/observer';
import intersectionObserver from './libs/intersectionObserver';

import detect from './helpers/detector';
import resolveEasing from './helpers/resolveEasing';

/**
 * Private variables
 */
let $aosElements = [];
let observers = null;
let mutationObs = null;
let initialized = false;
let listeners = [];
let lastWindowHeight = null;

/**
 * Default options
 */
const defaults = Object.freeze({
  offset: 120,
  delay: 0,
  easing: 'ease',
  duration: 400,
  disable: false,
  once: false,
  mirror: false,
  anchorPlacement: 'top-bottom',
  startEvent: 'DOMContentLoaded',
  animatedClassName: 'aos-animate',
  initClassName: 'aos-init',
  useClassNames: false,
  disableMutationObserver: false,
  debounceDelay: 50,
});

let options = { ...defaults };

/**
 * Check if AOS should be disabled based on provided setting
 */
const isDisabled = function (optionDisable) {
  return (
    document.documentElement.hasAttribute('data-aos-disabled') ||
    optionDisable === true ||
    (optionDisable === 'mobile' && detect.mobile()) ||
    (optionDisable === 'phone' && detect.phone()) ||
    (optionDisable === 'tablet' && detect.tablet()) ||
    (typeof optionDisable === 'function' && optionDisable() === true)
  );
};

/**
 * Initialize IntersectionObservers for all elements
 */
const initializeObservers = function () {
  // Get fresh list of elements
  $aosElements = [...document.querySelectorAll('[data-aos]')];

  // Disconnect any existing observers
  if (observers) {
    observers.disconnect();
  }

  // Create new IntersectionObservers
  observers = intersectionObserver.createObserver($aosElements, options);

  return $aosElements;
};

/**
 * Refresh AOS
 */
const refresh = function (initialize = false) {
  if (initialize) initialized = true;
  if (initialized) {
    // Skip rebuild on width-only resizes — rootMargin is vertical only
    const currentHeight = window.innerHeight;
    if (!initialize && lastWindowHeight === currentHeight) return;
    lastWindowHeight = currentHeight;

    initializeObservers();

    /**
     * Double-rAF ensures the first paint shows elements in their
     * initial (hidden) state. Then aos-ready enables CSS transitions
     * and activate() adds aos-animate to above-the-fold elements,
     * producing a visible animation.
     */
    if (!document.body.classList.contains('aos-ready')) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.body.classList.add('aos-ready');
          observers.activate();
        });
      });
    } else {
      // aos-ready already set from a prior refresh — activate new observers
      // immediately so IO callbacks are no longer suppressed.
      observers.activate();
    }
  }
};

/**
 * Hard refresh
 * Recreate observers with new elements
 */
const refreshHard = function () {
  if (isDisabled(options.disable)) {
    return disable();
  }

  refresh();
};

/**
 * Disable AOS
 * Disconnect all observers and remove classes
 */
const disable = function () {
  if (mutationObs) {
    mutationObs.disconnect();
    mutationObs = null;
  }

  if (observers) {
    observers.disconnect();
    observers = null;
  }

  document.body.classList.remove('aos-ready');

  $aosElements.forEach(function (el) {
    el.style.removeProperty('--aos-duration');
    el.style.removeProperty('--aos-delay');
    el.style.removeProperty('--aos-easing');

    if (options.initClassName) {
      el.classList.remove(options.initClassName);
    }

    if (options.animatedClassName) {
      el.classList.remove(options.animatedClassName);
    }
  });
};

/**
 * Destroy AOS
 * Full teardown: disable observers, remove event listeners, clear CSS custom properties
 */
const destroy = function () {
  disable();

  listeners.forEach(({ target, event, fn }) =>
    target.removeEventListener(event, fn),
  );
  listeners = [];

  document.body.style.removeProperty('--aos-duration');
  document.body.style.removeProperty('--aos-delay');
  document.body.style.removeProperty('--aos-easing');

  $aosElements = [];
  initialized = false;
  lastWindowHeight = null;
};

/**
 * Initializing AOS
 * - Create options merging defaults with user defined options
 * - Set attributes on <body> as global setting - CSS relies on it
 * - Attach MutationObserver to detect dynamically added elements
 * - Create IntersectionObservers for all AOS elements
 */
const init = function init(settings) {
  // Clean up any prior initialization to prevent listener/observer leaks
  if (initialized) destroy();

  options = Object.assign({}, defaults, settings);

  // Check for IntersectionObserver support
  if (!intersectionObserver.isSupported()) {
    console.warn(
      'AOS-IO: IntersectionObserver is not supported in this browser. Please use the standard AOS version or a polyfill.',
    );
    return;
  }

  // Create initial array with elements
  $aosElements = [...document.querySelectorAll('[data-aos]')];

  /**
   * Observe [data-aos] elements
   * If something is loaded by AJAX, refresh observers
   */
  if (!options.disableMutationObserver) {
    mutationObs = mutationObserver.ready(refreshHard);
  }

  /**
   * Don't init plugin if option `disable` is set
   * or when browser is not supported
   */
  if (isDisabled(options.disable)) {
    return disable();
  }

  /**
   * Set global settings on body as CSS custom properties
   */
  document.body.style.setProperty('--aos-duration', `${options.duration}ms`);
  document.body.style.setProperty('--aos-delay', `${options.delay}ms`);
  document.body.style.setProperty(
    '--aos-easing',
    resolveEasing(options.easing),
  );

  /**
   * Handle initializing based on startEvent
   */
  if (['DOMContentLoaded', 'load'].indexOf(options.startEvent) === -1) {
    // Listen to custom startEvent
    listen(document, options.startEvent, function () {
      refresh(true);
    });
  } else {
    listen(window, 'load', function () {
      if (!initialized) refresh(true);
    });
  }

  if (
    options.startEvent === 'DOMContentLoaded' &&
    ['complete', 'interactive'].indexOf(document.readyState) > -1
  ) {
    // Initialize AOS if default startEvent was already fired
    refresh(true);
  }

  /**
   * Refresh observers on window resize (debounced)
   * This recalculates rootMargin for percentage-based placements
   */
  listen(window, 'resize', debounce(refresh, options.debounceDelay));

  return $aosElements;
};

/**
 * Export Public API
 */

export default {
  init,
  refresh,
  refreshHard,
  destroy,
};
