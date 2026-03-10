(() => {
  const bgCanvas = document.getElementById("bg-canvas");
  const fxCanvas = document.getElementById("fx-canvas");
  const helpEl = document.getElementById("help");
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
    helpVisible: true,
    effects: [],
    stars: [],
    lastTime: performance.now(),
    nextEffectId: 1
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

  function applyHelpVisibility() {
    if (!helpEl) {
      return;
    }

    helpEl.classList.toggle("is-hidden", !state.helpVisible);
  }

  function toggleHelp() {
    state.helpVisible = !state.helpVisible;
    applyHelpVisibility();
  }

  function randomOffset(radius) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * radius;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance
    };
  }

  function letterProfile(letter, variant = "normal") {
    const idx = letter.charCodeAt(0) - 97;
    const profileIndex = variant === "shift" ? (idx + 13) % 26 : idx;
    const base = profileIndex + 1;

    return {
      idx,
      type: profileIndex,
      hue: (idx * (360 / 26) + profileIndex * 11) % 360,
      duration: 1300 + (base % 7) * 230 + Math.floor(base / 7) * 120,
      spawnRadius: 20 + (base % 6) * 13,
      follow: 0.13 + (base % 5) * 0.022,
      anchorRadius: 26 + (base % 8) * 11,
      anchorSpeed: 0.00045 + (base % 9) * 0.00012,
      anchorJitter: 5 + (base % 7) * 2.2,
      ribbonSpawnMs: 14 + (base % 6) * 7,
      ribbonLifeMs: 680 + (base % 8) * 100,
      trailSpread: 6 + (base % 5) * 3,
      rippleSpawnMs: 80 + (base % 6) * 24,
      rippleGrowth: 0.09 + (base % 7) * 0.024,
      rippleLifeMs: 700 + (base % 8) * 95,
      orbitSatellites: 3 + (base % 6),
      orbitRadius: 20 + (base % 6) * 6,
      orbitWarp: 0.75 + (base % 5) * 0.18,
      shardSpikes: 6 + (base % 7),
      shardLength: 14 + (base % 6) * 4,
      shardWobble: 3 + (base % 7) * 1.2,
      boltSegments: 10 + (base % 10),
      boltSpread: 34 + (base % 8) * 9,
      boltSpawnMs: 70 + (base % 6) * 16,
      boltLifeMs: 170 + (base % 7) * 22,
      sonarSpawnMs: 95 + (base % 7) * 22,
      sonarArcMin: 0.9 + (base % 4) * 0.25,
      sonarArcRange: 0.45 + (base % 5) * 0.2,
      sonarReach: 64 + (base % 9) * 12,
      petals: 4 + (base % 8),
      petalLen: 24 + (base % 8) * 5,
      petalWidth: 8 + (base % 6) * 1.8,
      petalSpin: 0.55 + (base % 7) * 0.14,
      gridSize: 86 + (base % 9) * 20,
      gridStep: 14 + (base % 5) * 4,
      gridBend: 4 + (base % 8) * 1.6,
      echoSpawnMs: 46 + (base % 8) * 12,
      echoLifeMs: 560 + (base % 7) * 90,
      echoSize: 14 + (base % 10) * 2.2,
      echoRise: 0.022 + (base % 6) * 0.008,
      echoDrift: 0.16 + (base % 7) * 0.05,
      sigMode: profileIndex,
      sigAmpX: 10 + (base % 9) * 4.5,
      sigAmpY: 9 + ((base * 3) % 9) * 4,
      sigFreqX: 0.7 + (base % 7) * 0.22,
      sigFreqY: 0.65 + ((base * 2) % 7) * 0.2,
      sigSpin: 0.7 + (base % 6) * 0.17,
      sigPulse: 0.9 + (base % 5) * 0.24,
      sigDrift: (base % 2 === 0 ? -1 : 1) * (6 + (base % 6) * 2.4)
    };
  }

  function newEffect(letter, intensity = 1, variant = "normal") {
    const profile = letterProfile(letter, variant);
    const type = profile.type;
    const spawnRadius = profile.spawnRadius;
    const startOffset = randomOffset(spawnRadius);
    const effect = {
      id: state.nextEffectId++,
      letter,
      type,
      hue: profile.hue,
      born: performance.now(),
      duration: profile.duration,
      x: state.mouse.x + startOffset.x,
      y: state.mouse.y + startOffset.y,
      vx: 0,
      vy: 0,
      phase: Math.random() * Math.PI * 2,
      seed: Math.random() * 1000,
      intensity,
      follow: profile.follow,
      spawnRadius,
      anchorRadius: profile.anchorRadius,
      anchorAngle: Math.random() * Math.PI * 2,
      anchorSpeed: (profile.anchorSpeed + Math.random() * 0.00035) * (Math.random() > 0.5 ? 1 : -1),
      anchorJitter: profile.anchorJitter,
      profile
    };

    if (type === 0) {
      effect.points = [];
      effect.spawnMs = 0;
    } else if (type === 1) {
      effect.rings = [];
      effect.spawnMs = 0;
    } else if (type === 2) {
      effect.radius = 34;
    } else if (type === 3) {
      effect.spin = (Math.random() * 0.002 + 0.0014) * (Math.random() > 0.5 ? 1 : -1);
    } else if (type === 4) {
      effect.bolts = [];
      effect.spawnMs = 0;
    } else if (type === 5) {
      effect.waves = [];
      effect.spawnMs = 0;
    } else if (type === 6) {
      effect.petals = profile.petals;
    } else if (type === 7) {
      effect.gridSize = profile.gridSize;
    } else if (type === 8) {
      effect.ghosts = [];
      effect.spawnMs = 0;
    }

    state.effects.push(effect);

    if (state.effects.length > 26) {
      state.effects.shift();
    }
  }

  function signatureOffset(effect, now, age) {
    const profile = effect.profile;
    const t = age * 0.001;
    const pulse = 0.5 + 0.5 * Math.sin(t * profile.sigPulse + effect.seed * 0.017);
    const waveA = Math.sin(t * profile.sigFreqX + effect.seed * 0.019);
    const waveB = Math.cos(t * profile.sigFreqY + effect.seed * 0.013);
    let x = 0;
    let y = 0;
    let followScale = 1;
    let phaseRate = 0.0023;

    switch (profile.sigMode) {
      case 0: {
        const r = (0.35 + pulse) * profile.sigAmpX;
        const a = t * profile.sigSpin + effect.seed * 0.01;
        x = Math.cos(a) * r;
        y = Math.sin(a * 1.3) * r * 0.72;
        followScale = 0.95;
        phaseRate = 0.0028;
        break;
      }
      case 1:
        x = waveA * profile.sigAmpX;
        y = Math.sin(t * profile.sigFreqY * 2 + effect.seed * 0.012) * Math.cos(t * profile.sigFreqX) * profile.sigAmpY * 0.9;
        followScale = 1.05;
        break;
      case 2: {
        const a = t * profile.sigSpin * 1.6;
        const r = (0.4 + pulse * 1.2) * profile.sigAmpX;
        x = Math.cos(a) * (r + Math.sin(a * 3) * profile.sigAmpX * 0.4);
        y = Math.sin(a) * (r * 0.6 + Math.cos(a * 2) * profile.sigAmpY * 0.4);
        phaseRate = 0.0029;
        break;
      }
      case 3:
        x = (2 / Math.PI) * Math.asin(Math.sin(t * profile.sigFreqX * 1.8 + effect.seed * 0.009)) * profile.sigAmpX;
        y = waveB * profile.sigAmpY * 0.8;
        followScale = 1.08;
        break;
      case 4:
        x = Math.sin(t * profile.sigFreqX + effect.seed * 0.01) * profile.sigAmpX * 1.2;
        y = Math.cos(t * profile.sigFreqX * 0.5 + effect.seed * 0.008) * Math.abs(Math.sin(t * profile.sigFreqY)) * profile.sigAmpY;
        followScale = 0.9;
        break;
      case 5: {
        const a = t * profile.sigSpin + effect.seed * 0.01;
        const r = profile.sigAmpX * (0.55 + 0.45 * Math.cos(3 * a));
        x = Math.cos(a) * r;
        y = Math.sin(a) * r * 0.8;
        phaseRate = 0.003;
        break;
      }
      case 6: {
        const sx = Math.sign(Math.sin(t * profile.sigFreqX + effect.seed * 0.007));
        const sy = Math.sign(Math.cos(t * profile.sigFreqY + effect.seed * 0.011));
        x = sx * profile.sigAmpX * (0.5 + 0.5 * pulse) + waveA * profile.sigAmpX * 0.25;
        y = sy * profile.sigAmpY * (0.5 + 0.5 * (1 - pulse)) + waveB * profile.sigAmpY * 0.2;
        phaseRate = 0.0031;
        break;
      }
      case 7: {
        const a = t * profile.sigSpin * 2;
        x = Math.cos(a) * (profile.sigAmpX * 0.4 + pulse * profile.sigAmpX);
        y = Math.sin(a * 0.6) * profile.sigAmpY + Math.cos(a * 2.4) * profile.sigAmpY * 0.3;
        followScale = 1.1;
        break;
      }
      case 8: {
        const beat = Math.pow(Math.max(0, Math.sin(t * profile.sigPulse * 3.2 + effect.seed * 0.02)), 3);
        x = waveA * (profile.sigAmpX * 0.35 + beat * profile.sigAmpX * 1.1);
        y = waveB * (profile.sigAmpY * 0.35 + beat * profile.sigAmpY * 0.9);
        followScale = 0.88 + beat * 0.5;
        phaseRate = 0.002 + beat * 0.002;
        break;
      }
      case 9: {
        const drift = profile.sigDrift * (0.3 + 0.7 * pulse);
        x = waveA * profile.sigAmpX + Math.sin(t * 0.8 + effect.seed) * drift;
        y = waveB * profile.sigAmpY + Math.cos(t * 1.1 + effect.seed * 0.7) * drift * 0.7;
        followScale = 1.02;
        break;
      }
      case 10:
        x = Math.sin(t * profile.sigFreqX) * profile.sigAmpX;
        y = Math.sin(t * profile.sigFreqX * 2 + effect.seed * 0.015) * profile.sigAmpY;
        phaseRate = 0.0029;
        break;
      case 11: {
        const a = t * profile.sigSpin * 1.2;
        const r = profile.sigAmpX * (1 - Math.sin(a));
        x = Math.cos(a) * r * 0.5;
        y = Math.sin(a) * r * 0.5;
        followScale = 0.9;
        break;
      }
      case 12:
        x = ((2 / Math.PI) * Math.asin(Math.sin(t * profile.sigFreqX * 1.4))) * profile.sigAmpX;
        y = Math.sin(t * profile.sigFreqY * 1.7) * profile.sigAmpY * 0.55;
        phaseRate = 0.0032;
        break;
      case 13: {
        const a = t * profile.sigSpin * 1.5;
        const r = profile.sigAmpX * (0.25 + t * 0.18 % 1);
        x = Math.cos(a) * r;
        y = Math.sin(a) * r;
        followScale = 0.92;
        break;
      }
      case 14: {
        const a = t * profile.sigSpin * 2.1;
        x = Math.cos(a) * profile.sigAmpX * 0.75;
        y = Math.sin(a * 0.5) * profile.sigAmpY + Math.cos(a) * profile.sigAmpY * 0.35;
        break;
      }
      case 15: {
        const a = t * profile.sigSpin;
        x = Math.cos(a) * profile.sigAmpX * Math.cos(2 * a);
        y = Math.sin(a) * profile.sigAmpY * Math.cos(2 * a);
        phaseRate = 0.003;
        break;
      }
      case 16:
        x = Math.sin(t * profile.sigFreqX) * profile.sigAmpX;
        y = Math.sin(t * profile.sigFreqY + Math.sin(t * 1.7)) * profile.sigAmpY * 0.8;
        followScale = 1.08;
        break;
      case 17: {
        const a = t * profile.sigSpin;
        const x1 = Math.cos(a) * profile.sigAmpX * 0.7;
        const y1 = Math.sin(a) * profile.sigAmpY * 0.7;
        const x2 = Math.cos(a * 2.2 + effect.seed) * profile.sigAmpX * 0.4;
        const y2 = Math.sin(a * 2.2 + effect.seed) * profile.sigAmpY * 0.4;
        x = x1 + x2;
        y = y1 + y2;
        break;
      }
      case 18:
        x = ((2 / Math.PI) * Math.asin(Math.sin(t * profile.sigFreqX))) * profile.sigAmpX;
        y = ((2 / Math.PI) * Math.asin(Math.sin(t * profile.sigFreqY * 1.8 + effect.seed * 0.02))) * profile.sigAmpY * 0.8;
        followScale = 0.96;
        break;
      case 19: {
        const a = t * profile.sigSpin * 1.1;
        x = Math.sin(a) * profile.sigAmpX;
        y = Math.asin(Math.sin(a * 2 + effect.seed * 0.015)) * (profile.sigAmpY * 0.55);
        break;
      }
      case 20: {
        const beat = Math.max(0, Math.sin(t * profile.sigPulse * 4 + effect.seed * 0.02));
        x = waveA * profile.sigAmpX * (0.4 + beat);
        y = waveB * profile.sigAmpY * (0.4 + beat);
        followScale = 0.82 + beat * 0.55;
        phaseRate = 0.0019 + beat * 0.0022;
        break;
      }
      case 21:
        x = Math.sin(t * profile.sigFreqX) * profile.sigAmpX;
        y = Math.abs(Math.sin(t * profile.sigFreqY)) * profile.sigAmpY - profile.sigAmpY * 0.5;
        followScale = 1.05;
        break;
      case 22:
        x = Math.sin(t * profile.sigFreqX) * profile.sigAmpX + Math.sin(t * profile.sigFreqX * 3) * profile.sigAmpX * 0.28;
        y = Math.cos(t * profile.sigFreqY) * profile.sigAmpY + Math.cos(t * profile.sigFreqY * 2.7) * profile.sigAmpY * 0.24;
        phaseRate = 0.0031;
        break;
      case 23: {
        const a = t * profile.sigSpin * 1.4;
        const r = profile.sigAmpX * (0.6 + 0.4 * Math.sin(5 * a));
        x = Math.cos(a) * r;
        y = Math.sin(a) * r * 0.7;
        break;
      }
      case 24: {
        const snap = Math.round(Math.sin(t * profile.sigFreqX + effect.seed * 0.01) * 2) / 2;
        x = snap * profile.sigAmpX;
        y = Math.sin(t * profile.sigFreqY * 1.4) * profile.sigAmpY * 0.9;
        followScale = 1.14;
        phaseRate = 0.0033;
        break;
      }
      case 25: {
        const a = t * profile.sigSpin * 0.9;
        const drift = profile.sigDrift * 0.7;
        x = Math.cos(a) * profile.sigAmpX * 0.8 + Math.sin(t * 0.6 + effect.seed * 0.1) * drift;
        y = Math.sin(a * 1.5) * profile.sigAmpY * 0.8 + Math.cos(t * 0.5 + effect.seed * 0.12) * drift;
        followScale = 0.94;
        break;
      }
      default:
        break;
    }

    return { x, y, followScale, phaseRate };
  }

  function updateEffects(dt, now) {
    for (let i = state.effects.length - 1; i >= 0; i -= 1) {
      const effect = state.effects[i];
      const age = now - effect.born;

      if (age > effect.duration) {
        state.effects.splice(i, 1);
        continue;
      }

      const prevX = effect.x;
      const prevY = effect.y;
      const signature = signatureOffset(effect, now, age);
      const follow = (effect.follow + effect.intensity * 0.04) * signature.followScale;

      effect.anchorAngle += effect.anchorSpeed * dt;
      const jitterX = Math.sin(now * 0.0032 + effect.seed) * effect.anchorJitter;
      const jitterY = Math.cos(now * 0.0027 + effect.seed * 1.3) * effect.anchorJitter;
      const targetX = state.mouse.x + Math.cos(effect.anchorAngle) * effect.anchorRadius + jitterX + signature.x;
      const targetY = state.mouse.y + Math.sin(effect.anchorAngle) * effect.anchorRadius + jitterY + signature.y;

      effect.x += (targetX - effect.x) * follow;
      effect.y += (targetY - effect.y) * follow;
      effect.vx = effect.x - prevX;
      effect.vy = effect.y - prevY;
      effect.phase += dt * signature.phaseRate;

      if (effect.type === 0) {
        effect.spawnMs -= dt;
        if (effect.spawnMs <= 0) {
          const offset = randomOffset(effect.profile.trailSpread + effect.spawnRadius * 0.22);
          effect.points.push({
            x: effect.x + offset.x,
            y: effect.y + offset.y,
            life: 1
          });
          effect.spawnMs = effect.profile.ribbonSpawnMs;
        }

        for (let p = effect.points.length - 1; p >= 0; p -= 1) {
          effect.points[p].life -= dt / effect.profile.ribbonLifeMs;
          if (effect.points[p].life <= 0) {
            effect.points.splice(p, 1);
          }
        }
      } else if (effect.type === 1) {
        effect.spawnMs -= dt;
        if (effect.spawnMs <= 0) {
          const offset = randomOffset(effect.profile.trailSpread + 6 + effect.spawnRadius * 0.25);
          effect.rings.push({
            r: 6,
            life: 1,
            ox: offset.x,
            oy: offset.y
          });
          effect.spawnMs = effect.profile.rippleSpawnMs / effect.intensity;
        }

        for (let r = effect.rings.length - 1; r >= 0; r -= 1) {
          effect.rings[r].r += dt * effect.profile.rippleGrowth;
          effect.rings[r].life -= dt / effect.profile.rippleLifeMs;
          if (effect.rings[r].life <= 0) {
            effect.rings.splice(r, 1);
          }
        }
      } else if (effect.type === 4) {
        effect.spawnMs -= dt;
        if (effect.spawnMs <= 0) {
          const edgeIndex = Math.floor((effect.seed + now * 0.001) % 4);
          let sx = 0;
          let sy = 0;

          if (edgeIndex === 0) {
            sx = -20;
            sy = Math.random() * state.height;
          } else if (edgeIndex === 1) {
            sx = state.width + 20;
            sy = Math.random() * state.height;
          } else if (edgeIndex === 2) {
            sx = Math.random() * state.width;
            sy = -20;
          } else {
            sx = Math.random() * state.width;
            sy = state.height + 20;
          }

          const points = [];
          const segments = effect.profile.boltSegments;

          for (let s = 0; s <= segments; s += 1) {
            const t = s / segments;
            const spread = (1 - t) * effect.profile.boltSpread;
            points.push({
              x: sx + (effect.x - sx) * t + (Math.random() * 2 - 1) * spread,
              y: sy + (effect.y - sy) * t + (Math.random() * 2 - 1) * spread
            });
          }

          effect.bolts.push({
            points,
            life: 1
          });

          effect.spawnMs = effect.profile.boltSpawnMs;
        }

        for (let b = effect.bolts.length - 1; b >= 0; b -= 1) {
          effect.bolts[b].life -= dt / effect.profile.boltLifeMs;
          if (effect.bolts[b].life <= 0) {
            effect.bolts.splice(b, 1);
          }
        }
      } else if (effect.type === 5) {
        effect.spawnMs -= dt;
        if (effect.spawnMs <= 0) {
          const offset = randomOffset(14 + effect.spawnRadius * 0.3);
          effect.waves.push({
            r: 12,
            life: 1,
            arc: Math.PI * (effect.profile.sonarArcMin + Math.random() * effect.profile.sonarArcRange),
            start: Math.random() * Math.PI * 2,
            ox: offset.x,
            oy: offset.y
          });
          effect.spawnMs = effect.profile.sonarSpawnMs;
        }

        for (let w = effect.waves.length - 1; w >= 0; w -= 1) {
          effect.waves[w].r += dt * (0.1 + effect.profile.sonarReach * 0.0012);
          effect.waves[w].life -= dt / (780 + effect.profile.sonarReach * 4);
          if (effect.waves[w].life <= 0) {
            effect.waves.splice(w, 1);
          }
        }
      } else if (effect.type === 8) {
        effect.spawnMs -= dt;
        if (effect.spawnMs <= 0) {
          effect.ghosts.push({
            x: effect.x + (Math.random() * 2 - 1) * 10,
            y: effect.y + (Math.random() * 2 - 1) * 10,
            life: 1,
            angle: (Math.random() * 2 - 1) * 0.25,
            size: effect.profile.echoSize * (0.75 + Math.random() * 0.9),
            drift: (Math.random() * 2 - 1) * effect.profile.echoDrift
          });
          effect.spawnMs = effect.profile.echoSpawnMs;
        }

        for (let g = effect.ghosts.length - 1; g >= 0; g -= 1) {
          const ghost = effect.ghosts[g];
          ghost.life -= dt / effect.profile.echoLifeMs;
          ghost.y -= dt * effect.profile.echoRise;
          ghost.x += ghost.drift * (dt / 16);

          if (ghost.life <= 0) {
            effect.ghosts.splice(g, 1);
          }
        }
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

  function drawEffectRibbon(effect, fade) {
    if (effect.points.length < 2) {
      return;
    }

    fxCtx.save();
    fxCtx.lineCap = "round";
    fxCtx.lineJoin = "round";
    fxCtx.shadowBlur = 16;
    fxCtx.shadowColor = `hsla(${effect.hue}, 100%, 65%, 0.7)`;

    for (let i = 1; i < effect.points.length; i += 1) {
      const p0 = effect.points[i - 1];
      const p1 = effect.points[i];
      const a = Math.min(p0.life, p1.life) * fade;
      fxCtx.strokeStyle = `hsla(${(effect.hue + i * 3) % 360}, 100%, 65%, ${a * 0.8})`;
      fxCtx.lineWidth = (2 + p1.life * 8) * fade;
      fxCtx.beginPath();
      fxCtx.moveTo(p0.x, p0.y);
      fxCtx.lineTo(p1.x, p1.y);
      fxCtx.stroke();
    }

    fxCtx.restore();
  }

  function drawEffectRipple(effect, fade) {
    fxCtx.save();
    fxCtx.lineWidth = 1.8;
    fxCtx.strokeStyle = `hsla(${effect.hue}, 100%, 70%, ${0.7 * fade})`;

    for (let i = 0; i < effect.rings.length; i += 1) {
      const ring = effect.rings[i];
      fxCtx.globalAlpha = ring.life * fade;
      fxCtx.beginPath();
      fxCtx.arc(effect.x + ring.ox, effect.y + ring.oy, ring.r, 0, Math.PI * 2);
      fxCtx.stroke();
    }

    fxCtx.globalAlpha = 0.8 * fade;
    fxCtx.beginPath();
    fxCtx.arc(effect.x, effect.y, 4, 0, Math.PI * 2);
    fxCtx.fillStyle = `hsla(${effect.hue}, 100%, 70%, ${0.75 * fade})`;
    fxCtx.fill();

    fxCtx.restore();
  }

  function drawEffectOrbit(effect, now, fade) {
    const satellites = effect.profile.orbitSatellites;
    const radius = effect.profile.orbitRadius + Math.sin(effect.phase * 3) * (3 + effect.profile.orbitWarp * 2.2);

    fxCtx.save();
    fxCtx.strokeStyle = `hsla(${effect.hue}, 100%, 64%, ${0.35 * fade})`;
    fxCtx.lineWidth = 1;
    fxCtx.beginPath();
    fxCtx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    fxCtx.stroke();

    for (let i = 0; i < satellites; i += 1) {
      const a = effect.phase * 2.1 + i * (Math.PI * 2 / satellites);
      const orbitShift = effect.profile.orbitWarp + 0.18 * Math.sin(now * 0.0017 + i);
      const sx = effect.x + Math.cos(a) * radius * orbitShift;
      const sy = effect.y + Math.sin(a * 1.1) * radius * orbitShift;
      const size = 2 + (i % 3) + effect.profile.orbitWarp * 0.6;

      fxCtx.beginPath();
      fxCtx.fillStyle = `hsla(${(effect.hue + i * 24) % 360}, 100%, 72%, ${0.8 * fade})`;
      fxCtx.arc(sx, sy, size, 0, Math.PI * 2);
      fxCtx.fill();

      fxCtx.strokeStyle = `hsla(${effect.hue}, 100%, 68%, ${0.18 * fade})`;
      fxCtx.beginPath();
      fxCtx.moveTo(effect.x, effect.y);
      fxCtx.lineTo(sx, sy);
      fxCtx.stroke();
    }

    fxCtx.restore();
  }

  function drawEffectShards(effect, fade) {
    const spikes = effect.profile.shardSpikes;
    const baseR = 14 + Math.sin(effect.phase * 2.5) * effect.profile.shardWobble;
    const spin = effect.phase * 3.2;

    fxCtx.save();
    fxCtx.translate(effect.x, effect.y);
    fxCtx.rotate(spin);

    for (let i = 0; i < spikes; i += 1) {
      const a = i * (Math.PI * 2 / spikes);
      const r1 = baseR;
      const r2 = baseR + effect.profile.shardLength + Math.sin(effect.phase * 4 + i) * effect.profile.shardWobble;

      fxCtx.beginPath();
      fxCtx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      fxCtx.lineTo(Math.cos(a + 0.12) * r2, Math.sin(a + 0.12) * r2);
      fxCtx.lineTo(Math.cos(a - 0.12) * r2, Math.sin(a - 0.12) * r2);
      fxCtx.closePath();
      fxCtx.fillStyle = `hsla(${(effect.hue + i * 14) % 360}, 100%, 65%, ${(0.2 + (i % 3) * 0.11) * fade})`;
      fxCtx.fill();
    }

    fxCtx.restore();
  }

  function drawEffectLightning(effect, fade) {
    fxCtx.save();
    fxCtx.lineCap = "round";
    fxCtx.lineJoin = "round";
    fxCtx.shadowBlur = 12;
    fxCtx.shadowColor = `hsla(${effect.hue}, 100%, 65%, 0.8)`;

    for (let i = 0; i < effect.bolts.length; i += 1) {
      const bolt = effect.bolts[i];
      const alpha = bolt.life * fade;

      fxCtx.strokeStyle = `hsla(${effect.hue}, 100%, 72%, ${alpha})`;
      fxCtx.lineWidth = 2.1;
      fxCtx.beginPath();
      fxCtx.moveTo(bolt.points[0].x, bolt.points[0].y);
      for (let p = 1; p < bolt.points.length; p += 1) {
        fxCtx.lineTo(bolt.points[p].x, bolt.points[p].y);
      }
      fxCtx.stroke();

      fxCtx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
      fxCtx.lineWidth = 1;
      fxCtx.stroke();
    }

    fxCtx.beginPath();
    fxCtx.fillStyle = `hsla(${effect.hue}, 100%, 70%, ${0.5 * fade})`;
    fxCtx.arc(effect.x, effect.y, 8, 0, Math.PI * 2);
    fxCtx.fill();

    fxCtx.restore();
  }

  function drawEffectSonar(effect, now, fade) {
    fxCtx.save();
    fxCtx.lineWidth = 1.8;

    for (let i = 0; i < effect.waves.length; i += 1) {
      const wave = effect.waves[i];
      const rot = wave.start + now * 0.0018;
      const wx = effect.x + wave.ox;
      const wy = effect.y + wave.oy;

      fxCtx.strokeStyle = `hsla(${(effect.hue + i * 10) % 360}, 100%, 66%, ${wave.life * 0.8 * fade})`;
      fxCtx.beginPath();
      fxCtx.arc(wx, wy, wave.r, rot, rot + wave.arc);
      fxCtx.stroke();
    }

    const sweep = now * 0.006 + effect.seed;
    const sweepReach = effect.profile.sonarReach;
    fxCtx.strokeStyle = `hsla(${effect.hue}, 100%, 72%, ${0.45 * fade})`;
    fxCtx.beginPath();
    fxCtx.moveTo(effect.x, effect.y);
    fxCtx.lineTo(effect.x + Math.cos(sweep) * sweepReach, effect.y + Math.sin(sweep) * sweepReach);
    fxCtx.stroke();

    fxCtx.restore();
  }

  function drawEffectFlower(effect, fade) {
    const petals = effect.petals;
    const petalLen = effect.profile.petalLen + Math.sin(effect.phase * 3) * 8;
    const petalWidth = effect.profile.petalWidth + Math.sin(effect.phase * 2.2) * 3;

    fxCtx.save();
    fxCtx.translate(effect.x, effect.y);

    for (let i = 0; i < petals; i += 1) {
      const a = i * (Math.PI * 2 / petals) + effect.phase * effect.profile.petalSpin;
      fxCtx.save();
      fxCtx.rotate(a);
      fxCtx.beginPath();
      fxCtx.ellipse(0, petalLen * 0.35, petalWidth, petalLen, 0, 0, Math.PI * 2);
      fxCtx.fillStyle = `hsla(${(effect.hue + i * 18) % 360}, 100%, 62%, ${0.2 * fade})`;
      fxCtx.strokeStyle = `hsla(${(effect.hue + i * 18) % 360}, 100%, 70%, ${0.45 * fade})`;
      fxCtx.lineWidth = 1.2;
      fxCtx.fill();
      fxCtx.stroke();
      fxCtx.restore();
    }

    fxCtx.beginPath();
    fxCtx.fillStyle = `hsla(${effect.hue}, 100%, 76%, ${0.65 * fade})`;
    fxCtx.arc(0, 0, 7, 0, Math.PI * 2);
    fxCtx.fill();

    fxCtx.restore();
  }

  function drawEffectGridWarp(effect, fade) {
    const range = effect.gridSize;
    const lineStep = effect.profile.gridStep;

    fxCtx.save();
    fxCtx.strokeStyle = `hsla(${effect.hue}, 100%, 70%, ${0.22 * fade})`;
    fxCtx.lineWidth = 1;

    for (let gx = -range; gx <= range; gx += lineStep) {
      fxCtx.beginPath();
      for (let y = -range; y <= range; y += 12) {
        const d = Math.hypot(gx, y);
        const falloff = Math.max(0, 1 - d / range);
        const bend = Math.sin(d * 0.08 - effect.phase * 7) * effect.profile.gridBend * falloff;
        const px = effect.x + gx + bend * (gx / (range || 1));
        const py = effect.y + y + bend * (y / (range || 1));

        if (y === -range) {
          fxCtx.moveTo(px, py);
        } else {
          fxCtx.lineTo(px, py);
        }
      }
      fxCtx.stroke();
    }

    for (let gy = -range; gy <= range; gy += lineStep) {
      fxCtx.beginPath();
      for (let x = -range; x <= range; x += 12) {
        const d = Math.hypot(x, gy);
        const falloff = Math.max(0, 1 - d / range);
        const bend = Math.cos(d * 0.08 - effect.phase * 7) * effect.profile.gridBend * falloff;
        const px = effect.x + x + bend * (x / (range || 1));
        const py = effect.y + gy + bend * (gy / (range || 1));

        if (x === -range) {
          fxCtx.moveTo(px, py);
        } else {
          fxCtx.lineTo(px, py);
        }
      }
      fxCtx.stroke();
    }

    fxCtx.restore();
  }

  function drawEffectTypeEcho(effect, fade) {
    fxCtx.save();
    fxCtx.textAlign = "center";
    fxCtx.textBaseline = "middle";
    fxCtx.font = `700 ${Math.round(effect.profile.echoSize)}px ui-monospace, SFMono-Regular, Menlo, monospace`;

    for (let i = 0; i < effect.ghosts.length; i += 1) {
      const ghost = effect.ghosts[i];
      fxCtx.save();
      fxCtx.translate(ghost.x, ghost.y);
      fxCtx.rotate(ghost.angle);
      fxCtx.globalAlpha = ghost.life * fade * 0.85;
      fxCtx.fillStyle = `hsla(${(effect.hue + i * 9) % 360}, 100%, 72%, 1)`;
      fxCtx.font = `700 ${ghost.size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      fxCtx.fillText(effect.letter, 0, 0);
      fxCtx.restore();
    }

    fxCtx.fillStyle = `hsla(${effect.hue}, 100%, 76%, ${0.9 * fade})`;
    fxCtx.font = `700 ${Math.round(effect.profile.echoSize * 1.25)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    fxCtx.fillText(effect.letter, effect.x, effect.y);
    fxCtx.restore();
  }

  function drawEffectRune(effect, now, fade) {
    const mode = effect.type - 9;
    const t = now * 0.001 + effect.seed * 0.01;
    const r = 12 + effect.profile.spawnRadius * 0.25;

    fxCtx.save();
    fxCtx.translate(effect.x, effect.y);
    fxCtx.rotate(effect.phase * 1.4);
    fxCtx.lineCap = "round";
    fxCtx.lineJoin = "round";
    fxCtx.strokeStyle = `hsla(${effect.hue}, 100%, 70%, ${0.6 * fade})`;
    fxCtx.fillStyle = `hsla(${(effect.hue + 25) % 360}, 100%, 70%, ${0.22 * fade})`;
    fxCtx.lineWidth = 1.2 + effect.profile.orbitWarp * 0.45;

    if (mode === 0) {
      const n = 3;
      fxCtx.beginPath();
      for (let i = 0; i <= n; i += 1) {
        const a = t * 2 + i * (Math.PI * 2 / n);
        const rr = r * (1 + 0.35 * Math.sin(t * 3 + i));
        const px = Math.cos(a) * rr;
        const py = Math.sin(a) * rr;
        if (i === 0) {
          fxCtx.moveTo(px, py);
        } else {
          fxCtx.lineTo(px, py);
        }
      }
      fxCtx.closePath();
      fxCtx.fill();
      fxCtx.stroke();
    } else if (mode === 1) {
      for (let i = 0; i < 4; i += 1) {
        const s = r * (0.7 + i * 0.35 + 0.15 * Math.sin(t * 2 + i));
        fxCtx.save();
        fxCtx.rotate(t * 0.8 + i * 0.3);
        fxCtx.strokeRect(-s, -s, s * 2, s * 2);
        fxCtx.restore();
      }
    } else if (mode === 2) {
      for (let i = 0; i < 11; i += 1) {
        const p = i / 10;
        const px = (p - 0.5) * r * 2.4;
        const py = Math.sin(p * Math.PI * 2 + t * 4) * r * 0.55;
        fxCtx.beginPath();
        fxCtx.arc(px, py, 1.6 + p * 2.2, 0, Math.PI * 2);
        fxCtx.fill();
      }
    } else if (mode === 3) {
      for (let i = 0; i < 5; i += 1) {
        const start = t + i * 0.6;
        fxCtx.beginPath();
        fxCtx.arc(0, 0, r * (0.6 + i * 0.3), start, start + Math.PI * (0.5 + 0.25 * Math.sin(t + i)));
        fxCtx.stroke();
      }
    } else if (mode === 4) {
      fxCtx.beginPath();
      fxCtx.moveTo(-r * 1.4, 0);
      fxCtx.lineTo(r * 1.4, 0);
      fxCtx.moveTo(0, -r * 1.4);
      fxCtx.lineTo(0, r * 1.4);
      fxCtx.stroke();
      fxCtx.beginPath();
      fxCtx.arc(0, 0, r * (0.7 + 0.25 * Math.sin(t * 3)), 0, Math.PI * 2);
      fxCtx.stroke();
    } else if (mode === 5) {
      for (let i = 0; i < 24; i += 1) {
        const p = i / 24;
        const a = p * Math.PI * 4 + t * 3;
        const rr = r * (0.2 + p * 1.5);
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        const nx = Math.cos(a) * 4;
        const ny = Math.sin(a) * 4;
        fxCtx.beginPath();
        fxCtx.moveTo(x - nx, y - ny);
        fxCtx.lineTo(x + nx, y + ny);
        fxCtx.stroke();
      }
    } else if (mode === 6) {
      const spikes = 7;
      fxCtx.beginPath();
      for (let i = 0; i < spikes * 2; i += 1) {
        const a = i * Math.PI / spikes;
        const rr = i % 2 === 0 ? r * 1.45 : r * 0.58;
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (i === 0) {
          fxCtx.moveTo(x, y);
        } else {
          fxCtx.lineTo(x, y);
        }
      }
      fxCtx.closePath();
      fxCtx.stroke();
    } else if (mode === 7) {
      fxCtx.beginPath();
      fxCtx.arc(-r * 0.35, 0, r * 0.7, Math.PI * 0.5, Math.PI * 1.5);
      fxCtx.arc(r * 0.35, 0, r * 0.7, Math.PI * 1.5, Math.PI * 0.5);
      fxCtx.stroke();
      fxCtx.beginPath();
      fxCtx.arc(-r * 0.35, 0, 2.5, 0, Math.PI * 2);
      fxCtx.arc(r * 0.35, 0, 2.5, 0, Math.PI * 2);
      fxCtx.fill();
    } else if (mode === 8) {
      const petals = 6;
      for (let i = 0; i < petals; i += 1) {
        fxCtx.save();
        fxCtx.rotate(i * Math.PI * 2 / petals + t);
        fxCtx.beginPath();
        fxCtx.ellipse(0, r * 0.65, r * 0.2, r * 0.7, 0, 0, Math.PI * 2);
        fxCtx.stroke();
        fxCtx.restore();
      }
    } else if (mode === 9) {
      fxCtx.beginPath();
      fxCtx.moveTo(0, 0);
      fxCtx.arc(0, 0, r * 1.5, -0.25 + t * 1.3, 0.35 + t * 1.3);
      fxCtx.closePath();
      fxCtx.fill();
      fxCtx.beginPath();
      fxCtx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
      fxCtx.stroke();
    } else if (mode === 10) {
      const step = r * 0.45;
      for (let i = -2; i <= 2; i += 1) {
        fxCtx.beginPath();
        fxCtx.moveTo(i * step, -r * 1.2);
        fxCtx.lineTo(i * step + Math.sin(t + i) * 5, r * 1.2);
        fxCtx.stroke();
      }
      for (let j = -2; j <= 2; j += 1) {
        fxCtx.beginPath();
        fxCtx.moveTo(-r * 1.2, j * step);
        fxCtx.lineTo(r * 1.2, j * step + Math.cos(t + j) * 5);
        fxCtx.stroke();
      }
    } else if (mode === 11) {
      for (let i = 0; i < 5; i += 1) {
        const y = (i - 2) * r * 0.35;
        fxCtx.beginPath();
        fxCtx.moveTo(-r * 0.9, y);
        fxCtx.lineTo(0, y + r * 0.2);
        fxCtx.lineTo(r * 0.9, y);
        fxCtx.stroke();
      }
    } else if (mode === 12) {
      const n = 8;
      for (let i = 0; i < n; i += 1) {
        const a = t * 2 + i * (Math.PI * 2 / n);
        const rr = r * (0.45 + i * 0.12);
        fxCtx.beginPath();
        fxCtx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 1.8 + i * 0.25, 0, Math.PI * 2);
        fxCtx.fill();
      }
    } else if (mode === 13) {
      const flames = 5;
      for (let i = 0; i < flames; i += 1) {
        const a = i * Math.PI * 2 / flames + t * 1.2;
        fxCtx.save();
        fxCtx.rotate(a);
        fxCtx.beginPath();
        fxCtx.moveTo(0, -r * 0.2);
        fxCtx.quadraticCurveTo(r * 0.35, r * 0.25, 0, r * 1.15);
        fxCtx.quadraticCurveTo(-r * 0.35, r * 0.25, 0, -r * 0.2);
        fxCtx.stroke();
        fxCtx.restore();
      }
    } else if (mode === 14) {
      for (let i = -4; i <= 4; i += 1) {
        const y = i * r * 0.27;
        const sway = Math.sin(t * 2 + i) * r * 0.2;
        fxCtx.beginPath();
        fxCtx.moveTo(-r * 0.6 + sway, y);
        fxCtx.lineTo(r * 0.6 - sway, y);
        fxCtx.stroke();
      }
      fxCtx.beginPath();
      fxCtx.moveTo(-r * 0.7, -r * 1.2);
      fxCtx.lineTo(-r * 0.3, r * 1.2);
      fxCtx.moveTo(r * 0.7, -r * 1.2);
      fxCtx.lineTo(r * 0.3, r * 1.2);
      fxCtx.stroke();
    } else if (mode === 15) {
      for (let i = 0; i < 20; i += 1) {
        const a = i * (Math.PI * 2 / 20);
        const rr = r * (0.5 + Math.sin(t * 3 + i) * 0.3 + (i % 4) * 0.12);
        const s = 2 + (i % 3);
        fxCtx.fillRect(Math.cos(a) * rr - s * 0.5, Math.sin(a) * rr - s * 0.5, s, s);
      }
    } else {
      fxCtx.beginPath();
      for (let i = 0; i < 48; i += 1) {
        const p = i / 48;
        const a = p * Math.PI * 6 + t * 2;
        const rr = r * (0.1 + p * 1.7);
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (i === 0) {
          fxCtx.moveTo(x, y);
        } else {
          fxCtx.lineTo(x, y);
        }
      }
      fxCtx.stroke();
      fxCtx.beginPath();
      fxCtx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
      fxCtx.fill();
    }

    fxCtx.restore();
  }

  function drawEffects(now) {
    fxCtx.clearRect(0, 0, state.width, state.height);

    for (let i = 0; i < state.effects.length; i += 1) {
      const effect = state.effects[i];
      const age = now - effect.born;
      const fade = Math.max(0, 1 - age / effect.duration);

      if (effect.type === 0) {
        drawEffectRibbon(effect, fade);
      } else if (effect.type === 1) {
        drawEffectRipple(effect, fade);
      } else if (effect.type === 2) {
        drawEffectOrbit(effect, now, fade);
      } else if (effect.type === 3) {
        drawEffectShards(effect, fade);
      } else if (effect.type === 4) {
        drawEffectLightning(effect, fade);
      } else if (effect.type === 5) {
        drawEffectSonar(effect, now, fade);
      } else if (effect.type === 6) {
        drawEffectFlower(effect, fade);
      } else if (effect.type === 7) {
        drawEffectGridWarp(effect, fade);
      } else if (effect.type === 8) {
        drawEffectTypeEcho(effect, fade);
      } else {
        drawEffectRune(effect, now, fade);
      }
    }
  }

  function frame(now) {
    const dt = Math.min(34, now - state.lastTime);
    state.lastTime = now;

    updateEffects(dt, now);
    drawBackground(now, dt);
    drawEffects(now);

    requestAnimationFrame(frame);
  }

  function handleKeyDown(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    const { key } = event;

    if (key === "`") {
      toggleHelp();
      return;
    }

    if (/^[0-9]$/.test(key)) {
      state.backgroundMode = Number(key);
      return;
    }

    if (/^[a-z]$/i.test(key)) {
      const intensity = (event.repeat ? 0.55 : 1) * (event.shiftKey ? 1.15 : 1);
      newEffect(key.toLowerCase(), intensity, event.shiftKey ? "shift" : "normal");
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
  applyHelpVisibility();
  requestAnimationFrame(frame);
})();