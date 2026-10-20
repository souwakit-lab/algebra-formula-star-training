/* Full-page sequence arts for the original three-column practice layout. */
const Battle = (() => {
  const timings = Object.freeze({ normal:1900, ultimate:2100 });
  const arts = [
    { key:"tide", name:"潮汐裂斬", tag:"TIDEBREAK", color:"#70e9ff", sprite:"2" },
    { key:"core", name:"熔核天墜", tag:"CORE FALL", color:"#ff8b54", sprite:"5" },
    { key:"aether", name:"蒼穹導束", tag:"AETHER LANCE", color:"#8dffce", sprite:"10" },
    { key:"abyss", name:"深淵絞界", tag:"ABYSSAL MAELSTROM", color:"#bc9aff", sprite:"3" },
    { key:"music", name:"星弦共鳴", tag:"STARSTRING RESONANCE", color:"#f6d58a" },
    { key:"ultimate", name:"星劍天降", tag:"ASTRAL SWORD RAIN", color:"#e5ceff", sprite:"ultimate" },
  ];
  let layer;
  let canvas;
  let ctx;
  let frame;
  let timer;
  let status = { combo:0, bossHp:300000, bossMaxHp:300000 };

  function init() {
    layer = document.getElementById("battle-effect-layer");
    if (!layer) return;
    canvas = document.createElement("canvas");
    canvas.className = "sequence-effect-canvas";
    canvas.setAttribute("aria-hidden", "true");
    layer.append(canvas);
    ctx = canvas.getContext("2d");
  }

  function updateStatus(next) {
    status = { ...status, ...next };
  }

  function cancel() {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    layer?.querySelectorAll(".sequence-banner,.sequence-sprite,.sequence-flash,.sequence-damage").forEach((node) => node.remove());
    document.getElementById("player-avatar")?.classList.remove("sequence-casting", "sequence-hit");
    document.getElementById("dragon-avatar")?.classList.remove("sequence-attacking", "sequence-hit");
    layer?.classList.remove("is-active", "enemy-active");
  }

  function pointFor(element, xRatio=.5, yRatio=.48) {
    const rect = element.getBoundingClientRect();
    return { x:rect.left + rect.width * xRatio, y:rect.top + rect.height * yRatio };
  }

  function prepareCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function banner(art, combo) {
    const node = document.createElement("div");
    node.className = "sequence-banner";
    node.style.setProperty("--skill-color", art.color);
    node.innerHTML = `<small>${art.tag}</small><strong>${art.name}</strong><span>${combo ? `${combo} 連答` : "星序術式"}</span>`;
    layer.append(node);
  }

  function sprite(art) {
    if (!art.sprite) return;
    const node = document.createElement("div");
    node.className = "sequence-sprite";
    node.dataset.skill = art.sprite;
    node.style.setProperty("--skill-color", art.color);
    layer.append(node);
  }

  function flash(color) {
    const node = document.createElement("div");
    node.className = "sequence-flash";
    node.style.setProperty("--skill-color", color);
    layer.append(node);
  }

  function damageLabel(damage, target, color) {
    const node = document.createElement("div");
    node.className = "sequence-damage";
    node.textContent = `−${damage}`;
    node.style.left = `${target.x}px`;
    node.style.top = `${target.y}px`;
    node.style.setProperty("--skill-color", color);
    layer.append(node);
  }

  function glow(x, y, radius, color, alpha=1) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, radius));
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(.15, color);
    gradient.addColorStop(1, `${color}00`);
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  function line(x1, y1, x2, y2, color, width, alpha=1) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function ring(x, y, radius, color, alpha=1, rotation=0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * .36, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function note(x, y, size, color, alpha, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, size * .12);
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * .42, size * .28, -.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(size * .3, 0);
    ctx.lineTo(size * .3, -size * 1.35);
    ctx.quadraticCurveTo(size, -size * 1.2, size * .8, -size * .65);
    ctx.stroke();
    ctx.restore();
  }

  function sword(x, y, size, color, alpha, rotation=0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * .12, -size * .1);
    ctx.lineTo(0, size * .2);
    ctx.lineTo(-size * .12, -size * .1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * .3, size * .2);
    ctx.lineTo(size * .3, size * .2);
    ctx.stroke();
    ctx.restore();
  }

  function drawArt(art, source, target, progress, particles) {
    const ease = 1 - Math.pow(1 - Math.min(1, progress), 3);
    const x = source.x + (target.x - source.x) * ease;
    const y = source.y + (target.y - source.y) * ease;
    const fade = progress < .8 ? 1 : (1 - progress) / .2;

    if (art.key === "tide") {
      for (let index = 0; index < 5; index += 1) {
        const offset = (index - 2) * 12;
        line(source.x, source.y + offset, x, y + Math.sin(progress * 20 + index) * 18 + offset, art.color, 7 - index * .7, fade * .75);
      }
      glow(x, y, 65, art.color, fade);
    } else if (art.key === "core") {
      particles.slice(0, 14).forEach((particle, index) => {
        const drop = Math.min(1, progress * 1.35 - index * .018);
        if (drop <= 0) return;
        const px = target.x + particle.spread * 120;
        const py = -80 + (target.y + 80) * drop;
        glow(px, py, 20 + particle.size * 6, index % 2 ? "#ffdc72" : art.color, fade);
        line(px - 15, py - 50, px, py, "#ffcc70", 5, fade);
      });
      if (progress > .62) glow(target.x, target.y, 155 * (progress - .55), art.color, fade);
    } else if (art.key === "aether") {
      line(source.x, source.y, target.x, target.y, art.color, 28 * Math.sin(Math.min(1, progress * 1.5) * Math.PI), fade * .5);
      line(source.x, source.y, target.x, target.y, "#ffffff", 7, fade);
      for (let index = 0; index < 4; index += 1) ring(source.x, source.y, 25 + index * 19, art.color, fade * .75, progress * 4 + index);
      glow(target.x, target.y, 80, art.color, fade);
    } else if (art.key === "abyss") {
      particles.slice(0, 34).forEach((particle, index) => {
        const angle = progress * 9 + particle.angle + index * .13;
        const radius = (1 - Math.min(1, progress * 1.15)) * (80 + particle.size * 55) + 12;
        glow(target.x + Math.cos(angle) * radius, target.y + Math.sin(angle) * radius * .55, 9, art.color, fade * .8);
      });
      for (let index = 0; index < 4; index += 1) ring(target.x, target.y, 28 + index * 20, art.color, fade, -progress * 5 + index);
    } else if (art.key === "music") {
      particles.slice(0, 26).forEach((particle, index) => {
        const travel = Math.min(1, Math.max(0, progress * 1.4 - index * .018));
        const px = source.x + (target.x - source.x) * travel;
        const py = source.y + (target.y - source.y) * travel + Math.sin(travel * 8 + index) * (35 + particle.size * 12);
        note(px, py, 8 + particle.size * 5, index % 2 ? art.color : "#91dfff", fade, particle.angle);
      });
      for (let index = 0; index < 3; index += 1) ring(target.x, target.y, 35 + index * 28 + progress * 40, art.color, fade, progress + index);
    } else {
      particles.slice(0, 28).forEach((particle, index) => {
        const delay = index * .012;
        const drop = Math.min(1, Math.max(0, (progress - delay) * 1.65));
        const px = target.x + particle.spread * 220;
        const py = -120 + (target.y + 130) * drop;
        sword(px, py, 30 + particle.size * 13, index % 3 ? art.color : "#ffffff", fade, -.14 + particle.spread * .08);
      });
      if (progress > .52) glow(target.x, target.y, 130, art.color, fade);
    }
  }

  function randomCast(combo=0, damage=45) {
    const art = arts[Math.floor(Math.random() * arts.length)];
    cast(art, combo, damage);
  }

  function cast(art, combo=0, damage=45) {
    cancel();
    const hero = document.getElementById("player-avatar");
    const dragon = document.getElementById("dragon-avatar");
    if (!hero || !dragon || !ctx) return;
    prepareCanvas();
    const source = pointFor(hero, .58, .42);
    const target = pointFor(dragon, .5, .48);
    const duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 500 : art.key === "ultimate" ? timings.ultimate : timings.normal;
    const particles = Array.from({ length:60 }, (_, index) => ({
      angle:index * 2.39996,
      spread:((index * 47) % 101) / 50 - 1,
      size:.4 + ((index * 29) % 70) / 70,
    }));
    layer.classList.add("is-active");
    hero.classList.add("sequence-casting");
    banner(art, combo);
    sprite(art);
    const start = performance.now();
    let impacted = false;
    const draw = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      drawArt(art, source, target, progress, particles);
      if (!impacted && progress > .62) {
        impacted = true;
        dragon.classList.add("sequence-hit");
        flash(art.color);
        damageLabel(damage, target, art.color);
      }
      if (progress < 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    timer = setTimeout(cancel, duration + 120);
  }

  function enemyBreath() {
    cancel();
    const hero = document.getElementById("player-avatar");
    const dragon = document.getElementById("dragon-avatar");
    if (!hero || !dragon || !ctx) return;
    prepareCanvas();
    const source = pointFor(dragon, .28, .48);
    const target = pointFor(hero, .6, .42);
    const duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 450 : 1150;
    layer.classList.add("is-active", "enemy-active");
    dragon.classList.add("sequence-attacking");
    const art = { name:"龍焰吐息", tag:"CHAOS COUNTER", color:"#ff7048" };
    banner(art, 0);
    const start = performance.now();
    let impacted = false;
    const draw = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      const x = source.x + (target.x - source.x) * ease;
      const y = source.y + (target.y - source.y) * ease;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let index = 0; index < 8; index += 1) {
        const offset = Math.sin(progress * 22 + index) * 18;
        line(source.x, source.y + offset * .25, x, y + offset, index % 2 ? "#ffd35e" : "#ff7048", 18 - index, 1 - progress * .35);
      }
      glow(x, y, 55, "#ff7b42", 1 - progress * .4);
      if (!impacted && progress > .68) {
        impacted = true;
        hero.classList.add("sequence-hit");
        flash("#ff7048");
      }
      if (progress < 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    timer = setTimeout(cancel, duration + 120);
  }

  return { init, cancel, updateStatus, randomCast, enemyBreath, timings };
})();
