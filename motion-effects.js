(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.querySelector('#motion-backdrop');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const pointer = { x: innerWidth * .5, y: innerHeight * .4 };
  let particles = [];
  let width = innerWidth;
  let height = innerHeight;
  let dpr = 1;

  function resize() {
    width = innerWidth;
    height = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = width < 760 ? 22 : 46;
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: .6 + Math.random() * 1.8,
      speed: .08 + Math.random() * .2,
      drift: -.08 + Math.random() * .16,
      alpha: .12 + Math.random() * .45
    }));
  }

  function activeScreen() {
    return document.querySelector('.screen.active')?.id || '';
  }

  function drawAurora(time, fullMoon) {
    const phase = time * .00008;
    const gradient = ctx.createLinearGradient(0, 0, width, height * .72);
    gradient.addColorStop(0, 'rgba(32, 98, 77, 0)');
    gradient.addColorStop(.42, fullMoon ? 'rgba(218, 145, 65, .11)' : 'rgba(73, 142, 116, .09)');
    gradient.addColorStop(.66, fullMoon ? 'rgba(143, 57, 42, .08)' : 'rgba(145, 180, 163, .06)');
    gradient.addColorStop(1, 'rgba(8, 20, 17, 0)');
    ctx.save();
    ctx.translate(Math.sin(phase) * width * .08, Math.cos(phase * .7) * 18);
    ctx.rotate(-.08);
    ctx.filter = 'blur(24px)';
    ctx.fillStyle = gradient;
    ctx.fillRect(width * .08, height * .02, width * .84, height * .7);
    ctx.restore();
  }

  function drawLightRays(time, fullMoon) {
    if (!fullMoon) return;
    const originX = width * .5 + Math.sin(time * .00025) * width * .04;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 5; i++) {
      const spread = (i - 2) * width * .075;
      const ray = ctx.createLinearGradient(originX + spread, 0, originX + spread * 1.7, height * .76);
      ray.addColorStop(0, 'rgba(255, 231, 158, .13)');
      ray.addColorStop(1, 'rgba(255, 197, 92, 0)');
      ctx.fillStyle = ray;
      ctx.beginPath();
      ctx.moveTo(originX + spread - 7, 0);
      ctx.lineTo(originX + spread + 7, 0);
      ctx.lineTo(originX + spread * 1.9 + width * .08, height * .78);
      ctx.lineTo(originX + spread * 1.9 - width * .08, height * .78);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawParticles(fullMoon) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const p of particles) {
      p.y -= p.speed * (fullMoon ? 1.75 : 1);
      p.x += p.drift + (pointer.x / width - .5) * .015;
      if (p.y < -8) { p.y = height + 8; p.x = Math.random() * width; }
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
      const color = fullMoon ? `rgba(255, 201, 102, ${p.alpha})` : `rgba(194, 225, 207, ${p.alpha})`;
      glow.addColorStop(0, color);
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function render(time) {
    ctx.clearRect(0, 0, width, height);
    if (!reduceMotion.matches && !document.hidden) {
      const screen = activeScreen();
      const fullMoon = screen === 'game-screen' && document.querySelector('#game-screen')?.classList.contains('full-phase');
      if (screen === 'login-screen' || screen === 'home-screen' || screen === 'select-screen' || screen === 'game-screen') {
        drawAurora(time, fullMoon);
        drawLightRays(time, fullMoon);
        drawParticles(fullMoon);
      }
    }
    requestAnimationFrame(render);
  }

  function setPointerVariables(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    const surface = event.target.closest('.setup-panel, dialog, .seat');
    if (surface) {
      const rect = surface.getBoundingClientRect();
      surface.classList.add('rb-spotlight');
      surface.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
      surface.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
    }
    const card = event.target.closest('.card:not(.back)');
    if (card) {
      let glare = card.querySelector(':scope > .rb-glare');
      if (!glare) {
        glare = document.createElement('i');
        glare.className = 'rb-glare';
        glare.setAttribute('aria-hidden', 'true');
        card.appendChild(glare);
      }
      const rect = card.getBoundingClientRect();
      const shift = ((event.clientX - rect.left) / rect.width) * 110 - 70;
      glare.style.setProperty('--glare-shift', `${shift}%`);
    }
    const magnet = event.target.closest('.primary, .start-orbit, #skill-action, #risk-action');
    if (magnet && !magnet.disabled && innerWidth > 760) {
      const rect = magnet.getBoundingClientRect();
      magnet.classList.add('rb-magnet');
      magnet.style.setProperty('--mag-x', `${(event.clientX - rect.left - rect.width / 2) * .12}px`);
      magnet.style.setProperty('--mag-y', `${(event.clientY - rect.top - rect.height / 2) * .12}px`);
    }
  }

  function resetPointerEffects(event) {
    const surface = event.target.closest('.setup-panel, dialog, .seat');
    if (surface && !surface.contains(event.relatedTarget)) surface.classList.remove('rb-spotlight');
    const magnet = event.target.closest('.rb-magnet');
    if (magnet && !magnet.contains(event.relatedTarget)) {
      magnet.style.setProperty('--mag-x', '0px');
      magnet.style.setProperty('--mag-y', '0px');
    }
  }

  function clickSpark(event) {
    if (reduceMotion.matches || !event.target.closest('button, .card, .seat-visible')) return;
    const spark = document.createElement('span');
    spark.className = 'click-spark';
    spark.setAttribute('aria-hidden', 'true');
    spark.style.setProperty('--spark-x', `${event.clientX}px`);
    spark.style.setProperty('--spark-y', `${event.clientY}px`);
    spark.innerHTML = Array.from({ length: 8 }, (_, i) => `<i style="--spark-i:${i}"></i>`).join('');
    document.body.appendChild(spark);
    setTimeout(() => spark.remove(), 600);
  }

  addEventListener('resize', resize, { passive: true });
  document.addEventListener('pointermove', setPointerVariables, { passive: true });
  document.addEventListener('pointerout', resetPointerEffects, { passive: true });
  document.addEventListener('click', clickSpark);
  resize();
  requestAnimationFrame(render);
})();
