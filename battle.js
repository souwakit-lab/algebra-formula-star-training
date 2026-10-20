/* Rift Arts: bounded, time-based combat presentation. Gameplay owns damage. */
const Battle = (() => {
  const timings = Object.freeze({normal:4600, ultimate:4800});
  const arts = {
    2:{name:'潮汐裂斬', tag:'TIDEBREAK', color:'#76eaff'},
    5:{name:'熔核天墜', tag:'CORE FALL', color:'#ff9054'},
    10:{name:'蒼穹導束', tag:'AETHER LANCE', color:'#8dffce'},
    3:{name:'深淵絞界', tag:'ABYSSAL MAELSTROM', color:'#bc9aff'},
    music:{name:'星弦共鳴', tag:'STARSTRING RESONANCE', color:'#f6d58a'},
    ultimate:{name:'星劍天降', tag:'ASTRAL SWORD RAIN', color:'#e5ceff'}
  };
  const el=id=>document.getElementById(id);
  let canvas,ctx,frame,watchdog,busy=false,sound=false,audio;
  const clamp=n=>Math.max(0,Math.min(1,n));
  function cancel() {
    cancelAnimationFrame(frame); clearTimeout(watchdog); busy=false;
    document.querySelector('.battle-arena')?.classList.remove('is-casting','limit-active','impact-active');
    document.querySelector('.battle-arena')?.classList.remove('enemy-casting');
    el('vfx-overlay')?.classList.remove('vfx-active');
    el('frame-vfx')?.classList.remove('frame-active');
    if (el('vfx-overlay')) delete el('vfx-overlay').dataset.vfx;
    document.querySelectorAll('[data-skill],#ultimate-preview').forEach(b=>{b.disabled=false;b.classList.remove('skill-active');});
    if (!canvas) return;
    ctx?.clearRect(0,0,canvas.width,canvas.height);
    el('battle-monster').classList.remove('battle-hit');
    el('battle-hero').classList.remove('battle-casting');
    el('battle-monster').classList.remove('monster-breathing');
    el('battle-damage').classList.remove('damage-rise');
    el('cast-phase').textContent='就緒';el('cast-time').textContent='—';el('cast-fill').style.transform='scaleX(0)';
  }
  function updateStatus({combo,bossHp,bossMaxHp}) {
    const hp=clamp(bossHp/Math.max(1,bossMaxHp))*100;
    el('combat-hp').textContent=`${hp.toFixed(1)}%`;el('combat-hp-fill').style.width=`${hp}%`;
    el('qi-copy').textContent=`${combo} 連答`;
    [...el('qi-pips').children].forEach((p,i)=>p.classList.toggle('charged',i<combo%5));
  }
  function hitSound(key) {
    if(!sound) return;
    try {
      audio ||= new (window.AudioContext||window.webkitAudioContext)(); audio.resume();
      for(let i=0;i<2;i++) {
        const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
        osc.type=i?'sine':'triangle';osc.frequency.setValueAtTime(i?70:key===2?520:190,now);
        osc.frequency.exponentialRampToValueAtTime(i?30:65,now+.25);
        gain.gain.setValueAtTime(.055,now);gain.gain.exponentialRampToValueAtTime(.001,now+.35);
        osc.connect(gain).connect(audio.destination);osc.start();osc.stop(now+.4);
      }
    } catch { /* Audio optional. */ }
  }
  function glow(x,y,r,color,alpha=1) {
    ctx.save();ctx.globalAlpha=clamp(alpha);
    const g=ctx.createRadialGradient(x,y,0,x,y,Math.max(1,r));g.addColorStop(0,color);g.addColorStop(1,color+'00');
    ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
  }
  function stroke(points,color,width=2,alpha=1) {
    ctx.save();ctx.globalAlpha=clamp(alpha);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';
    ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.restore();
  }
  function arcTrail(x0,y0,x1,y1,bend,color,width=2,alpha=1) {
    const points=[];
    for(let i=0;i<=12;i++) {
      const q=i/12,curve=Math.sin(q*Math.PI)*bend;
      points.push([x0+(x1-x0)*q,y0+(y1-y0)*q+curve]);
    }
    stroke(points,color,width,alpha);
  }
  function ellipse(x,y,rx,ry,color,alpha=1,rotation=0) {
    ctx.save();ctx.globalAlpha=clamp(alpha);ctx.strokeStyle=color;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),rotation,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  function blade(x,y,length,angle,color,alpha=1,thickness=1) {
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=clamp(alpha);
    ctx.shadowColor=color;ctx.shadowBlur=12;
    const w=7*thickness;
    const g=ctx.createLinearGradient(-7,0,7,0);g.addColorStop(0,color);g.addColorStop(.5,'#fff');g.addColorStop(1,color);
    ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,-length);ctx.lineTo(w,-length*.25);ctx.lineTo(w*.57,0);ctx.lineTo(-w*.57,0);ctx.lineTo(-w,-length*.25);ctx.closePath();ctx.fill();
    ctx.shadowBlur=0;ctx.strokeStyle=color;ctx.lineWidth=3*thickness;ctx.beginPath();ctx.moveTo(-13*thickness,0);ctx.lineTo(13*thickness,0);ctx.moveTo(0,0);ctx.lineTo(0,15*thickness);ctx.stroke();ctx.restore();
  }
  function noteGlyph(x,y,size,color,alpha=1,rotation=0) {
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha=clamp(alpha);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=Math.max(1.2,size*.11);ctx.lineCap='round';
    ctx.shadowColor=color;ctx.shadowBlur=10*size;
    ctx.beginPath();ctx.ellipse(0,0,size*.42,size*.25,-.25,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.moveTo(size*.3,-size*.05);ctx.lineTo(size*.3,-size*1.25);ctx.quadraticCurveTo(size*.85,-size*1.12,size*.78,-size*.65);ctx.stroke();
    ctx.restore();
  }
  function dropletGlyph(x,y,size,color,alpha=1,rotation=0) {
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha=clamp(alpha);ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=8*size;
    ctx.beginPath();ctx.moveTo(0,-size*1.2);ctx.bezierCurveTo(size*.75,-size*.2,size*.7,size*.6,0,size*.75);ctx.bezierCurveTo(-size*.7,size*.6,-size*.75,-size*.2,0,-size*1.2);ctx.fill();ctx.restore();
  }
  function emberGlyph(x,y,size,color,alpha=1,rotation=0) {
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha=clamp(alpha);ctx.fillStyle=color;ctx.strokeStyle='#ffe7ad';ctx.lineWidth=Math.max(1,size*.12);ctx.shadowColor=color;ctx.shadowBlur=9*size;
    ctx.beginPath();ctx.moveTo(0,-size*1.2);ctx.lineTo(size*.6,0);ctx.lineTo(0,size*.9);ctx.lineTo(-size*.6,0);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-size*1.1,0);ctx.lineTo(size*1.1,0);ctx.moveTo(0,-size*.9);ctx.lineTo(0,size*.75);ctx.stroke();ctx.restore();
  }
  function flameCone(x0,y0,x1,y1,width,color,alpha=1,phase=0) {
    const dx=x1-x0,dy=y1-y0,len=Math.max(1,Math.hypot(dx,dy)),nx=-dy/len,ny=dx/len;
    ctx.save();ctx.globalAlpha=clamp(alpha);ctx.shadowColor=color;ctx.shadowBlur=18;
    const pts=[];
    for(let i=0;i<=12;i++) {
      const q=i/12,edge=Math.sin(q*Math.PI)*width*(.22+.78*q),wob=Math.sin(phase+q*18)*width*.12*q;
      pts.push([x0+dx*q+nx*(edge+wob),y0+dy*q+ny*(edge+wob)]);
    }
    for(let i=12;i>=0;i--) {
      const q=i/12,edge=Math.sin(q*Math.PI)*width*(.22+.78*q),wob=Math.cos(phase+q*16)*width*.1*q;
      pts.push([x0+dx*q-nx*(edge-wob),y0+dy*q-ny*(edge-wob)]);
    }
    const g=ctx.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,'#fff5b0');g.addColorStop(.28,'#ffd35a');g.addColorStop(.72,color);g.addColorStop(1,color+'00');ctx.fillStyle=g;
    ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();
    ctx.globalAlpha*=.8;ctx.strokeStyle='#ffefb0';ctx.lineWidth=Math.max(1,width*.16);ctx.stroke();ctx.restore();
  }
  function rockGlyph(x,y,size,color,alpha=1,rotation=0,seed=0) {
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha=clamp(alpha);ctx.fillStyle='#351817';ctx.strokeStyle=color;ctx.lineWidth=Math.max(1.2,size*.16);ctx.shadowColor=color;ctx.shadowBlur=10*size;
    ctx.beginPath();
    for(let j=0;j<8;j++){const a=j/8*Math.PI*2,rad=size*(.72+((j*7+seed*3)%5)*.1),px=Math.cos(a)*rad,py=Math.sin(a)*rad*(.78+((j+seed)%3)*.1);j?ctx.lineTo(px,py):ctx.moveTo(px,py);}
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#ffd28a';ctx.lineWidth=Math.max(1,size*.08);ctx.beginPath();ctx.moveTo(-size*.3,-size*.3);ctx.lineTo(size*.2,size*.12);ctx.lineTo(-size*.05,size*.42);ctx.stroke();ctx.restore();
  }
  function runeGlyph(x,y,size,color,alpha=1,rotation=0) {
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha=clamp(alpha);ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,size*.12);ctx.shadowColor=color;ctx.shadowBlur=8*size;
    ctx.beginPath();ctx.arc(0,0,size*.72,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.55,0);ctx.lineTo(0,size);ctx.lineTo(-size*.55,0);ctx.closePath();ctx.stroke();ctx.restore();
  }
  function icebergGlyph(x,y,size,color,alpha=1) {
    ctx.save();ctx.translate(x,y);ctx.globalAlpha=clamp(alpha);ctx.shadowColor=color;ctx.shadowBlur=14*size;
    const g=ctx.createLinearGradient(0,-size*1.7,0,size);g.addColorStop(0,'#efffff');g.addColorStop(.4,color);g.addColorStop(1,'#256b9b');ctx.fillStyle=g;ctx.strokeStyle='#d9ffff';ctx.lineWidth=Math.max(1,size*.1);
    ctx.beginPath();ctx.moveTo(-size*1.15,size*.75);ctx.lineTo(-size*.78,-size*.12);ctx.lineTo(-size*.3,-size*1.55);ctx.lineTo(size*.08,-size*.55);ctx.lineTo(size*.55,-size*1.05);ctx.lineTo(size*1.2,size*.72);ctx.lineTo(size*.62,size*1.02);ctx.lineTo(-size*.55,size*1.02);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#f4ffff';ctx.lineWidth=Math.max(1,size*.07);ctx.beginPath();ctx.moveTo(-size*.3,-size*1.35);ctx.lineTo(-size*.08,size*.65);ctx.lineTo(size*.45,size*.92);ctx.moveTo(size*.55,-size*.86);ctx.lineTo(size*.35,size*.45);ctx.stroke();ctx.restore();
  }
  function cast(divisors,combo=0,damage=null) {
    play(divisors.length>1?'ultimate':divisors[0],combo,damage);
  }
  function randomCast(combo=0,damage=null) {
    const keys=[2,5,10,3,'music','ultimate'];
    play(keys[Math.floor(Math.random()*keys.length)],combo,damage);
  }
  function play(key,combo=0,damage=null) {
    cancel();
    const art=arts[key],ult=key==='ultimate',reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration=reduced?650:ult?timings.ultimate:timings.normal;
    const proceduralOnly=!reduced;
    const arena=document.querySelector('.battle-arena');
    arena.style.setProperty('--cast-color',art.color);
    el('battle-caption').textContent=`${damage===null?'試放 · ':''}${art.name}${combo?` · ${combo} 連答`:''}`;
    el('move-name').textContent=art.name;el('move-tag').textContent=art.tag;
    const vfx=el('vfx-overlay');
    const frameVfx=el('frame-vfx');
    vfx.classList.remove('vfx-active');
    frameVfx?.classList.remove('frame-active');
    if(proceduralOnly) {
      delete vfx.dataset.vfx;
      frameVfx?.classList.remove('frame-active');
    } else {
      vfx.dataset.vfx=key === 'ultimate' ? 'ultimate' : String(key);
      void vfx.offsetWidth;
      vfx.classList.add('vfx-active');
    }
    if(!ctx) return;
    const {width:w,height:h}=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
    busy=true;arena.classList.add('is-casting');arena.classList.add('limit-active');
    el('battle-hero').classList.add('battle-casting');
    document.querySelectorAll('[data-skill],#ultimate-preview').forEach(b=>{b.disabled=true;b.classList.toggle('skill-active',b.dataset.skill===String(key)||(ult&&b.id==='ultimate-preview'));});
    watchdog=setTimeout(cancel,duration+100);
    const start=performance.now(),sx=w*.2,tx=w*.77,y=h*.56,scale=Math.min(1,w/500);
    const particles=Array.from({length:100},(_,i)=>({a:i*2.39996,r:45+Math.random()*155,s:1+Math.random()*2}));
    let hit=false;
    function draw(now) {
      const t=(now-start)/duration;
      if(t>=1){cancel();return;}
      ctx.clearRect(0,0,w,h);
      const impact=key===5?.5:.64;
      el('cast-phase').textContent=t<.2?'鎖定':t<impact?'釋放':t<.8?'命中':'消散';
      el('cast-time').textContent=`${Math.max(0,duration*(1-t)/1000).toFixed(1)}s`;el('cast-fill').style.transform=`scaleX(${t})`;
      if(reduced) { ellipse(tx,y,35,35,art.color,.6); }
      else {
        // Target brackets contract during wind-up; no full-screen white flash.
        if(t<.25){const r=48-25*t/.25;for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.save();ctx.translate(tx,y);ctx.rotate(a);stroke([[r,-10],[r,0],[r-10,0]],art.color,1,.7);ctx.restore();}}
        // Shared cinematic staging, with each art retaining its own geometry.
        const envelope=Math.sin(clamp(t/.88)*Math.PI);
        glow(w*.55,y,w*.5,art.color,envelope*.11);
        if(t<.45) {
          for(let j=0;j<3;j++)ellipse(sx,y+48*scale,(35+j*22)*scale,(10+j*6)*scale,art.color,envelope*.7,t*.3);
          for(let j=0;j<28;j++) {
            const a=j*2.399+t*5,r=(1-clamp(t/.45))*(60+j%7*12)*scale;
            stroke([[sx+Math.cos(a)*r,y+Math.sin(a)*r],[sx+Math.cos(a+.07)*r,y+Math.sin(a+.07)*r]],art.color,2,envelope);
          }
        }
        if(t>.2&&t<.8)for(let j=0;j<16;j++) {
          const yy=(j*41)%h,xx=((t*1.8+j*.137)%1)*w;
          stroke([[xx,yy],[xx-25-j%4*8,yy]],art.color,1,envelope*.25);
        }
        // Shared hero-to-target launch: every art visibly leaves the hero before impact.
        const launchStart=.12,launchEnd=key==='ultimate'?.62:.56;
        if(t>launchStart&&t<launchEnd) {
          const q=clamp((t-launchStart)/(launchEnd-launchStart));
          const px=sx+(tx-sx)*q, py=y-Math.sin(q*Math.PI)*28*scale;
          const trail=55+q*75;
          glow(sx,y,34*scale,(art.color),.18*(1-q));
          glow(px,py,24*scale,art.color,.72);
          if(key===10) {
            arcTrail(sx,y,px,py,18*scale,art.color,18*scale,.16);
            arcTrail(Math.max(sx,px-trail),py+6,px,py,-12*scale,art.color,5*scale,.55);
            arcTrail(Math.max(sx,px-trail*.62),py-3,px,py,8*scale,'#fff5dc',2*scale,.9);
          } else {
            for(let j=0;j<14;j++) {
              const g=clamp(q-j*.035),gx=sx+(px-sx)*g,gy=y+(py-y)*g+Math.sin(j*2.4+t*10)*7*scale;
              const ga=(1-j/16)*.8;
              if(key===2) { dropletGlyph(gx,gy,5*scale,art.color,ga,g*.8); }
              else if(key===5) { rockGlyph(gx,gy,(7+j%3*2)*scale,'#ff8a3d',ga,g*.7,j); }
              else if(key===3) runeGlyph(gx,gy,(7+j%3*2)*scale,art.color,ga,j*.7);
              else if(key==='music') noteGlyph(gx,gy,(7+j%3*2)*scale,art.color,ga,(j%2-.5)*.35);
              else blade(gx,gy,(20+j%3*5)*scale,j*.55,art.color,ga);
            }
          }
          for(let j=0;j<5;j++) {
            const a=j*1.256+t*8,rr=(8+j*3)*scale;
            glow(px+Math.cos(a)*rr,py+Math.sin(a)*rr,5*scale,art.color,.7);
          }
        }
        if(key===2) {
          for(let i=0;i<6;i++) {
            const u=clamp((t-.17-i*.065)/.12),fade=clamp(1-(t-.29-i*.065)/.16);
            if(u<=0||fade<=0)continue;
            const a=i%2?-.7:.65,cx=tx-18+i*8;
            glow(cx,y,38*scale,art.color,fade*.25);
            for(let n=0;n<5;n++) { const px=cx+(n-2)*12*scale*u,py=y+Math.sin(n+i+t*8)*10*scale; dropletGlyph(px,py,(8+n%3*2)*scale,art.color,fade*.8,a+n*.22); }
          }
          if(t>.22&&t<.65)for(let j=0;j<8;j++) {
            const a=j*Math.PI*2/5+t*6,r=75*scale*(1-clamp((t-.45)/.2));
            const dx=tx+Math.cos(a)*r,dy=y+Math.sin(a)*r*.65;
            dropletGlyph(dx,dy,(10+j%3*3)*scale,art.color,.72,a+Math.PI/2);
            ellipse(dx,dy,16*scale,7*scale,art.color,.35,a);
          }
          if(t>.55&&t<.8){const q=clamp((t-.55)/.09),a=1-clamp((t-.65)/.15),ex=sx+(tx-sx+60)*q,ey=y-65*q;for(let j=0;j<7;j++) dropletGlyph(ex+j*7*scale,ey+Math.sin(j)*9*scale,(7+j%2*2)*scale,art.color,a*.8,j*.6);}
          if(t>.15&&t<.72){const q=clamp((t-.15)/.57),px=sx+(tx-sx)*q,py=y-Math.sin(q*Math.PI)*18*scale,fade=Math.sin(Math.min(1,(t-.15)/.2)*Math.PI);icebergGlyph(px,py,27*scale,art.color,fade);for(let j=0;j<9;j++){const dx=px+(j-4)*13*scale,dy=py+Math.sin(j+t*6)*13*scale;dropletGlyph(dx,dy,(6+j%3*2)*scale,art.color,fade*.65,j*.4);}}
        } else if(key===5) {
          const p=clamp((t-.12)/.3),mx=sx+(tx-sx)*p,my=y-Math.sin(p*Math.PI)*92*scale;
          if(t>.12&&t<.52) {
            for(let j=8;j>=0;j--)glow(mx-j*7,my-j*11,(22-j)*scale,art.color,(1-j/9)*.7);
            ctx.save();ctx.translate(mx,my);ctx.rotate(t*11);
            const pulse=1+Math.sin(t*38)*.08;
            ctx.globalCompositeOperation='lighter';
            for(let ring=3;ring>=0;ring--) {
              ctx.globalAlpha=(.12+ring*.08)*pulse;ctx.strokeStyle=ring%2?'#ff6a28':'#ffd27d';ctx.lineWidth=(7-ring)*scale;
              ctx.beginPath();
              for(let j=0;j<15;j++) { const a=j/15*Math.PI*2,rad=(20+ring*4+(j%3)*3)*scale; const px=Math.cos(a)*rad,py=Math.sin(a)*(rad*1.12); j?ctx.lineTo(px,py):ctx.moveTo(px,py); }
              ctx.closePath();ctx.stroke();
            }
            ctx.globalAlpha=.96;ctx.fillStyle='#351514';ctx.strokeStyle='#ffe0a1';ctx.lineWidth=1.6*scale;ctx.beginPath();
            for(let j=0;j<13;j++){const a=j/13*Math.PI*2,rad=(15+(j%4)*3)*scale,px=Math.cos(a)*rad,py=Math.sin(a)*(rad*1.05);j?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();ctx.stroke();
            for(let j=0;j<7;j++){const a=j*1.73+t*8,rad=(5+j%3*4)*scale;stroke([[Math.cos(a)*rad,Math.sin(a)*rad],[Math.cos(a+.6)*rad*2.4,Math.sin(a+.6)*rad*1.5]],'#ffb34f',1.4*scale,.75);}
            ctx.restore();
          }
          for(let k=0;k<5;k++) {
            const q=clamp((t-.14-k*.045)/.15),ex=tx+(k-2)*30*scale;
            if(t>.14+k*.045&&q<1){const xx=sx+(ex-sx)*q,yy=y-Math.sin(q*Math.PI)*(52+k%2*18)*scale;rockGlyph(xx,yy,(12+k%2*4)*scale,'#ff8a3d',.92,q*9+k);glow(xx,yy,19*scale,'#ff9154',.75);glow(xx,yy,6*scale,'#fff5d7',.8);}
          }
          if(t>.55&&t<.83)for(let k=0;k<7;k++) {
            const f=clamp((t-.55-k*.015)/.12),a=1-clamp((t-.68)/.15),x=tx+(k-3)*22*scale;
            stroke([[x,y+28],[x+Math.sin(k)*13*scale,y+28-f*(65+k%3*25)*scale]],'#ff7b32',14*scale,a*.3);
            stroke([[x,y+28],[x+Math.sin(k)*13*scale,y+28-f*(65+k%3*25)*scale]],'#ffe8a6',3*scale,a);
          }
          if(t>.2&&t<.68) {
            const q=clamp((t-.2)/.38),fade=1-clamp((t-.52)/.18);
            for(let j=0;j<4;j++) {
              const a=t*5+j*Math.PI/2,rx=(35+q*95)*scale,ry=(12+q*34)*scale;
              ctx.save();ctx.translate(tx,y);ctx.rotate(a*.16);
              ctx.globalAlpha=fade*.72;ctx.strokeStyle=j%2?'#ffb15d':'#fff0b2';ctx.lineWidth=(3-j*.4)*scale;
              ctx.beginPath();ctx.ellipse(0,0,rx,ry,a,0,Math.PI*1.7);ctx.stroke();ctx.restore();
            }
          }
          if(t>.47&&t<.78) {
            const q=clamp((t-.47)/.14),fade=1-clamp((t-.61)/.17);
            for(let j=0;j<26;j++) {
              const a=j*2.399+t*8,dist=(18+q*(82+(j%5)*22))*scale;
              const px=tx+Math.cos(a)*dist,py=y+Math.sin(a)*dist*.5;
              glow(px,py,6*scale,'#ff6c2e',fade*.8);
              stroke([[tx+Math.cos(a)*12*scale,y+Math.sin(a)*8*scale],[px,py]],'#ffbd68',1.5*scale,fade);
            }
          }
          if(t>.48){const a=clamp((t-.48)/.3);for(let j=0;j<13;j++){const an=j*2.4+t*2;stroke([[tx,y],[tx+Math.cos(an)*40*scale,y+Math.sin(an)*20],[tx+Math.cos(an+.2)*145*a*scale,y+Math.sin(an+.2)*70*a*scale]],j%2?'#ff8744':'#ffe0a1',2,1-a);}}
        } else if(key===10) {
          for(let j=0;j<4;j++) {
            const angle=j*Math.PI/2+t*3,px=sx+Math.cos(angle)*35*scale,py=y+Math.sin(angle)*45*scale;
            if(t<.64){ellipse(px,py,10,15,art.color,clamp(t/.15));glow(px,py,16,art.color,.3);}
            if(t>.3&&t<.68){const q=clamp((t-.3)/.22),ex=px+(tx-px)*q,ey=py+(y-py)*q;arcTrail(px,py,ex,ey,14*scale,art.color,3,Math.sin((t-.3)/.38*Math.PI));}
          }
          if(t>.52&&t<.82){const a=Math.sin((t-.52)/.3*Math.PI);arcTrail(sx,y,tx+45*scale,y,-28*scale,art.color,50*scale,a*.2);arcTrail(sx,y,tx+45*scale,y,-28*scale,'#e9fff9',8*scale,a);for(let j=0;j<6;j++)ellipse(tx,y,12+j*10,30+j*9,art.color,a*(1-j/7),t*.1);}
          const p=clamp((t-.18)/.38);
          if(t<.6)for(let j=0;j<3;j++)ellipse(sx+j*10,y,10+j*4,20+j*10,art.color,Math.sin(clamp(t/.6)*Math.PI));
          if(t>.28&&t<.7){const a=Math.sin((t-.28)/.42*Math.PI),ex=sx+(tx-sx)*p;arcTrail(sx,y,ex,y,-24*scale,art.color,25*scale,a*.2);arcTrail(sx,y,ex,y,-24*scale,art.color,9*scale,a*.75);arcTrail(sx,y,ex,y,-24*scale,'#eafff8',2.5,a);for(let j=0;j<5;j++)ellipse(ex-j*13,y,7,30+j*2,art.color,a*(1-j/6));}
        } else if(key===3) {
          if(t>impact&&t<.82)for(let j=0;j<8;j++) {
            const a=j*Math.PI/4+t*7,r=(95-65*clamp((t-impact)/.32))*scale;
            const px=tx+Math.cos(a)*r,py=y+Math.sin(a)*r*.7;
            blade(px,py,32*scale,a+Math.PI/2,art.color,Math.sin((t-impact)/.32*Math.PI));
            stroke([[px,py],[tx+Math.cos(a+.5)*r*.6,y+Math.sin(a+.5)*r*.45]],art.color,2,.4);
          }
          if(t>.6&&t<.86){const q=clamp((t-.6)/.26);for(let j=0;j<6;j++){const a=j*Math.PI/3;stroke([[tx,y],[tx+Math.cos(a)*110*q*scale,y+Math.sin(a)*95*q*scale]],'#eedcff',3,1-q);}}
          if(t>impact&&t<.96){
            const age=clamp((t-impact)/.28),radius=(18+82*age)*scale,fade=1-age;
            glow(tx,y,radius*1.6,art.color,.42*fade);
            glow(tx,y,42*scale, '#f1e6ff', Math.max(0,1-age*3)*.8);
            ctx.save();ctx.globalAlpha=.86*fade;ctx.fillStyle='#070512';ctx.beginPath();ctx.arc(tx,y,radius*.62,0,7);ctx.fill();ctx.restore();
            for(let j=0;j<6;j++) ellipse(tx,y,radius+j*5*scale,radius*.3+j*3,art.color,fade*.8,t*8+j*.6);
            for(let j=0;j<30;j++){
              const a=j*2.4+t*14,r=radius+(1-age)*50*scale,px=tx+Math.cos(a)*r,py=y+Math.sin(a)*r*.65;
              stroke([[px,py],[px+Math.cos(a)*18*scale,py+Math.sin(a)*12*scale]],j%3?'#c8a6ff':'#f1e6ff',1.8,fade*.8);
              if(j%3===0) runeGlyph(px,py,5*scale,art.color,fade*.85,a);
            }
            if(age>.25) for(let j=0;j<8;j++) {
              const a=j*Math.PI/4+t*3,rr=radius*.68;
              blade(tx+Math.cos(a)*rr,y+Math.sin(a)*rr*.58,20*scale,a+Math.PI/2,art.color,fade*.8,.7);
            }
          }
        } else if(key==='music') {
          const q=clamp((t-.14)/.48);
          if(t<.55) {
            for(let j=0;j<5;j++) noteGlyph(sx+12+j*15,y+(j%2? -1:1)*12,7*scale,art.color,.65,j%2?.25:-.25);
          }
          for(let j=0;j<7;j++) {
            const nq=clamp(q-j*.07),nx=sx+(tx-sx)*nq,ny=y-Math.sin(nq*Math.PI)*34*scale+Math.sin(t*9+j)*10*scale;
            if(nq>0&&nq<1.05) { noteGlyph(nx,ny,(8+j%3*2)*scale,art.color,Math.sin(Math.min(1,nq/.16))*(1-clamp((nq-.72)/.25)),(j%2-.5)*.35); glow(nx,ny,14*scale,art.color,.24); }
          }
          if(t>.48&&t<.86) {
            const pulse=Math.sin((t-.48)/.38*Math.PI),radius=(26+70*clamp((t-.48)/.18))*scale;
            for(let j=0;j<4;j++) ellipse(tx,y,radius+j*11*scale,(radius*.32)+j*4,art.color,pulse*(1-j*.17),t*2+j*.5);
            for(let j=0;j<9;j++) { const a=j*Math.PI*2/9+t*3; noteGlyph(tx+Math.cos(a)*radius,y+Math.sin(a)*radius*.45,7*scale,art.color,pulse*.8,a+Math.PI/2); }
          }
        } else {
          const p=clamp((t-.1)/.34);
          // The hero raises a command blade first; the target rain follows its path.
          if(t<.48) {
            const rise=clamp(t/.22),fade=1-clamp((t-.36)/.16);
            glow(sx,y,45*scale,art.color,.22);
            blade(sx+62*rise*scale,y,132*scale,Math.PI/2,art.color,fade,.55);
            glow(sx+48*rise*scale,y,58*scale,art.color,fade*.35);
            for(let j=0;j<7;j++) ellipse(sx,y,38+j*15,11+j*5,art.color,fade*.5,t*5+j*.4);
          }
          for(let j=0;j<18;j++) {
            const f=clamp((p-j*.028)/.7),offset=(j-8.5)*13*scale;
            const px=sx+(tx+offset-sx)*f,py=y-Math.sin(f*Math.PI)*54*scale+Math.sin(j+t*8)*7*scale;
            if(f>0&&f<1.08) {
              const flightAngle=Math.atan2(y-py,tx+offset-sx)+Math.PI/2;
              blade(px,py,(42+j%3*9)*scale,flightAngle,art.color,clamp(f/.08)*(1-clamp((f-.83)/.17)),.55);
              glow(px,py,18*scale,art.color,.35);
              if(j%2===0) blade(px-22*scale,py+10*scale,26*scale,flightAngle,'#fff4ff',.55,.5);
            }
          }
          if(t>.46&&t<.8) {
            const f=clamp((t-.46)/.13),fade=1-clamp((t-.62)/.18);
            glow(tx,y,125*scale,art.color,fade*.45);
            blade(tx-40*f*scale,y,92*scale,Math.PI/2,art.color,fade,.55);
            blade(tx+40*f*scale,y,92*scale,-Math.PI/2,art.color,fade,.55);
            for(let j=0;j<8;j++) {
              const a=j*Math.PI/4+t*2,px=tx+Math.cos(a)*48*f*scale,py=y+Math.sin(a)*24*f*scale;
              blade(px,py,32*scale,a+Math.PI/2,art.color,fade*.72,.5);
            }
          }
          if(t>.66&&t<.88) {
            const f=clamp((t-.66)/.08),fade=1-clamp((t-.74)/.14);
            blade(tx-120+240*f,y,210*scale,Math.PI/2,'#fff7ff',fade,.58);
            glow(tx,y,150*scale,art.color,fade*.6);
            for(let j=0;j<10;j++) ellipse(tx,y,40+j*16,14+j*5,art.color,fade*(1-j*.08),t*3+j);
          }
        }
        if(t>impact) {
          const age=(t-impact)/(1-impact);
          glow(tx,y,135*scale,art.color,(1-age)*.23);
          for(let j=0;j<5;j++)ellipse(tx,y,(15+age*(110+j*25))*scale,(12+age*(60+j*12))*scale,art.color,(1-age)*.65,j*.25);
          particles.forEach(p=>{const x=tx+Math.cos(p.a)*p.r*age*scale,yy=y+Math.sin(p.a)*p.r*age*.65;stroke([[x,yy],[x+Math.cos(p.a)*9*(1-age),yy+Math.sin(p.a)*9*(1-age)]],art.color,p.s,1-age);});
        }
      }
      if(!hit&&t>=(reduced?.2:impact)){hit=true;hitSound(key);arena.classList.add('impact-active');el('battle-monster').classList.add('battle-hit');el('battle-damage').textContent=damage===null?'BREAK':`−${damage}`;el('battle-damage').classList.add('damage-rise');}
      frame=requestAnimationFrame(draw);
    }
    frame=requestAnimationFrame(draw);
  }
  function enemyBreath() {
    cancel();
    if(!ctx) return;
    const duration=2600,arena=document.querySelector('.battle-arena');
    const art={color:'#ff7b3e',name:'龍焰吐息',tag:'DRAGONFIRE BREATH'};
    el('battle-caption').textContent='龍焰吐息 · 反擊';el('move-name').textContent=art.name;el('move-tag').textContent=art.tag;
    const {width:w,height:h}=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
    busy=true;arena.classList.add('is-casting','enemy-casting');el('battle-monster').classList.add('monster-breathing');
    document.querySelectorAll('[data-skill],#ultimate-preview').forEach(b=>{b.disabled=true;});
    const start=performance.now(),sx=w*.2,tx=w*.77,y=h*.56;
    const embers=Array.from({length:80},(_,i)=>({a:i*2.4,r:8+Math.random()*75,s:1+Math.random()*2}));
    let hit=false;
    function draw(now) {
      const t=(now-start)/duration;if(t>=1){cancel();return;}
      ctx.clearRect(0,0,w,h);el('cast-phase').textContent=t<.22?'蓄焰':t<.68?'噴射':'消散';el('cast-time').textContent=`${Math.max(0,duration*(1-t)/1000).toFixed(1)}s`;el('cast-fill').style.transform=`scaleX(${t})`;
      const q=clamp((t-.18)/.5),flame=clamp((t-.14)/.2),fade=1-clamp((t-.68)/.25);
      glow(tx,y,45,art.color,.65);
      if(t<.32){
        glow(tx-18,y,34, '#fff0a0', .85);
        for(let j=0;j<5;j++) emberGlyph(tx+(j-2)*8,y+Math.sin(j+t*8)*5,12+j*2,art.color,.8,t*4+j);
      }
      if(t>.12&&t<.78){
        const front=sx+(tx-sx)*(1-q);
        flameCone(tx-18,y,front,y-3,22+q*30,art.color,fade*.72,t*8);
        flameCone(tx-24,y+3,front+12,y+8,10+q*18,'#ffd15a',fade*.8,t*11+1.4);
        for(let j=0;j<34;j++) { const u=(j/34+t*1.4)%1,px=tx-(tx-sx)*u,py=y+Math.sin(u*12+t*9+j)*(.35+u)*28,sz=(8+u*16);emberGlyph(px,py,sz,art.color,fade*(.35+.55*(1-u)),Math.sin(j+t*4)); }
        for(let j=0;j<16;j++){const u=Math.min(1,q+(j%5)*.018),px=tx-(tx-sx)*u,py=y+Math.sin(j*1.8+t*12)*u*35;glow(px,py,18+u*20,art.color,fade*.55);}
        stroke([[tx,y-8],[sx+(tx-sx)*(1-q),y-22]],'#ffd39a',5,fade*.75);stroke([[tx,y+10],[sx+(tx-sx)*(1-q),y+25]],'#ff6a32',12,fade*.35);
      }
      if(t>.55){const age=clamp((t-.55)/.35);glow(sx,y,70+age*80,art.color,(1-age)*.5);embers.forEach(p=>{const px=sx+Math.cos(p.a)*p.r*age,py=y+Math.sin(p.a)*p.r*.6*age;emberGlyph(px,py,p.s*4,art.color,1-age,p.a);});}
      if(!hit&&t>.68){hit=true;el('battle-hero').classList.add('battle-hit');}
      frame=requestAnimationFrame(draw);
    }
    watchdog=setTimeout(cancel,duration+100);frame=requestAnimationFrame(draw);
  }
  function init() {
    canvas=el('battle-canvas');ctx=canvas.getContext('2d');
    document.querySelectorAll('[data-skill]').forEach(b=>b.addEventListener('click',()=>{if(!busy){const raw=b.dataset.skill;play(raw==='music'?raw:Number(raw));}}));
    el('ultimate-preview').addEventListener('click',()=>{if(!busy)play('ultimate');});
    el('sound-toggle').addEventListener('click',()=>{sound=!sound;el('sound-toggle').textContent=`音效：${sound?'開':'關'}`;el('sound-toggle').setAttribute('aria-pressed',String(sound));});
    window.addEventListener('resize',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
  }
  return {init,cast,randomCast,enemyBreath,cancel,updateStatus,timings};
})();
