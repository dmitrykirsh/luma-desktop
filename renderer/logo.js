'use strict';
/* Логотип Luma: монограмма «L», стопа которой переходит в треугольник Play (#FF3366),
   золотой луч проектора (#FFB800) и слово LUMA шрифтом Unbounded Bold (#F8F9FA). */
(function () {
  const MARK =
    '<path d="M10.500 8.500h6v14.500l23.500 9.500-23.500 9.500h-6z" fill="#FF3366" stroke="#FF3366" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M31 24.500 44 7.500" stroke="#FFB800" stroke-width="3.400" stroke-linecap="round" fill="none"/>' +
    '<path d="M37.500 28 46.500 17" stroke="#FFB800" stroke-width="2.400" stroke-linecap="round" fill="none" opacity=".75"/>';

  /** lumaLogo({ wordmark: true, height: 34 }) -> строка с <svg>. wordmark:false — только знак. */
  window.lumaLogo = function lumaLogo(opts) {
    const o = Object.assign({ wordmark: true, height: 34, label: 'Luma' }, opts);
    const w = o.wordmark ? 176 : 48;
    const text = o.wordmark
      ? '<text x="58" y="34" font-family="Unbounded, Inter, sans-serif" font-weight="700" font-size="25" letter-spacing=".6" fill="#F8F9FA" stroke="none">LUMA</text>'
      : '';
    return '<svg class="luma-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' 48" height="' + o.height +
      '" role="img" aria-label="' + o.label + '">' + MARK + text + '</svg>';
  };
})();
