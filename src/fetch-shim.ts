/**
 * Shim for node-fetch in the browser.
 * This avoids pulling in polyfills that try to overwrite window.fetch.
 */

const fetch = window.fetch;
const Request = window.Request;
const Response = window.Response;
const Headers = window.Headers;

export { fetch, Request, Response, Headers };
export default fetch;
