// Maintainer-only catalog review. Fetches public metadata, never weights or hardware details.
// Review capability/license changes before editing ai-catalog.ts and rebuilding the package.
import { MODEL_CATALOG, CATALOG_VERSION } from '../../apps/web/src/lib/ai-catalog.ts';
const reviewed=[];
for(const model of MODEL_CATALOG){
 const response=await fetch(`https://huggingface.co/api/models/${model.repo}?blobs=true`,{signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error(`Catalog metadata unavailable (${response.status}) for ${model.repo}`);
 const metadata=await response.json(),file=metadata.siblings?.find(x=>x.rfilename===model.file);
 if(!file?.lfs?.sha256||!Number.isSafeInteger(file.size))throw new Error('Publisher metadata lacks a verifiable LFS file: '+model.file);
 reviewed.push({id:model.id,source:model.source,currentRevision:model.revision,publisherRevision:metadata.sha,weightChanged:model.sha256!==file.lfs.sha256||model.bytes!==file.size,publisherBytes:file.size,publisherSha256:file.lfs.sha256,publisherLicense:metadata.cardData?.license||'Review official license',action:'Review the model card, license, capability and engine compatibility; update the versioned source catalog and tests, then rebuild. No automatic install/update.'});
}
console.log(JSON.stringify({catalogVersion:CATALOG_VERSION,checkedAt:new Date().toISOString(),models:reviewed},null,2));
