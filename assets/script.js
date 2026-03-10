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

  function newEffect(letter, intensity = 1, variant = "normal") {
    const idx = letter.charCodeAt(0) - 97;
    const type = variant === "shift" ? (idx + 4) % 9 : idx % 9;
    const spawnRadius = 24 + (idx % 6) * 14;
    const startOffset = randomOffset(spawnRadius);
    const effect = {
      id: state.nextEffectId++,
      letter,
      type,
      hue: (idx * (360 / 26)) % 360,
      born: performance.now(),
      duration: 1600 + (idx % 6) * 240,
      x: state.mouse.x + startOffset.x,
      y: state.mouse.y + startOffset.y,
      vx: 0,
      vy: 0,
      phase: Math.random() * Math.PI * 2,
      seed: Math.random() * 1000,
      intensity,
      spawnRadius,
      anchorRadius: 30 + (idx % 7) * 12,
      anchorAngle: Math.random() * Math.PI * 2,
      anchorSpeed: (Math.random() * 0.0012 + 0.0005) * (Math.random() > 0.5 ? 1 : -1),
      anchorJitter: 7 + (idx % 5) * 2
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
      effect.petals = 5 + (idx % 4);
    } else if (type === 7) {
      effect.gridSize = 120 + (idx % 5) * 12;
    } else {
      effect.ghosts = [];
      effect.spawnMs = 0;
    }

    state.effects.push(effect);

    if (state.effects.length > 26) {
      state.effects.shift();
    }
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
      const follow = 0.16 + effect.intensity * 0.05;

      effect.anchorAngle += effect.anchorSpeed * dt;
      const jitterX = Math.sin(now * 0.0032 + effect.seed) * effect.anchorJitter;
      const jitterY = Math.cos(now * 0.0027 + effect.seed * 1.3) * effect.anchorJitter;
      const targetX = state.mouse.x + Math.cos(effect.anchorAngle) * effect.anchorRadius + jitterX;
      const targetY = state.mouse.y + Math.sin(effect.anchorAngle) * effect.anchorRadius + jitterY;

      effect.x += (targetX - effect.x) * follow;
      effect.y += (targetY - effect.y) * follow;
      effect.vx = effect.x - prevX;
      effect.vy = effect.y - prevY;
      effect.phase += dt * 0.0023;

      if (effect.type === 0) {
        effect.spawnMs -= dt;
        if (effect.spawnMs <= 0) {
          const offset = randomOffset(8 + effect.spawnRadius * 0.22);
          effect.points.push({
            x: effect.x + offset.x,
            y: effect.y + offset.y,
            life: 1
          });
          effect.spawnMs = 20;
        }

        for (let p = effect.points.length - 1; p >= 0; p -= 1) {
          effect.points[p].life -= dt / 900;
          if (effect.points[p].life <= 0) {
            effect.points.splice(p, 1);
          }
        }
      } else if (effect.type === 1) {
        effect.spawnMs -= dt;
        if (effect.spawnMs <= 0) {
          const offset = randomOffset(10 + effect.spawnRadius * 0.25);
          effect.rings.push({
            r: 6,
            life: 1,
            ox: offset.x,
            oy: offset.y
          });
          effect.spawnMs = 115 / effect.intensity;
        }

        for (let r = effect.rings.length - 1; r >= 0; r -= 1) {
          effect.rings[r].r += dt * 0.14;
          effect.rings[r].life -= dt / 1000;
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
          const segments = 17;

          for (let s = 0; s <= segments; s += 1) {
            const t = s / segments;
            const spread = (1 - t) * 68;
            points.push({
              x: sx + (effect.x - sx) * t + (Math.random() * 2 - 1) * spread,
              y: sy + (effect.y - sy) * t + (Math.random() * 2 - 1) * spread
            });
          }

          effect.bolts.push({
            points,
            life: 1
          });

          effect.spawnMs = 95;
        }

        for (let b = effect.bolts.length - 1; b >= 0; b -= 1) {
          effect.bolts[b].life -= dt / 230;
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
            arc: Math.PI * (1.2 + Math.random() * 0.7),
            start: Math.random() * Math.PI * 2,
            ox: offset.x,
            oy: offset.y
          });
          effect.spawnMs = 130;
        }

        for (let w = effect.waves.length - 1; w >= 0; w -= 1) {
          effect.waves[w].r += dt * 0.18;
          effect.waves[w].life -= dt / 1100;
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
            size: 16 + Math.random() * 16,
            drift: (Math.random() * 2 - 1) * 0.35
          });
          effect.spawnMs = 72;
        }

        for (let g = effect.ghosts.length - 1; g >= 0; g -= 1) {
          const ghost = effect.ghosts[g];
          ghost.life -= dt / 880;
          ghost.y -= dt * 0.03;
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
    const satellites = 5;
    const radius = 26 + Math.sin(effect.phase * 3) * 8;

    fxCtx.save();
    fxCtx.strokeStyle = `hsla(${effect.hue}, 100%, 64%, ${0.35 * fade})`;
    fxCtx.lineWidth = 1;
    fxCtx.beginPath();
    fxCtx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    fxCtx.stroke();

    for (let i = 0; i < satellites; i += 1) {
      const a = effect.phase * 2.1 + i * (Math.PI * 2 / satellites);
      const orbitShift = 1 + 0.3 * Math.sin(now * 0.0017 + i);
      const sx = effect.x + Math.cos(a) * radius * orbitShift;
      const sy = effect.y + Math.sin(a * 1.1) * radius * orbitShift;
      const size = 3 + (i % 2);

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
    const spikes = 9;
    const baseR = 18 + Math.sin(effect.phase * 2.5) * 4;
    const spin = effect.phase * 3.2;

    fxCtx.save();
    fxCtx.translate(effect.x, effect.y);
    fxCtx.rotate(spin);

    for (let i = 0; i < spikes; i += 1) {
      const a = i * (Math.PI * 2 / spikes);
      const r1 = baseR;
      const r2 = baseR + 20 + Math.sin(effect.phase * 4 + i) * 7;

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
    fxCtx.strokeStyle = `hsla(${effect.hue}, 100%, 72%, ${0.45 * fade})`;
    fxCtx.beginPath();
    fxCtx.moveTo(effect.x, effect.y);
    fxCtx.lineTo(effect.x + Math.cos(sweep) * 92, effect.y + Math.sin(sweep) * 92);
    fxCtx.stroke();

    fxCtx.restore();
  }

  function drawEffectFlower(effect, fade) {
    const petals = effect.petals;
    const petalLen = 34 + Math.sin(effect.phase * 3) * 8;
    const petalWidth = 10 + Math.sin(effect.phase * 2.2) * 3;

    fxCtx.save();
    fxCtx.translate(effect.x, effect.y);

    for (let i = 0; i < petals; i += 1) {
      const a = i * (Math.PI * 2 / petals) + effect.phase * 0.9;
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
    const lineStep = 18;

    fxCtx.save();
    fxCtx.strokeStyle = `hsla(${effect.hue}, 100%, 70%, ${0.22 * fade})`;
    fxCtx.lineWidth = 1;

    for (let gx = -range; gx <= range; gx += lineStep) {
      fxCtx.beginPath();
      for (let y = -range; y <= range; y += 12) {
        const d = Math.hypot(gx, y);
        const falloff = Math.max(0, 1 - d / range);
        const bend = Math.sin(d * 0.08 - effect.phase * 7) * 8 * falloff;
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
        const bend = Math.cos(d * 0.08 - effect.phase * 7) * 8 * falloff;
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
    fxCtx.font = "700 22px ui-monospace, SFMono-Regular, Menlo, monospace";

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
    fxCtx.font = "700 28px ui-monospace, SFMono-Regular, Menlo, monospace";
    fxCtx.fillText(effect.letter, effect.x, effect.y);
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
      } else {
        drawEffectTypeEcho(effect, fade);
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