// Test-only transport interception. Never loaded by the product launcher.
// All HTTPS requests to the official DeepSeek host are redirected to a local synthetic fixture.
const https = require('node:https'), http = require('node:http');
const original = https.request;
https.request = function(input, options, callback) {
  const url = typeof input === 'string' || input instanceof URL ? new URL(input) : null;
  const host = url?.hostname || input.hostname || input.host;
  if (host === 'api.deepseek.com') {
    if (!process.env.BUTLER_TEST_CLOUD_PORT) throw new Error('Cloud blocked: fixture port missing');
    const opts = url ? (typeof options === 'object' ? options : {}) : input;
    const cb = url ? (typeof options === 'function' ? options : callback) : options;
    return http.request({ ...opts, protocol:'http:', hostname:'127.0.0.1', host:'127.0.0.1', port:Number(process.env.BUTLER_TEST_CLOUD_PORT), path:url ? url.pathname+url.search : input.path, agent:undefined },cb);
  }
  // This suite may use loopback only. Unexpected external networking is a test failure.
  if (!['localhost','127.0.0.1','::1'].includes(host)) throw new Error('Unexpected external HTTPS in synthetic provider test');
  return Reflect.apply(original,this,arguments);
};
