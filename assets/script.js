(() => {
  const bgCanvas = document.getElementById("bg-canvas");
  const fxCanvas = document.getElementById("fx-canvas");
  const bgCtx = bgCanvas.getContext("2d");
  const fxCtx = fxCanvas.getContext("2d");

  const state = {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
    mouse: {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    },
    backgroundMode: 0,
    emitters: [],
    particles: [],
    stars: [],
    lastTime: performance.now()
  };

  function resizeCanvas(canvas, ctx) {
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  function createStars() {
    const count = Math.max(120, Math.floor((state.width * state.height) / 9000));
    state.stars = Array.from({ length: count }, () => ({
      x: Math.random() * state.width,
      y: Math.random() * state.height,
      size: 0.5 + Math.random() * 1.8,
      speed: 0.2 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2
    }));
  }

  function resize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    state.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    resizeCanvas(bgCanvas, bgCtx);
    resizeCanvas(fxCanvas, fxCtx);
    createStars();
  }

  function spawnEmitter(letter, intensity = 1) {
    const idx = letter.charCodeAt(0) - 97;
    const emitter = {
      letter,
      idx,
      type: idx % 6,
      hue: (idx * (360 / 26)) % 360,
      power: 0.85 + (idx % 6) * 0.18,
      born: performance.now(),
      duration: 700 + (idx % 7) * 120,
      x: state.mouse.x,
      y: state.mouse.y,
      carry: 0,
      intensity
    };

    state.emitters.push(emitter);

    const burstCount = 12 + (idx % 6) * 4;
    for (let i = 0; i < burstCount; i += 1) {
      spawnParticle(emitter, true);
    }
  }

  function spawnParticle(emitter, isBurst = false) {
    const speedBase = [3.9, 2.3, 6.1, 2.8, 3.2, 4.4][emitter.type];
    const lifeBase = [900, 1100, 650, 1000, 850, 800][emitter.type];
    const sizeBase = [6, 10, 4, 8, 7, 6][emitter.type];
    const gravityBase = [0.08, -0.015, 0.02, 0, -0.03, 0.05][emitter.type];

    const angle = Math.random() * Math.PI * 2;
    const speed = speedBase * (isBurst ? 1 + Math.random() * 0.9 : 0.5 + Math.random() * 0.8) * emitter.power;
    const maxLife = lifeBase * (0.7 + Math.random() * 0.7);

    state.particles.push({
      type: emitter.type,
      letter: emitter.letter,
      hue: (emitter.hue + (Math.random() * 60 - 30) + 360) % 360,
      x: emitter.x + (Math.random() * 14 - 7),
      y: emitter.y + (Math.random() * 14 - 7),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: maxLife,
      maxLife,
      size: sizeBase * (0.65 + Math.random() * 0.9),
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() * 0.24 - 0.12),
      drag: 0.93 + Math.random() * 0.045,
      gravity: gravityBase
    });
  }

  function updateEmitters(dt, now) {
    for (let i = state.emitters.length - 1; i >= 0; i -= 1) {
      const emitter = state.emitters[i];
      const age = now - emitter.born;

      if (age > emitter.duration) {
        state.emitters.splice(i, 1);
        continue;
      }

      emitter.x += (state.mouse.x - emitter.x) * 0.28;
      emitter.y += (state.mouse.y - emitter.y) * 0.28;

      const rate = [0.05, 0.08, 0.12, 0.06, 0.09, 0.1][emitter.type] * emitter.intensity * emitter.power;
      emitter.carry += dt * rate;

      while (emitter.carry >= 1) {
        spawnParticle(emitter, false);
        emitter.carry -= 1;
      }
    }
  }

  function updateParticles(dt) {
    const step = dt / 16;

    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const particle = state.particles[i];
      particle.life -= dt;

      if (particle.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }

      particle.vx *= Math.pow(particle.drag, step);
      particle.vy = particle.vy * Math.pow(particle.drag, step) + particle.gravity * step;
      particle.x += particle.vx * step;
      particle.y += particle.vy * step;
      particle.rotation += particle.spin * step;

      if (particle.type === 3) {
        const dx = particle.x - state.mouse.x;
        const dy = particle.y - state.mouse.y;
        const distance = Math.hypot(dx, dy) + 0.001;
        const angle = Math.atan2(dy, dx) + 0.04 * step;
        particle.x = state.mouse.x + Math.cos(angle) * distance;
        particle.y = state.mouse.y + Math.sin(angle) * distance;
      }

      if (particle.type === 5) {
        particle.x += Math.sin((particle.maxLife - particle.life) * 0.03 + particle.hue) * 0.35 * step;
      }
    }
  }

  function drawModeMouseGlow(now) {
    const hue = (now * 0.045) % 360;
    const radius = Math.max(state.width, state.height) * 0.42;
    const glow = bgCtx.createRadialGradient(state.mouse.x, state.mouse.y, 0, state.mouse.x, state.mouse.y, radius);
    glow.addColorStop(0, `hsla(${hue}, 100%, 62%, 0.4)`);
    glow.addColorStop(0.4, `hsla(${(hue + 55) % 360}, 100%, 55%, 0.2)`);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    bgCtx.fillStyle = glow;
    bgCtx.fillRect(0, 0, state.width, state.height);
  }

  function drawModePulse(now) {
    const pulse = 0.45 + Math.sin(now * 0.0032) * 0.35;
    const radius = Math.min(state.width, state.height) * (0.25 + pulse * 0.75);
    const grad = bgCtx.createRadialGradient(state.width / 2, state.height / 2, 0, state.width / 2, state.height / 2, radius);
    grad.addColorStop(0, `rgba(130, 88, 255, ${0.2 + pulse * 0.22})`);
    grad.addColorStop(0.55, `rgba(27, 117, 224, ${0.08 + pulse * 0.1})`);
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(0, 0, state.width, state.height);
  }

  function drawModeRainbowRoll(now) {
    const shift = (now * 0.05) % 360;
    const offset = (now * 0.02) % state.width;
    const rainbow = bgCtx.createLinearGradient(-state.width + offset, 0, offset, state.height);

    for (let i = 0; i <= 6; i += 1) {
      rainbow.addColorStop(i / 6, `hsla(${(shift + i * 60) % 360}, 95%, 58%, 0.16)`);
    }

    bgCtx.fillStyle = rainbow;
    bgCtx.fillRect(0, 0, state.width, state.height);
  }

  function drawModeStarfield(dt, now) {
    const step = dt / 16;
    const parallaxX = (state.mouse.x - state.width / 2) * 0.02;
    const parallaxY = (state.mouse.y - state.height / 2) * 0.02;

    for (let i = 0; i < state.stars.length; i += 1) {
      const star = state.stars[i];
      star.x -= star.speed * step;

      if (star.x < -2) {
        star.x = state.width + 2;
        star.y = Math.random() * state.height;
      }

      const alpha = 0.25 + (Math.sin(now * 0.0025 + star.phase) + 1) * 0.35;
      bgCtx.fillStyle = `rgba(185, 215, 255, ${alpha})`;
      bgCtx.fillRect(star.x + parallaxX, star.y + parallaxY, star.size, star.size);
    }
  }

  function drawModeScanlines(now) {
    for (let y = 0; y < state.height; y += 3) {
      const alpha = 0.02 + (Math.sin(y * 0.08 + now * 0.01) + 1) * 0.014;
      bgCtx.fillStyle = `rgba(72, 255, 175, ${alpha})`;
      bgCtx.fillRect(0, y, state.width, 1);
    }

    const bandX = ((now * 0.12) % (state.width + 260)) - 130;
    const sweep = bgCtx.createLinearGradient(bandX - 100, 0, bandX + 100, 0);
    sweep.addColorStop(0, "rgba(0, 255, 180, 0)");
    sweep.addColorStop(0.5, "rgba(0, 255, 180, 0.09)");
    sweep.addColorStop(1, "rgba(0, 255, 180, 0)");
    bgCtx.fillStyle = sweep;
    bgCtx.fillRect(0, 0, state.width, state.height);
  }

  function drawModeAurora(now) {
    for (let i = 0; i < 4; i += 1) {
      const baseY = state.height * (0.18 + i * 0.16);
      const hue = (now * 0.02 + i * 65) % 360;

      bgCtx.beginPath();
      bgCtx.lineWidth = 56 - i * 10;
      bgCtx.strokeStyle = `hsla(${hue}, 90%, 62%, 0.09)`;
      bgCtx.lineCap = "round";

      for (let x = -40; x <= state.width + 40; x += 20) {
        const y = baseY
          + Math.sin(x * 0.012 + now * 0.0012 * (i + 1)) * (26 + i * 6)
          + Math.cos(x * 0.004 - now * 0.00085) * 18;

        if (x === -40) {
          bgCtx.moveTo(x, y);
        } else {
          bgCtx.lineTo(x, y);
        }
      }

      bgCtx.stroke();
    }
  }

  function drawModeNeonGrid(now) {
    const horizon = state.height * 0.34;
    const glowHue = (now * 0.02 + 180) % 360;

    bgCtx.strokeStyle = `hsla(${glowHue}, 100%, 60%, 0.22)`;
    bgCtx.lineWidth = 1.3;

    for (let i = -12; i <= 12; i += 1) {
      const bottomX = state.width / 2 + i * 85 + Math.sin(now * 0.00035 + i) * 30;
      const topX = state.width / 2 + i * 14;
      bgCtx.beginPath();
      bgCtx.moveTo(bottomX, state.height);
      bgCtx.lineTo(topX, horizon);
      bgCtx.stroke();
    }

    for (let j = 1; j <= 24; j += 1) {
      const p = (j + (now * 0.002 % 1)) / 24;
      const y = horizon + Math.pow(p, 2.3) * (state.height - horizon);
      const alpha = (1 - p) * 0.35;
      bgCtx.strokeStyle = `rgba(66, 255, 235, ${alpha})`;
      bgCtx.beginPath();
      bgCtx.moveTo(0, y);
      bgCtx.lineTo(state.width, y);
      bgCtx.stroke();
    }
  }

  function drawModeTunnel(now) {
    const cx = state.width / 2 + Math.sin(now * 0.00065) * state.width * 0.1;
    const cy = state.height / 2 + Math.cos(now * 0.00055) * state.height * 0.1;
    const maxR = Math.hypot(state.width, state.height);

    for (let i = 0; i < 24; i += 1) {
      const r = ((now * 0.09) + i * 42) % maxR;
      const alpha = Math.max(0, 1 - r / maxR) * 0.3;
      const hue = (now * 0.03 + i * 24) % 360;

      bgCtx.strokeStyle = `hsla(${hue}, 100%, 62%, ${alpha})`;
      bgCtx.lineWidth = 2;
      bgCtx.beginPath();
      bgCtx.arc(cx, cy, r, 0, Math.PI * 2);
      bgCtx.stroke();
    }
  }

  function drawModePlasma(now) {
    for (let i = 0; i < 6; i += 1) {
      const x = state.width * (0.15 + 0.7 * (0.5 + 0.5 * Math.sin(now * 0.00032 * (i + 1) + i)));
      const y = state.height * (0.15 + 0.7 * (0.5 + 0.5 * Math.cos(now * 0.00028 * (i + 2) + i * 1.7)));
      const r = Math.min(state.width, state.height) * (0.14 + 0.06 * Math.sin(now * 0.001 + i));
      const hue = (now * 0.03 + i * 55) % 360;
      const blob = bgCtx.createRadialGradient(x, y, 0, x, y, r);

      blob.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.22)`);
      blob.addColorStop(1, "rgba(0, 0, 0, 0)");
      bgCtx.fillStyle = blob;
      bgCtx.fillRect(0, 0, state.width, state.height);
    }
  }

  function drawBackground(now, dt) {
    bgCtx.clearRect(0, 0, state.width, state.height);
    bgCtx.fillStyle = "#000";
    bgCtx.fillRect(0, 0, state.width, state.height);

    switch (state.backgroundMode) {
      case 1:
        drawModeMouseGlow(now);
        break;
      case 2:
        drawModePulse(now);
        break;
      case 3:
        drawModeRainbowRoll(now);
        break;
      case 4:
        drawModeStarfield(dt, now);
        break;
      case 5:
        drawModeScanlines(now);
        break;
      case 6:
        drawModeAurora(now);
        break;
      case 7:
        drawModeNeonGrid(now);
        break;
      case 8:
        drawModeTunnel(now);
        break;
      case 9:
        drawModePlasma(now);
        break;
      default:
        break;
    }
  }

  function drawParticles() {
    fxCtx.clearRect(0, 0, state.width, state.height);

    for (let i = 0; i < state.particles.length; i += 1) {
      const particle = state.particles[i];
      const ratio = Math.max(0, particle.life / particle.maxLife);
      const alpha = Math.pow(ratio, 0.85);

      if (particle.type === 0) {
        fxCtx.save();
        fxCtx.translate(particle.x, particle.y);
        fxCtx.rotate(particle.rotation);
        fxCtx.fillStyle = `hsla(${particle.hue}, 100%, 62%, ${alpha})`;
        fxCtx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.74);
        fxCtx.restore();
      } else if (particle.type === 1) {
        fxCtx.beginPath();
        fxCtx.fillStyle = `hsla(${particle.hue}, 100%, 70%, ${alpha * 0.7})`;
        fxCtx.arc(particle.x, particle.y, particle.size * (0.55 + (1 - ratio) * 0.45), 0, Math.PI * 2);
        fxCtx.fill();
      } else if (particle.type === 2) {
        fxCtx.strokeStyle = `hsla(${particle.hue}, 100%, 68%, ${alpha})`;
        fxCtx.lineWidth = Math.max(1, particle.size * 0.35);
        fxCtx.beginPath();
        fxCtx.moveTo(particle.x, particle.y);
        fxCtx.lineTo(particle.x - particle.vx * 1.9, particle.y - particle.vy * 1.9);
        fxCtx.stroke();
      } else if (particle.type === 3) {
        fxCtx.strokeStyle = `hsla(${particle.hue}, 100%, 62%, ${alpha})`;
        fxCtx.lineWidth = 1.5;
        fxCtx.beginPath();
        fxCtx.arc(particle.x, particle.y, particle.size * (1 + (1 - ratio) * 2.5), 0, Math.PI * 2);
        fxCtx.stroke();
      } else if (particle.type === 4) {
        fxCtx.save();
        fxCtx.translate(particle.x, particle.y);
        fxCtx.rotate(particle.rotation);
        fxCtx.fillStyle = `hsla(${particle.hue}, 100%, 67%, ${alpha})`;
        fxCtx.beginPath();
        fxCtx.moveTo(0, -particle.size);
        fxCtx.lineTo(particle.size * 0.6, 0);
        fxCtx.lineTo(0, particle.size);
        fxCtx.lineTo(-particle.size * 0.6, 0);
        fxCtx.closePath();
        fxCtx.fill();
        fxCtx.restore();
      } else {
        fxCtx.fillStyle = `hsla(${particle.hue}, 100%, 75%, ${alpha})`;
        fxCtx.font = `${Math.max(10, particle.size * 2)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        fxCtx.textAlign = "center";
        fxCtx.textBaseline = "middle";
        fxCtx.fillText(particle.letter, particle.x, particle.y);
      }
    }
  }

  function frame(now) {
    const dt = Math.min(34, now - state.lastTime);
    state.lastTime = now;

    updateEmitters(dt, now);
    updateParticles(dt);
    drawBackground(now, dt);
    drawParticles();

    requestAnimationFrame(frame);
  }

  function handleKeyDown(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    const { key } = event;

    if (/^[0-9]$/.test(key)) {
      state.backgroundMode = Number(key);
      return;
    }

    if (/^[a-z]$/i.test(key)) {
      spawnEmitter(key.toLowerCase(), event.repeat ? 0.55 : 1);
    }
  }

  window.addEventListener("mousemove", (event) => {
    state.mouse.x = event.clientX;
    state.mouse.y = event.clientY;
  });

  window.addEventListener("touchmove", (event) => {
    if (!event.touches.length) {
      return;
    }

    state.mouse.x = event.touches[0].clientX;
    state.mouse.y = event.touches[0].clientY;
  }, { passive: true });

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("resize", resize);

  resize();
  requestAnimationFrame(frame);
})();