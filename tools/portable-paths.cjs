const fs = require('node:fs'), path = require('node:path'), os = require('node:os');

function deviceRoots(projectRoot) {
  return [...new Set([projectRoot, os.homedir()].filter(p => p && path.isAbsolute(p)))];
}
function variants(root) {
  const slash = root.replaceAll('\\', '/');
  return [...new Set([root, slash, root.replaceAll('\\', '\\\\'), encodeURI(slash), encodeURIComponent(slash)])];
}
function files(root) {
  const found = [];
  function visit(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.next'].includes(entry.name) && dir === root) continue;
    const file = path.join(dir, entry.name);
    if (fs.lstatSync(file).isSymbolicLink()) continue;
    if (entry.isDirectory()) visit(file); else found.push(file);
  } }
  visit(root); return found;
}
function scrubBuildPaths(output, projectRoot) {
  const markers = deviceRoots(projectRoot).flatMap(variants).sort((a, b) => b.length - a.length);
  let changed = 0;
  for (const file of files(path.join(output, 'app'))) {
    if (!/\.(?:js|json|map|html|css|txt)$/i.test(file)) continue;
    const original = fs.readFileSync(file, 'utf8');
    let text = original;
    for (const marker of markers) text = text.split(marker).join('/butler-source');
    if (file === path.join(output, 'app/apps/web/server.js')) {
      text = text.replace(/(const nextConfig = [^\n]+\n)/, '$1nextConfig.outputFileTracingRoot = require("node:path").join(__dirname, "../..");\nif (nextConfig.experimental) nextConfig.experimental.outputFileTracingRoot = nextConfig.outputFileTracingRoot;\n');
    }
    if (text !== original) { fs.writeFileSync(file, text); changed++; }
  }
  return changed;
}
function auditFiles(root, inputFiles, projectRoot) {
  const markers = deviceRoots(projectRoot).flatMap(variants).filter(s => s.length > 8);
  const findings = [], vendorBuildMetadata = [];
  for (const file of inputFiles) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
    const relative = path.relative(root, file).replaceAll('\\', '/');
    if (/(?:^|\/)(?:\.env(?:\.local)?|config\.local[^/]*|session\.enc|[^/]+\.(?:sqlite(?:-wal|-shm)?|ninfer|gguf|part))$/i.test(relative)) findings.push({ file: relative, rule: 'private-state-or-weights' });
    const data = fs.readFileSync(file);
    let machinePath = false, vendorSource = false;
    const vendorBinary = /(?:^app\/node_modules\/|^ops\/lms-sync\/_internal\/)/.test(relative) && /\.(?:dll|pyd|node)$/i.test(file);
    for (const marker of markers) for (const encoding of ['utf8', 'utf16le']) {
      const needle = Buffer.from(marker, encoding);
      let offset = data.indexOf(needle);
      while (offset >= 0) {
        const tail = data.subarray(offset + needle.length, offset + needle.length + 300).toString(encoding).replaceAll('\\', '/');
        // These are upstream compiler source locations, not a runtime path, user setting or credential.
        // Keep vendor binaries unmodified; never exempt the actual project/build root.
        const sourceOnly = vendorBinary && variants(os.homedir()).includes(marker)
          && /^(?:\/\.cargo\/(?:registry\/src\/|git\/checkouts\/)|\/AppData\/Local\/Temp\/(?:(?:python|openssl|libffi)-build-|rustc)[^/]+\/)/i.test(tail);
        if (sourceOnly) vendorSource = true; else machinePath = true;
        offset = data.indexOf(needle, offset + needle.length);
      }
    }
    if (machinePath) findings.push({ file: relative, rule: 'build-machine-path' });
    if (vendorSource) vendorBuildMetadata.push({ file: relative, kind: 'upstream-compiler-source-location' });
    if (/\.(?:js|ts|tsx|json|env|md|py|cjs|cs|cmd|ps1)$/i.test(file)) {
      const text = data.toString('utf8');
      if (/(?:ghp_[A-Za-z0-9]{30,}|sk_live_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(text)) findings.push({ file: relative, rule: 'credential-pattern' });
    }
  }
  return { scannedFiles: inputFiles.length, findings, vendorBuildMetadata };
}
module.exports = { files, scrubBuildPaths, auditFiles };
