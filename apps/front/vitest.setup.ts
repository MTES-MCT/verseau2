import '@testing-library/jest-dom/vitest';

const noop = () => undefined;

console.log = noop;
console.warn = noop;
console.error = noop;
