'use strict';
// Rutube marks some subscription-only streams as is_paid=false; the list of
// subscription product codes is the authoritative signal for those streams.
module.exports = function isFreeRutubeVideo(item) {
  if (!item || item.is_paid === true || item.is_club === true) return false;
  return !Array.isArray(item.common_subscription_product_codes) || !item.common_subscription_product_codes.some(code => typeof code === 'string' && code.trim());
};
