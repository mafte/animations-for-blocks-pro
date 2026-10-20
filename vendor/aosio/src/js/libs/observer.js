let callback = () => {};

function containsAOSNode(nodes) {
  return nodes.some(
    (n) =>
      n.nodeType === 1 &&
      (n.dataset?.aos != null || n.querySelector?.('[data-aos]')),
  );
}

function check(mutations) {
  if (!mutations) return;

  mutations.forEach((mutation) => {
    if (containsAOSNode([...mutation.addedNodes])) {
      return callback();
    }
  });
}

function ready(fn) {
  const observer = new MutationObserver(check);
  callback = fn;

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  return observer;
}

export default { ready };
