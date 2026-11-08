// Fully client-side app: every route is prerendered as an empty shell so the
// build is a static site and all pages can be precached by the service worker.
export const prerender = true;
export const ssr = false;
