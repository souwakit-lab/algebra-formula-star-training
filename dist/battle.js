/* Full-page sequence arts for the original three-column practice layout. */
const Battle = (() => {
  const timings = Object.freeze({ normal:4600, ultimate:4800 });
  const arts = [
    { key:"tide", icon:"💧", name:"潮汐裂斬", tag:"TIDEBREAK", color:"#70e9ff" },
    { key:"heart", icon:"💗", name:"心光綻放", tag:"HEART BLOOM", color:"#ff91c5" },
    { key:"music", icon:"🎵", name:"星弦共鳴", tag:"STARSTRING RESONANCE", color:"#f6d58a" },
    { key:"leaf", icon:"🍃", name:"翠葉旋舞", tag:"VERDANT SPIRAL", color:"#9deb8c" },
    { key:"butterfly", icon:"🦋", name:"幻蝶流光", tag:"PRISM BUTTERFLIES", color:"#dcabff" },
    { key:"snow", icon:"❄️", name:"霜雪星旋", tag:"FROST NOVA", color:"#b6efff" },
    { key:"abyss", icon:"🌀", name:"深淵絞界", tag:"ABYSSAL MAELSTROM", color:"#bc9aff" },
    { key:"ultimate", icon:"⚔️", name:"星劍天降", tag:"ASTRAL SWORD RAIN", color:"#e5ceff" },
    { key:"aether", icon:"⚡", name:"蒼穹導束", tag:"AETHER LANCE", color:"#8dffce" },
    { key:"core", icon:"☄️", name:"熔核天墜", tag:"CORE FALL", color:"#ff8b54" },
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
    layer?.querySelectorAll(".sequence-banner,.sequence-flash,.sequence-damage").forEach((node) => node.remove());
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

  function stroke(points, color, width=2, alpha=1) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.stroke();
    ctx.restore();
  }

  function arcTrail(x0, y0, x1, y1, bend, color, width=2, alpha=1) {
    const points = [];
    for (let index = 0; index <= 14; index += 1) {
      const q = index / 14;
      points.push([x0 + (x1 - x0) * q, y0 + (y1 - y0) * q + Math.sin(q * Math.PI) * bend]);
    }
    stroke(points, color, width, alpha);
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

  function droplet(x, y, size, color, alpha=1, rotation=0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 2;
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.2);
    ctx.bezierCurveTo(size * .75, -size * .2, size * .7, size * .6, 0, size * .75);
    ctx.bezierCurveTo(-size * .7, size * .6, -size * .75, -size * .2, 0, -size * 1.2);
    ctx.fill();
    ctx.restore();
  }

  function rock(x, y, size, color, alpha=1, rotation=0, seed=0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = "#351817";
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.2, size * .16);
    ctx.shadowColor = color;
    ctx.shadowBlur = size;
    ctx.beginPath();
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * Math.PI * 2;
      const radius = size * (.72 + ((index * 7 + seed * 3) % 5) * .1);
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius * (.78 + ((index + seed) % 3) * .1);
      index ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function ember(x, y, size, color, alpha=1, rotation=0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = color;
    ctx.strokeStyle = "#fff1ad";
    ctx.lineWidth = Math.max(1, size * .1);
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.35);
    ctx.quadraticCurveTo(size * .72, -size * .12, size * .35, size * .72);
    ctx.quadraticCurveTo(0, size * 1.1, -size * .35, size * .72);
    ctx.quadraticCurveTo(-size * .72, -size * .12, 0, -size * 1.35);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function rune(x, y, size, color, alpha=1, rotation=0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * .12);
    ctx.shadowColor = color;
    ctx.shadowBlur = size;
    ctx.beginPath();
    ctx.arc(0, 0, size * .72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * .55, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * .55, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function iceberg(x, y, size, color, alpha=1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.shadowColor = color;
    ctx.shadowBlur = size;
    const gradient = ctx.createLinearGradient(0, -size * 1.7, 0, size);
    gradient.addColorStop(0, "#efffff");
    gradient.addColorStop(.4, color);
    gradient.addColorStop(1, "#256b9b");
    ctx.fillStyle = gradient;
    ctx.strokeStyle = "#d9ffff";
    ctx.lineWidth = Math.max(1, size * .1);
    ctx.beginPath();
    ctx.moveTo(-size * 1.15, size * .75);
    ctx.lineTo(-size * .78, -size * .12);
    ctx.lineTo(-size * .3, -size * 1.55);
    ctx.lineTo(size * .08, -size * .55);
    ctx.lineTo(size * .55, -size * 1.05);
    ctx.lineTo(size * 1.2, size * .72);
    ctx.lineTo(size * .62, size * 1.02);
    ctx.lineTo(-size * .55, size * 1.02);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function flameCone(x0, y0, x1, y1, width, color, alpha=1, phase=0) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length;
    const ny = dx / length;
    const points = [];
    for (let index = 0; index <= 12; index += 1) {
      const q = index / 12;
      const edge = Math.sin(q * Math.PI) * width * (.22 + .78 * q);
      const wobble = Math.sin(phase + q * 18) * width * .12 * q;
      points.push([x0 + dx * q + nx * (edge + wobble), y0 + dy * q + ny * (edge + wobble)]);
    }
    for (let index = 12; index >= 0; index -= 1) {
      const q = index / 12;
      const edge = Math.sin(q * Math.PI) * width * (.22 + .78 * q);
      points.push([x0 + dx * q - nx * edge, y0 + dy * q - ny * edge]);
    }
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, "#fff5b0");
    gradient.addColorStop(.28, "#ffd35a");
    gradient.addColorStop(.72, color);
    gradient.addColorStop(1, `${color}00`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fill();
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

  function motif(key, x, y, size, color, alpha, rotation=0, phase=0) {
    ctx.save();
    ctx.translate(x,y); ctx.rotate(rotation); ctx.scale(size,size);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = .13;
    ctx.shadowColor = color; ctx.shadowBlur = 10;
    ctx.beginPath();
    if (key === "heart") {
      ctx.moveTo(0,.9);
      ctx.bezierCurveTo(-1.6,-.15,-.8,-1.4,0,-.55);
      ctx.bezierCurveTo(.8,-1.4,1.6,-.15,0,.9);
      ctx.fill();
    } else if (key === "leaf") {
      ctx.moveTo(-.85,.7); ctx.quadraticCurveTo(-1,-1.1,.9,-.85);
      ctx.quadraticCurveTo(1.1,.9,-.85,.7); ctx.fill();
      ctx.strokeStyle = "#e7ffd4"; ctx.lineWidth = .08;
      ctx.moveTo(-.8,.7); ctx.lineTo(.65,-.6); ctx.stroke();
    } else if (key === "snow") {
      for (let i=0;i<6;i++) {
        ctx.save(); ctx.rotate(i*Math.PI/3);
        ctx.moveTo(0,0); ctx.lineTo(0,-1);
        ctx.moveTo(-.26,-.53); ctx.lineTo(0,-.75); ctx.lineTo(.26,-.53);
        ctx.stroke(); ctx.restore();
      }
    } else {
      ctx.scale(.45 + Math.abs(Math.sin(phase))* .55,1);
      for (const side of [-1,1]) {
        ctx.moveTo(0,0);
        ctx.bezierCurveTo(side*1.6,-1.7,side*1.7,.1,0,.18);
        ctx.bezierCurveTo(side*1.4,1.5,side*.8,1.6,0,.18);
        ctx.fill();
      }
      ctx.strokeStyle = "#fff3ff"; ctx.moveTo(0,-.5); ctx.lineTo(0,.7); ctx.stroke();
    }
    ctx.restore();
  }

  function drawNatureArt(art, source, target, t, scale) {
    const clamp = (value) => Math.max(0,Math.min(1,value));
    const fade = 1-clamp((t-.86)/.14);
    // Every motif begins at the hero, then fans out towards its destination.
    if (t > .08 && t < .5) for (let i=0;i<20;i++) {
      const q=clamp((t-.08-i*.004)/.29);
      if(q<=0 || q>=1) continue;
      const angle=i*2.399;
      const spread=Math.sin(q*Math.PI)*(35+i%5*14)*scale;
      const x=source.x+(target.x-source.x)*q+Math.cos(angle)*spread;
      const y=source.y+(target.y-source.y)*q+Math.sin(angle)*spread-(art.key==="snow"?Math.sin(q*Math.PI)*140*scale:0);
      motif(art.key,x,y,(9+i%3*3)*scale,art.color,fade,art.key==="heart"?0:angle+t*4,t*40+i);
      glow(x,y,15*scale,art.color,.18*fade);
    }
    if(t<.32) return;
    if(art.key==="heart") {
      const contract=clamp((t-.35)/.3);
      const radius=(115-80*contract)*scale;
      for(let i=0;i<26;i++) {
        const a=i*Math.PI*2/26;
        const x=16*Math.pow(Math.sin(a),3)/17;
        const y=-(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))/17;
        motif("heart",target.x+x*radius,target.y+y*radius,10*scale,art.color,fade,0);
      }
      if(t>.64) {
        const burst=clamp((t-.64)/.3);
        glow(target.x,target.y,140*scale,art.color,(1-burst)*.6);
        for(let i=0;i<3;i++) ring(target.x,target.y,(20+burst*(140+i*35))*scale,art.color,(1-burst)*.8,0);
        for(let i=0;i<24;i++) {
          const a=i*2.399,r=(25+burst*180)*scale;
          motif("heart",target.x+Math.cos(a)*r,target.y+Math.sin(a)*r,12*scale,art.color,(1-burst)*.9,0);
        }
      }
    } else if(art.key==="leaf") {
      const disperse=clamp((t-.76)/.24);
      for(let i=0;i<60;i++) {
        const h=i/59;
        const angle=h*Math.PI*8+t*22;
        const radius=(25+h*65+disperse*130)*scale;
        const x=target.x+Math.cos(angle)*radius;
        const y=target.y+(h-.5)*180*scale+Math.sin(angle)*radius*.24;
        motif("leaf",x,y,(8+i%4)*scale,i%3?art.color:"#e0ffc0",fade,angle,t*35+i);
      }
      for(let i=0;i<4;i++) ring(target.x,target.y+(i-1.5)*40*scale,(35+i*15)*scale,art.color,fade*.4,t*8+i);
    } else if(art.key==="snow") {
      if(t<.68) {
        for(let i=0;i<32;i++) {
          const fall=((t-.32)*2.8+i*.117)%1;
          motif("snow",target.x+Math.sin(i*9.7)*110*scale,target.y+(-160+fall*270)*scale,(8+i%4*2)*scale,art.color,fade,t*4+i);
        }
        const freeze=clamp((t-.4)/.18);
        ctx.save(); ctx.globalAlpha=freeze*.6; ctx.fillStyle="#89ddff";ctx.strokeStyle="#e1fbff";ctx.lineWidth=3;
        ctx.beginPath();
        for(let i=0;i<6;i++) {const a=i*Math.PI/3-Math.PI/2,x=target.x+Math.cos(a)*105*scale,y=target.y+Math.sin(a)*130*scale;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
        ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
        motif("snow",target.x,target.y,65*scale,"#ffffff",freeze*.9,0);
      } else {
        const burst=clamp((t-.68)/.32);
        for(let i=0;i<38;i++) {
          const angle=i*2.399,r=(20+burst*(100+i%6*20))*scale;
          const x=target.x+Math.cos(angle)*r,y=target.y+Math.sin(angle)*r;
          ctx.save();ctx.translate(x,y);ctx.rotate(angle+burst*3);ctx.globalAlpha=fade;ctx.fillStyle=i%2?"#e5fcff":art.color;
          ctx.beginPath();ctx.moveTo(0,-16*scale);ctx.lineTo(8*scale,10*scale);ctx.lineTo(-6*scale,6*scale);ctx.closePath();ctx.fill();ctx.restore();
        }
      }
    } else {
      // Four staggered flocks circle, then dive in from opposing directions.
      for(let i=0;i<24;i++) {
        const attack=clamp((t-.4-(i%4)*.045)/.25);
        const angle=i*Math.PI*2/24+t*(1-attack)*3;
        const radius=(1-attack)*(110+i%3*20)*scale;
        motif("butterfly",target.x+Math.cos(angle)*radius,target.y+Math.sin(angle)*radius*.75,13*scale,i%3?art.color:"#a6f5ff",fade*(1-attack*.7),Math.sin(angle)*.4,t*45+i);
      }
      if(t>.68) {
        const q=clamp((t-.68)/.22);
        const x=source.x+(target.x-source.x)*q,y=source.y+(target.y-source.y)*q;
        glow(x,y,95*scale,art.color,fade*.4);
        motif("butterfly",x,y,(35+q*35)*scale,"#f1d9ff",fade,0,t*30);
      }
    }
  }

  function drawClassicUpgrade(art, source, target, t, scale) {
    const clamp = (n) => Math.max(0,Math.min(1,n));
    const fade = 1-clamp((t-.86)/.14);
    const dx=target.x-source.x, dy=target.y-source.y;
    if (art.key === "tide") {
      // Three water blades spread from the caster, then cross at the dragon.
      for(let i=0;i<3;i++) {
        const q=clamp((t-.13-i*.065)/.4);
        if(q<=0 || q>=1) continue;
        const x=source.x+dx*q,y=source.y+dy*q+Math.sin(q*Math.PI)*(i-1)*100*scale;
        arcTrail(x-45*scale,y+30*scale,x+30*scale,y-35*scale,(i-1)*20*scale,art.color,12*scale,fade);
        for(let j=0;j<5;j++) droplet(x-j*9*scale,y+Math.sin(j+t*15)*10*scale,6*scale,"#c7f8ff",fade*(1-j/6),t*5);
      }
      if(t>.55) {
        const q=clamp((t-.55)/.3);
        for(const side of [-1,1]) arcTrail(target.x-100*scale,target.y+side*80*scale,target.x+100*scale,target.y-side*80*scale,side*45*scale,art.color,18*scale,Math.sin(q*Math.PI));
        for(let i=0;i<24;i++) {const a=i*2.399,r=(20+q*140)*scale;droplet(target.x+Math.cos(a)*r,target.y+Math.sin(a)*r*.65,8*scale,art.color,fade, a);}
      }
    } else if(art.key === "music") {
      // A five-line score unfurls directly from the hero and carries a chord.
      const reach=clamp((t-.1)/.4);
      if(t>.1 && t<.84) for(let line=0;line<5;line++) {
        const points=[];
        for(let j=0;j<=30;j++) {const q=j/30*reach;points.push([source.x+dx*q,source.y+dy*q+Math.sin(q*Math.PI)*(line-2)*20*scale+Math.sin(q*12-t*10)*8*scale]);}
        stroke(points,art.color,1.4*scale,fade*.55);
      }
      if(t>.2 && t<.8) for(let i=0;i<20;i++) {
        const q=clamp((t-.2-i*.009)/.36);
        if(q<=0 || q>=1) continue;
        note(source.x+dx*q,source.y+dy*q+Math.sin(q*Math.PI)*(i%5-2)*23*scale,12*scale,i%2?art.color:"#b2f5ff",fade,Math.sin(t*8+i)*.3);
      }
      if(t>.55) for(let i=0;i<5;i++) {const q=clamp((t-.55-i*.03)/.3);ring(target.x,target.y,(15+q*180)*scale,art.color,(1-q)*fade,t*3+i);}
    } else if(art.key === "aether") {
      // Six braided energy streams charge into a broad finishing lance.
      if(t>.12 && t<.7) for(let beam=0;beam<6;beam++) {
        const reach=clamp((t-.12-beam*.018)/.32),points=[];
        for(let j=0;j<=36;j++) {const q=j/36*reach;points.push([source.x+dx*q,source.y+dy*q+Math.sin(q*Math.PI)*Math.sin(q*10-t*13+beam*Math.PI/3)*50*scale]);}
        stroke(points,beam%2?art.color:"#e6fff5",(beam%2?3:1.5)*scale,fade*.75);
      }
      if(t>.58 && t<.94) {
        const alpha=Math.sin(clamp((t-.58)/.36)*Math.PI);
        arcTrail(source.x,source.y,target.x+65*scale,target.y,0,art.color,70*scale,alpha*.22);
        arcTrail(source.x,source.y,target.x+65*scale,target.y,0,art.color,16*scale,alpha);
        arcTrail(source.x,source.y,target.x+65*scale,target.y,0,"#ffffff",4*scale,alpha);
        ring(target.x,target.y,95*scale,art.color,alpha,t*6);
      }
    } else if(art.key === "core") {
      // Meteor fragments lift out of the hero's charge, then rain down in waves.
      for(let i=0;i<9;i++) {
        const q=clamp((t-.12-i*.024)/.42);
        if(q<=0 || q>=1) continue;
        const x=source.x+(dx+(i%3-1)*55*scale)*q;
        const y=source.y+dy*q-Math.sin(q*Math.PI)*(150+i%3*25)*scale;
        glow(x-8*scale,y-15*scale,25*scale,art.color,.5*fade);
        rock(x,y,(13+i%3*3)*scale,i%2?"#ffd37d":art.color,fade,t*12+i,i);
      }
      if(t>.55) for(let i=0;i<4;i++) {const q=clamp((t-.55-i*.045)/.25);ring(target.x,target.y+25*scale,(20+q*180)*scale,i%2?"#ffe0a1":art.color,(1-q)*fade,t*3);}
    } else if(art.key === "abyss") {
      // Rune chains are physically cast from the hero before the vortex forms.
      if(t>.12 && t<.72) for(let chain=0;chain<4;chain++) {
        const reach=clamp((t-.12-chain*.025)/.4);
        const points=[];
        for(let j=0;j<=28;j++) {
          const q=j/28*reach;
          const x=source.x+dx*q,y=source.y+dy*q+Math.sin(q*Math.PI)*Math.sin(q*8-t*8+chain*Math.PI/2)*75*scale;
          points.push([x,y]);if(j%3===0)rune(x,y,7*scale,art.color,fade,t*4+j);
        }
        stroke(points,art.color,2*scale,fade*.65);
      }
      if(t>.55) for(let i=0;i<36;i++) {
        const q=clamp((t-.55)/.4),a=i*2.399+q*8,r=(1-q)*(95+i%4*18)*scale;
        rune(target.x+Math.cos(a)*r,target.y+Math.sin(a)*r*.7,8*scale,art.color,fade,a);
      }
    } else if(art.key === "ultimate") {
      // Blades rise from the hero into the sky, then plunge vertically.
      for(let i=0;i<15;i++) {
        const q=clamp((t-.1-i*.01)/.3);
        if(q>0 && q<1) sword(source.x+dx*q+(i-7)*8*scale*q,source.y+dy*q-Math.sin(q*Math.PI/2)*190*scale,34*scale,art.color,fade,Math.PI);
        const drop=clamp((t-.42-i*.014)/.22);
        if(drop>0 && drop<1) {
          const x=target.x+(i-7)*15*scale,y=target.y-200*scale+drop*230*scale;
          stroke([[x,y-65*scale],[x,y]],art.color,3*scale,fade*.6);
          sword(x,y,48*scale,i%3?art.color:"#fff5ff",fade,Math.PI);
        }
      }
      if(t>.77) {
        const drop=clamp((t-.77)/.13);
        sword(target.x,target.y-230*scale+drop*230*scale,130*scale,"#fff2ff",fade,Math.PI);
        if(drop>.8) ring(target.x,target.y,(30+clamp((t-.87)/.13)*190)*scale,art.color,fade,t);
      }
    }
  }

  function drawArt(art, source, target, t, particles) {
    const clamp = (value) => Math.max(0, Math.min(1, value));
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.hypot(dx, dy);
    const scale = Math.max(.72, Math.min(1.35, distance / 620));
    const impact = art.key === "core" ? .5 : .64;
    const fade = 1 - clamp((t - .82) / .18);
    const launchStart = .12;
    const launchEnd = art.key === "ultimate" ? .62 : .56;

    // The showcase wind-up follows the real hero position, then travels to the dragon.
    if (t < .45) {
      const envelope = Math.sin(clamp(t / .45) * Math.PI);
      for (let index = 0; index < 3; index += 1) {
        ring(source.x, source.y + 46 * scale, (35 + index * 22) * scale, art.color, envelope * .7, t * 3 + index);
      }
      particles.slice(0, 28).forEach((particle, index) => {
        const radius = (1 - clamp(t / .45)) * (55 + index % 7 * 12) * scale;
        const angle = particle.angle + t * 5;
        glow(source.x + Math.cos(angle) * radius, source.y + Math.sin(angle) * radius, 4 * scale, art.color, envelope * .75);
      });
    }

    if (["heart","leaf","snow","butterfly"].includes(art.key)) {
      drawNatureArt(art,source,target,t,scale);
      return;
    }

    if (t > launchStart && t < launchEnd) {
      const q = clamp((t - launchStart) / (launchEnd - launchStart));
      const px = source.x + dx * q;
      const py = source.y + dy * q - Math.sin(q * Math.PI) * 28 * scale;
      glow(px, py, 25 * scale, art.color, .76);
      if (art.key === "aether") {
        arcTrail(source.x, source.y, px, py, -20 * scale, art.color, 18 * scale, .16);
        arcTrail(source.x, source.y, px, py, -20 * scale, art.color, 5 * scale, .62);
        arcTrail(source.x, source.y, px, py, -20 * scale, "#effff9", 2 * scale, .95);
      } else {
        for (let index = 0; index < 14; index += 1) {
          const ghost = clamp(q - index * .035);
          const gx = source.x + dx * ghost;
          const gy = source.y + dy * ghost - Math.sin(ghost * Math.PI) * 28 * scale + Math.sin(index * 2.4 + t * 10) * 6 * scale;
          const alpha = (1 - index / 16) * .8;
          if (art.key === "tide") droplet(gx, gy, (5 + index % 3) * scale, art.color, alpha, ghost);
          else if (art.key === "core") rock(gx, gy, (7 + index % 3 * 2) * scale, "#ff8a3d", alpha, ghost * 7, index);
          else if (art.key === "abyss") rune(gx, gy, (7 + index % 3 * 2) * scale, art.color, alpha, index * .7);
          else if (art.key === "music") note(gx, gy, (7 + index % 3 * 2) * scale, art.color, alpha, (index % 2 - .5) * .35);
          else sword(gx, gy, (20 + index % 3 * 5) * scale, art.color, alpha, index * .55);
        }
      }
    }

    if (art.key === "tide") {
      if (t > .15 && t < .72) {
        const q = clamp((t - .15) / .57);
        const px = source.x + dx * q;
        const py = source.y + dy * q - Math.sin(q * Math.PI) * 18 * scale;
        const alpha = Math.sin(Math.min(1, (t - .15) / .2) * Math.PI);
        iceberg(px, py, 27 * scale, art.color, alpha);
        for (let index = 0; index < 9; index += 1) droplet(px + (index - 4) * 13 * scale, py + Math.sin(index + t * 6) * 13 * scale, (6 + index % 3 * 2) * scale, art.color, alpha * .65, index * .4);
      }
      if (t > .22 && t < .75) {
        for (let index = 0; index < 12; index += 1) {
          const angle = index * 2.399 + t * 7;
          const radius = 82 * scale * (1 - clamp((t - .5) / .25));
          droplet(target.x + Math.cos(angle) * radius, target.y + Math.sin(angle) * radius * .65, (8 + index % 3 * 2) * scale, art.color, fade * .82, angle);
        }
      }
    } else if (art.key === "core") {
      if (t > .12 && t < .55) {
        const q = clamp((t - .12) / .34);
        const mx = source.x + dx * q;
        const my = source.y + dy * q - Math.sin(q * Math.PI) * 105 * scale;
        for (let index = 8; index >= 0; index -= 1) glow(mx - index * 7, my - index * 11, (22 - index) * scale, art.color, (1 - index / 9) * .7);
        rock(mx, my, 28 * scale, "#ff9a4d", .98, t * 11, 4);
        for (let index = 0; index < 5; index += 1) rock(mx + Math.cos(index * 1.7) * 35 * scale, my + Math.sin(index * 1.7) * 24 * scale, (8 + index % 2 * 4) * scale, "#ffd17b", .8, t * 8, index);
      }
      if (t > .48 && t < .82) {
        const age = clamp((t - .48) / .18);
        const alpha = 1 - clamp((t - .66) / .16);
        glow(target.x, target.y, (55 + age * 125) * scale, art.color, alpha * .75);
        for (let index = 0; index < 28; index += 1) {
          const angle = index * 2.399 + t * 8;
          const radius = (18 + age * (82 + index % 5 * 22)) * scale;
          stroke([[target.x, target.y], [target.x + Math.cos(angle) * radius, target.y + Math.sin(angle) * radius * .52]], index % 2 ? "#ffbd68" : "#ff6c2e", 2 * scale, alpha);
        }
      }
    } else if (art.key === "aether") {
      if (t > .28 && t < .82) {
        const alpha = Math.sin((t - .28) / .54 * Math.PI);
        arcTrail(source.x, source.y, target.x + 45 * scale, target.y, -28 * scale, art.color, 52 * scale, alpha * .18);
        arcTrail(source.x, source.y, target.x + 45 * scale, target.y, -28 * scale, art.color, 9 * scale, alpha * .8);
        arcTrail(source.x, source.y, target.x + 45 * scale, target.y, -28 * scale, "#effff9", 2.5 * scale, alpha);
        for (let index = 0; index < 6; index += 1) ring(target.x, target.y, (12 + index * 11) * scale, art.color, alpha * (1 - index / 7), t * 2 + index);
      }
    } else if (art.key === "abyss") {
      if (t > .56 && t < .94) {
        const age = clamp((t - .56) / .3);
        const radius = (22 + 95 * age) * scale;
        const alpha = 1 - age;
        glow(target.x, target.y, radius * 1.6, art.color, .48 * alpha);
        ctx.save();
        ctx.globalAlpha = .86 * alpha;
        ctx.fillStyle = "#070512";
        ctx.beginPath();
        ctx.arc(target.x, target.y, radius * .62, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        for (let index = 0; index < 7; index += 1) ring(target.x, target.y, radius + index * 6 * scale, art.color, alpha * .8, t * 8 + index * .6);
        for (let index = 0; index < 24; index += 1) {
          const angle = index * 2.4 + t * 14;
          const px = target.x + Math.cos(angle) * radius;
          const py = target.y + Math.sin(angle) * radius * .65;
          rune(px, py, 6 * scale, art.color, alpha * .85, angle);
        }
      }
    } else if (art.key === "music") {
      const q = clamp((t - .14) / .48);
      for (let index = 0; index < 11; index += 1) {
        const travel = clamp(q - index * .055);
        if (travel <= 0 || travel >= 1) continue;
        const px = source.x + dx * travel;
        const py = source.y + dy * travel - Math.sin(travel * Math.PI) * 38 * scale + Math.sin(t * 9 + index) * 10 * scale;
        note(px, py, (8 + index % 3 * 2) * scale, index % 3 ? art.color : "#91dfff", fade, (index % 2 - .5) * .35);
        glow(px, py, 14 * scale, art.color, .24);
      }
      if (t > .48 && t < .86) {
        const pulse = Math.sin((t - .48) / .38 * Math.PI);
        const radius = (26 + 70 * clamp((t - .48) / .18)) * scale;
        for (let index = 0; index < 4; index += 1) ring(target.x, target.y, radius + index * 12 * scale, art.color, pulse * (1 - index * .17), t * 2 + index);
        for (let index = 0; index < 10; index += 1) {
          const angle = index * Math.PI * 2 / 10 + t * 3;
          note(target.x + Math.cos(angle) * radius, target.y + Math.sin(angle) * radius * .45, 7 * scale, art.color, pulse * .8, angle);
        }
      }
    } else {
      if (t < .48) {
        const rise = clamp(t / .22);
        const alpha = 1 - clamp((t - .36) / .16);
        sword(source.x + 62 * rise * scale, source.y, 132 * scale, art.color, alpha, Math.PI / 2);
        for (let index = 0; index < 7; index += 1) ring(source.x, source.y, (38 + index * 15) * scale, art.color, alpha * .5, t * 5 + index);
      }
      const rain = clamp((t - .1) / .34);
      for (let index = 0; index < 22; index += 1) {
        const flight = clamp((rain - index * .024) / .7);
        const offset = (index - 10.5) * 13 * scale;
        const px = source.x + (target.x + offset - source.x) * flight;
        const py = source.y + dy * flight - Math.sin(flight * Math.PI) * 58 * scale + Math.sin(index + t * 8) * 7 * scale;
        if (flight > 0 && flight < 1) sword(px, py, (42 + index % 3 * 9) * scale, index % 3 ? art.color : "#fff4ff", 1 - clamp((flight - .83) / .17), Math.atan2(target.y - py, target.x + offset - px) + Math.PI / 2);
      }
      if (t > .63 && t < .88) {
        const sweep = clamp((t - .63) / .1);
        const alpha = 1 - clamp((t - .75) / .13);
        sword(target.x - 150 * scale + 300 * scale * sweep, target.y, 210 * scale, "#fff7ff", alpha, Math.PI / 2);
        glow(target.x, target.y, 150 * scale, art.color, alpha * .6);
      }
    }

    drawClassicUpgrade(art,source,target,t,scale);

    if (t > impact) {
      const age = clamp((t - impact) / (1 - impact));
      glow(target.x, target.y, 135 * scale, art.color, (1 - age) * .25);
      for (let index = 0; index < 5; index += 1) ring(target.x, target.y, (15 + age * (110 + index * 25)) * scale, art.color, (1 - age) * .65, index * .25);
      particles.slice(0, 70).forEach((particle) => {
        const px = target.x + Math.cos(particle.angle) * particle.radius * age * scale;
        const py = target.y + Math.sin(particle.angle) * particle.radius * age * .65 * scale;
        stroke([[px, py], [px + Math.cos(particle.angle) * 9 * (1 - age), py + Math.sin(particle.angle) * 9 * (1 - age)]], art.color, particle.size, 1 - age);
      });
    }
  }

  function getSkills(level=1) {
    const unlockedCount = Math.min(arts.length, Math.max(1, Math.floor(Number(level) || 1)) * 2);
    return arts.map((art, index) => ({ ...art, unlocked:index < unlockedCount, unlockLevel:Math.floor(index / 2) + 1 }));
  }

  function castSkill(key, combo=0, damage=45, level=1) {
    const art = getSkills(level).find((skill) => skill.key === key && skill.unlocked);
    if (!art) return false;
    cast(art, combo, damage);
    return true;
  }

  function randomCast(combo=0, damage=45, level=3) {
    // Other games retain their existing six-skill random repertoire.
    const legacyOrder = ["tide","core","aether","abyss","music","ultimate"];
    const unlocked = legacyOrder.slice(0,Math.min(6,Math.max(1,Math.floor(Number(level)||1))*2)).map((key) => arts.find((art) => art.key === key));
    const art = unlocked[Math.floor(Math.random() * unlocked.length)];
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
    const particles = Array.from({ length:100 }, (_, index) => ({
      angle:index * 2.39996,
      spread:((index * 47) % 101) / 50 - 1,
      radius:45 + ((index * 67) % 155),
      size:1 + ((index * 29) % 20) / 10,
    }));
    layer.classList.add("is-active");
    hero.classList.add("sequence-casting");
    banner(art, combo);
    const start = performance.now();
    let impacted = false;
    const draw = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      drawArt(art, source, target, progress, particles);
      const impact = art.key === "core" ? .5 : .64;
      if (!impacted && progress > impact) {
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
    const source = pointFor(dragon, .35, .44);
    const target = pointFor(hero, .6, .42);
    const duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 450 : 2600;
    layer.classList.add("is-active", "enemy-active");
    dragon.classList.add("sequence-attacking");
    const art = { name:"龍焰吐息", tag:"CHAOS COUNTER", color:"#ff7048" };
    banner(art, 0);
    const start = performance.now();
    let impacted = false;
    const draw = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const clamp = (value) => Math.max(0, Math.min(1, value));
      const travel = clamp((progress - .18) / .5);
      const fade = 1 - clamp((progress - .68) / .25);
      const x = source.x + (target.x - source.x) * travel;
      const y = source.y + (target.y - source.y) * travel;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      glow(source.x, source.y, 48, "#ff9b3f", .62);
      if (progress < .32) {
        const charge = Math.sin(clamp(progress / .32) * Math.PI);
        glow(source.x - 12, source.y, 38 + charge * 18, "#fff1a6", .72 + charge * .2);
        for (let index = 0; index < 3; index += 1) ring(source.x, source.y, 15 + index * 12 + charge * 8, index % 2 ? "#ff6b32" : "#ffd45f", charge * .72, progress * 7 + index);
        for (let index = 0; index < 12; index += 1) {
          const angle = index * 2.399 + progress * 12;
          const radius = (16 + index % 4 * 7) * (1 - charge * .45);
          ember(source.x + Math.cos(angle) * radius, source.y + Math.sin(angle) * radius * .6, 3 + index % 3, index % 2 ? "#ff6938" : "#ffd45f", charge * .82, angle);
        }
      }
      if (progress > .12 && progress < .78) {
        flameCone(source.x - 8, source.y, x, y, 26 + travel * 42, "#e8422e", fade * .68, progress * 7);
        flameCone(source.x - 12, source.y + 2, x + 10, y + 4, 17 + travel * 28, "#ff8a32", fade * .82, progress * 10 + 1.2);
        flameCone(source.x - 16, source.y, x + 18, y, 7 + travel * 12, "#ffe47a", fade * .94, progress * 13 + 2.1);
        arcTrail(source.x - 8, source.y, x + 12, y, -12 - travel * 16, "#fff4c4", 3 + travel * 3, fade * .9);
        for (let index = 0; index < 32; index += 1) {
          const q = (index / 32 + progress * .9) % 1;
          const px = source.x + (x - source.x) * q;
          const py = source.y + (y - source.y) * q + Math.sin(q * 15 + progress * 13 + index) * (5 + q * 24);
          const size = 3 + q * 6 + index % 3;
          ember(px, py, size, index % 3 ? "#ff7438" : "#ffd65a", fade * (.28 + .62 * (1 - q)), Math.atan2(y - source.y, x - source.x) + q);
          if (index % 4 === 0) glow(px, py, size * 2.4, "#ff9b42", fade * .38);
        }
      }
      if (progress > .55) {
        const age = clamp((progress - .55) / .35);
        const impactFade = 1 - age;
        glow(target.x, target.y, 72 + age * 105, "#ff5b32", impactFade * .58);
        glow(target.x, target.y, 34 + age * 38, "#ffe889", impactFade * .72);
        for (let index = 0; index < 4; index += 1) ring(target.x, target.y, 22 + age * (62 + index * 18), index % 2 ? "#ff6938" : "#ffd96a", impactFade * (1 - index * .14), age * 3 + index);
        for (let index = 0; index < 34; index += 1) {
          const angle = index * 2.399 + age * 2;
          const radius = (12 + index % 9 * 9) * age;
          const px = target.x + Math.cos(angle) * radius;
          const py = target.y + Math.sin(angle) * radius * .62;
          ember(px, py, 3 + index % 4, index % 3 ? "#ff6b36" : "#ffe170", impactFade, angle + Math.PI / 2);
          if (index % 5 === 0) stroke([[target.x, target.y], [px, py]], "#ffc25b", 1.5, impactFade * .65);
        }
      }
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

  return { init, cancel, updateStatus, randomCast, castSkill, getSkills, enemyBreath, timings };
})();
