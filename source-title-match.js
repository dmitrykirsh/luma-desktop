'use strict';
// A subtitle after the requested series title may describe another work or an
// episode. Keep the result, but make the uncertainty visible to the viewer.
function possibleDifferentTitle(requested, result, serial) {
  if (!serial || !requested || !result) return false;
  const escape = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(escape(requested.trim()).replace(/\s+/g, '\\s+') + '\\s*:\\s*([^|\\[\\]()]+)', 'i').exec(result);
  if (!match) return false;
  const part = match[1].trim();
  return !!part && !/^(?:сезон|серия|эпизод|season|episode|\d)/i.test(part);
}
module.exports = { possibleDifferentTitle };
