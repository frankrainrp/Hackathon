// A parent-owned supervisor: IPC disconnect also runs on an abrupt web-server exit.
// No service installation, task scheduler, detached process, model download or logging.
const { spawn } = require('node:child_process');
const [exe, model, context, port, key] = process.argv.slice(2);
if (!process.send || !/^\d+$/.test(port) || !/^\d+$/.test(context)) process.exit(2);
const child = spawn(exe, ['--model', model, '--alias', require('node:path').basename(model), '--host', '127.0.0.1', '--port', port, '--ctx-size', context, '--n-gpu-layers', '0', '--parallel', '1', '--jinja', '--api-key', key, '--no-webui', '--no-warmup'], { windowsHide: true, stdio: 'ignore' });
let stopping = false;
function stop() { if (stopping) return; stopping = true; child.kill(); const t = setTimeout(() => process.exit(0), 3000); t.unref(); }
process.on('disconnect', stop);
process.on('message', message => { if (message === 'stop') stop(); });
process.on('SIGTERM', stop);
child.on('error', () => { process.send?.({ failed: true }); process.exit(1); });
child.on('exit', code => { process.send?.({ exited: true, code }); process.exit(stopping ? 0 : (code || 0)); });
process.send({ started: true });
