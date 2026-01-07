import "@testing-library/jest-dom";

// Global test setup
global.fetch =
  global.fetch || (() => Promise.reject(new Error("Fetch not available")));
