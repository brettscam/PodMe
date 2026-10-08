/**
 * Every browser on iOS is WebKit — Apple requires it, so Chrome and Firefox
 * for iPhone are Safari with different chrome around them. Telling an iOS
 * user to "switch browsers" changes nothing, which is why this detects the
 * platform rather than the browser brand.
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true

  // iPadOS 13+ reports a desktop Mac UA; touch points disambiguate it.
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
}
