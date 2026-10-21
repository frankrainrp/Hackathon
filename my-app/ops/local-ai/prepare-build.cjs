// Next 14 standalone cleanup must not recurse through pnpm junctions on Windows.
const fs = require('node:fs'), path = require('node:path');
const web = path.resolve(__dirname, '../../apps/web');
const target = path.join(web, '.next/standalone');
if (!target.startsWith(web + path.sep) || path.basename(target) !== 'standalone') throw new Error('Unsafe build output target');
function detach(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes:true })) {
    const full = path.join(directory, entry.name), stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) fs.unlinkSync(full);
    else if (stat.isDirectory()) detach(full);
  }
}
if (fs.existsSync(target)) {
  if (fs.lstatSync(target).isSymbolicLink()) throw new Error('Unexpected standalone root link');
  detach(target); fs.rmSync(target, {recursive:true,force:true});
}
console.log('Prepared generated standalone output without following dependency links.');
