import { schoolEntry } from './lms-profile.ts';

export type SchoolConnectionIntent = {kind:'connect';entryUrl:string} | {kind:'request-url'|'invalid-url'|'one-url'};
/** User-authored connection requests only. This never grants permission or visits a URL. */
export function schoolConnectionIntent(text: string): SchoolConnectionIntent | null {
  if (!text || text.length > 12000) return null;
  const urls = Array.from(new Set((text.match(/https?:\/\/[^\s<>"']+/gi) || []).map(s => s.replace(/[)\]。，,！!？?；;]+$/,''))));
  const request = /\b(?:connect|link|sync|monitor)\b|keep.{0,40}(?:updated|up.to.date)|(?:接入|连接|登录|授权|持续同步|自动同步|抓取)/i.test(text);
  const school = /\b(?:school|course|learning|brightspace|lms)\b|(?:学校|课程|学习平台)/i.test(text);
  const linkOnly = urls.length === 1 && text.trim() === urls[0];
  if (!request && !linkOnly) return null;
  if (!urls.length) return request && school ? {kind:'request-url'} : null;
  if (urls.length !== 1) return {kind:'one-url'};
  try { return {kind:'connect',entryUrl:schoolEntry(urls[0]).entryUrl}; }
  catch { return {kind:'invalid-url'}; }
}
