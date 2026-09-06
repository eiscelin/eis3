'use strict';
/* Vercel serverless function — delegates to the Express app.
   All /api/* traffic is rewritten here (see "rewrites" in vercel.json).
   NOTE: a catch-all file named api/[[...slug]].js builds fine but Vercel's
   router never matched it on this project (every /api/* request 404'd even
   though the function was deployed) — a plain-named function + rewrite works. */
const app = require('../server.js');
module.exports = app;
