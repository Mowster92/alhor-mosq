// App-owned, read-only source identity. No credentials or operator state are exposed.
import {readFileSync} from 'node:fs';
import {resolve, sep} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function readCandidate(root = fileURLToPath(new URL('./', import.meta.url))) {
  const unknown = {schema:'alhor-app-candidate/v1',app_key:'vrijdagpreek',state:'unknown',version:null,source_digest:null};
  try {
    const descriptor = JSON.parse(readFileSync(resolve(root,'candidate.json'),'utf8'));
    const manifest = descriptor.source_manifest;
    if (descriptor.schema !== unknown.schema || descriptor.app_key !== unknown.app_key
        || typeof descriptor.version !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(descriptor.version)
        || !manifest || typeof manifest !== 'object' || Array.isArray(manifest)
        || !manifest['server.mjs'] || !/^[a-f0-9]{64}$/.test(descriptor.source_digest)) return unknown;
    const sorted = Object.fromEntries(Object.entries(manifest).sort(([a],[b])=>a<b?-1:a>b?1:0));
    if (sha(JSON.stringify(sorted)) !== descriptor.source_digest) return unknown;
    for (const [name,digest] of Object.entries(sorted)) {
      if (!/^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+$/.test(name)
          || name.split('/').some(p=>p==='.' || p==='..' || (p.startsWith('.') && p!=='.gitignore'))
          || !/^[a-f0-9]{64}$/.test(digest)) return unknown;
      const filename = resolve(root,name);
      if (!filename.startsWith(resolve(root)+sep) || sha(readFileSync(filename)) !== digest) return unknown;
    }
    return {...unknown,state:'identified',version:descriptor.version,source_digest:descriptor.source_digest};
  } catch { return unknown; }
}
