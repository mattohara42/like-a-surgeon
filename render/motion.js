// The reader's reduced-motion preference, read at the moment it is needed so
// a change in the system setting applies without a reload. CSS handles the
// stylesheet animations (index.html); this is for animations started in JS.
export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
