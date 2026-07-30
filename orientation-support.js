(function () {
  'use strict';

  var root = document.documentElement;
  var lock = document.getElementById('orientation-lock');
  var rotateButton = document.getElementById('orientation-rotate');
  var app = document.getElementById('app');
  var media = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;

  function viewportSize() {
    var viewport = window.visualViewport;
    return {
      width: Math.round(viewport && viewport.width || window.innerWidth),
      height: Math.round(viewport && viewport.height || window.innerHeight)
    };
  }

  function isTouchDevice() {
    return Boolean((media && media.matches) || navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
  }

  function update() {
    var size = viewportSize();
    var needsLandscape = isTouchDevice() && size.width <= size.height * 1.05;
    root.classList.toggle('orientation-required', needsLandscape);
    root.dataset.viewportOrientation = needsLandscape ? 'portrait' : 'landscape';
    if (app) app.setAttribute('aria-hidden', needsLandscape ? 'true' : 'false');
    if (lock) lock.setAttribute('aria-hidden', needsLandscape ? 'false' : 'true');
  }

  function requestLandscape() {
    var orientation = screen.orientation;
    var rootElement = document.documentElement;
    var fullscreen = rootElement.requestFullscreen || rootElement.webkitRequestFullscreen;
    if (fullscreen) {
      var fullResult = fullscreen.call(rootElement, { navigationUI: 'hide' });
      if (fullResult && fullResult.catch) fullResult.catch(function () {});
    }
    if (orientation && orientation.lock) {
      var promise = orientation.lock('landscape');
      if (promise && promise.catch) promise.catch(function () {});
    }
    if (rotateButton) {
      rotateButton.textContent = '请将手机横向旋转';
      window.setTimeout(function () { rotateButton.textContent = '旋转横屏'; }, 1800);
    }
  }

  update();
  window.addEventListener('resize', update, { passive: true });
  window.addEventListener('orientationchange', function () {
    window.setTimeout(update, 120);
  }, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', update, { passive: true });
  if (media && media.addEventListener) media.addEventListener('change', update);
  if (lock) lock.addEventListener('click', requestLandscape);
  if (rotateButton) rotateButton.addEventListener('click', requestLandscape);
}());
