/** XML parsing/rights/handoff budget, independent of the antivirus HTTP timeout. */
export function processFileOptions() {
  return {
    expireInSeconds: 300,
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
    retryDelayMax: 120,
  };
}
