/**
 * IntersectionObserver-based animation handler
 * More performant alternative to scroll event listeners
 */

import getInlineOption from '../helpers/getInlineOption';
import resolveEasing from '../helpers/resolveEasing';

/**
 * Convert anchor-placement to IntersectionObserver rootMargin
 * @param {string} anchorPlacement - AOS anchor placement value
 * @param {number} offset - Additional offset in pixels
 * @returns {string} rootMargin value for IntersectionObserver
 */
const getRootMargin = (anchorPlacement, offset) => {
  const windowHeight = window.innerHeight;

  switch (anchorPlacement) {
    case 'top-bottom':
    case 'center-bottom':
    case 'bottom-bottom':
      return `0px 0px ${-offset}px 0px`;

    case 'top-center':
    case 'center-center':
    case 'bottom-center': {
      const centerMargin = Math.max(Math.round(windowHeight / 2) - offset, 1);
      return `${-centerMargin}px 0px ${-centerMargin}px 0px`;
    }

    case 'top-top':
    case 'center-top':
    case 'bottom-top': {
      const topExpand = Math.max(offset, 1);
      return `${topExpand}px 0px ${-(windowHeight - offset)}px 0px`;
    }

    default:
      return `0px 0px ${-offset}px 0px`;
  }
};

/**
 * Get threshold value based on anchor placement
 * @param {string} anchorPlacement
 * @returns {number} threshold (0 to 1)
 */
const getThreshold = (anchorPlacement) => {
  switch (anchorPlacement) {
    case 'top-bottom':
    case 'top-center':
    case 'top-top':
      return 0; // Trigger as soon as top is visible

    case 'center-bottom':
    case 'center-center':
    case 'center-top':
      return 0.5; // Trigger when 50% visible

    case 'bottom-bottom':
    case 'bottom-center':
    case 'bottom-top':
      return 0; // rootMargin compensates with element height

    default:
      return 0;
  }
};

/**
 * Fire custom AOS event
 */
const fireEvent = (eventName, node, id) => {
  const customEvent = new CustomEvent(eventName, {
    detail: { node },
  });
  document.dispatchEvent(customEvent);

  if (id) {
    const idEvent = new CustomEvent(`${eventName}:${id}`, {
      detail: { node },
    });
    document.dispatchEvent(idEvent);
  }
};

/**
 * Add animation classes to element
 */
const addClasses = (node, classes) => {
  classes && classes.forEach((className) => node.classList.add(className));
};

/**
 * Remove animation classes from element
 */
const removeClasses = (node, classes) => {
  classes && classes.forEach((className) => node.classList.remove(className));
};

/**
 * Create IntersectionObserver for AOS elements
 * @param {Array} elements - Array of AOS elements
 * @param {Object} options - AOS options
 * @returns {IntersectionObserver} observer instance
 */
export const createObserver = (elements, options) => {
  // Prepare elements and store their config
  const elementConfigs = elements.map((node) => {
    const mirror = getInlineOption(node, 'mirror', options.mirror);
    const once = getInlineOption(node, 'once', options.once);
    const id = getInlineOption(node, 'id');
    const anchorPlacement = getInlineOption(
      node,
      'anchor-placement',
      options.anchorPlacement,
    );
    const offset = Number(getInlineOption(node, 'offset', options.offset));
    const customClassNames =
      options.useClassNames && node.getAttribute('data-aos');

    const animatedClassNames = [options.animatedClassName]
      .concat(customClassNames ? customClassNames.split(' ') : [])
      .filter((className) => typeof className === 'string');

    // Set per-element CSS custom properties for duration/delay/easing
    const duration = getInlineOption(node, 'duration');
    const delay = getInlineOption(node, 'delay');
    const easing = getInlineOption(node, 'easing');

    if (duration) node.style.setProperty('--aos-duration', `${duration}ms`);
    if (delay) node.style.setProperty('--aos-delay', `${delay}ms`);
    if (easing) node.style.setProperty('--aos-easing', resolveEasing(easing));

    // Add init class
    if (options.initClassName) {
      node.classList.add(options.initClassName);
    }

    // Resolve anchor element
    const anchorSelector = getInlineOption(node, 'anchor');
    let anchorEl = null;
    if (anchorSelector) {
      try {
        anchorEl = document.querySelector(anchorSelector);
      } catch (e) {
        anchorEl = null;
      }
    }
    const observeTarget = anchorEl || node;

    return {
      node,
      observeTarget,
      mirror,
      once,
      id,
      animatedClassNames,
      animated: false,
      anchorPlacement,
      offset,
    };
  });

  // IO callbacks are suppressed until activate() is called.
  // This prevents the initial IO callback from adding aos-animate
  // before CSS transitions are enabled (aos-ready), which would
  // cause above-the-fold elements to snap to their final state
  // with no visible animation.
  let activated = false;

  // Create observers grouped by anchor placement + offset for efficiency
  // Each observer entry has a targetMap: Map<observeTarget, Array<config>>
  const observersByConfig = new Map();

  elementConfigs.forEach((config) => {
    const { observeTarget, anchorPlacement, offset } = config;

    const configKey = `${anchorPlacement}-${offset}`;

    if (!observersByConfig.has(configKey)) {
      // Create new observer for this configuration
      const rootMargin = getRootMargin(anchorPlacement, offset);
      const threshold = getThreshold(anchorPlacement);
      const targetMap = new Map();

      const observer = new IntersectionObserver(
        (entries) => {
          if (!activated) return;

          entries.forEach((entry) => {
            const targets = targetMap.get(entry.target);
            if (!targets) return;

            targets.forEach((targetConfig) => {
              const { node, mirror, once, animatedClassNames, id } =
                targetConfig;

              if (entry.isIntersecting) {
                // Anchor is entering viewport — animate the original node
                if (!targetConfig.animated) {
                  addClasses(node, animatedClassNames);
                  fireEvent('aos:in', node, id);
                  targetConfig.animated = true;
                }
              } else {
                // Anchor is leaving viewport
                if (targetConfig.animated && mirror && !once) {
                  removeClasses(node, animatedClassNames);
                  fireEvent('aos:out', node, id);
                  targetConfig.animated = false;
                }
              }
            });

            // If all targets sharing this anchor have once=true and are animated, unobserve
            if (targets.every((t) => t.once && t.animated)) {
              observer.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin,
          threshold,
        },
      );

      observersByConfig.set(configKey, { observer, targetMap });
    }

    // Add this element to the target map and observe
    const { observer, targetMap } = observersByConfig.get(configKey);

    if (!targetMap.has(observeTarget)) {
      targetMap.set(observeTarget, []);
      observer.observe(observeTarget);
    }
    targetMap.get(observeTarget).push(config);
  });

  return {
    disconnect: () => {
      observersByConfig.forEach(({ observer }) => observer.disconnect());
      observersByConfig.clear();
    },

    /**
     * Enable IO callbacks and animate any elements already in the
     * viewport. Call this AFTER aos-ready is set on <body> so that
     * CSS transitions are active and animations are visible.
     */
    activate: () => {
      activated = true;
      elementConfigs.forEach((config) => {
        if (config.animated) return;
        const rect = config.observeTarget.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight - config.offset) {
          addClasses(config.node, config.animatedClassNames);
          fireEvent('aos:in', config.node, config.id);
          config.animated = true;
        }
      });
    },
  };
};

/**
 * Check if IntersectionObserver is supported
 */
export const isSupported = () => {
  return (
    'IntersectionObserver' in window &&
    'IntersectionObserverEntry' in window &&
    'intersectionRatio' in window.IntersectionObserverEntry.prototype
  );
};

export default {
  createObserver,
  isSupported,
};
