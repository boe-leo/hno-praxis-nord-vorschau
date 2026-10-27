// Original ring renderer and triskele from test.med.one, retrieved 2026-09-18.
function createRingRenderer(canvas, size) {
  const ctx = canvas.getContext('2d');
  canvas.width = size; canvas.height = size;
  const cx = size/2, cy = size/2;
  const outerR = size * (146.5 / 300); // Match the original brand.svg outer edge.
  const ringW = size * 0.045;

  // Med.one palette: greens, blues, greys, teals
  const palette = [
    [0, 180, 140],    // teal
    [80, 140, 200],   // blue
    [160, 175, 190],  // grey
    [0, 200, 160],    // mint green
    [100, 160, 220],  // light blue
    [140, 155, 170],  // steel grey
    [0, 160, 120],    // dark teal
    [60, 120, 180],   // medium blue
    [180, 190, 200],  // light grey
    [0, 220, 180],    // bright teal
    [120, 180, 240],  // sky blue
    [130, 145, 165],  // slate
  ];

  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpColor = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
  const getColor = (phase) => {
    const idx = ((phase % 1) + 1) % 1 * palette.length;
    const i = Math.floor(idx);
    const f = idx - i;
    return lerpColor(palette[i % palette.length], palette[(i + 1) % palette.length], f);
  };

  let t = 0, floodPhase = 0;

  return function draw() {
    t++;
    floodPhase += 0.003;
    ctx.clearRect(0, 0, size, size);

    const fastSpin = Math.pow(Math.max(0, Math.sin(t * 0.0015 + 1.5)), 8);
    const rotation = t * 0.004 + fastSpin * Math.sin(t * 0.03) * 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);

    const floodAmount = Math.pow(Math.max(0, Math.sin(floodPhase)), 3);
    const floodCol = getColor(floodPhase * 0.3);

    const segments = 180;
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1.5) / segments) * Math.PI * 2;
      const wave1 = getColor(t * 0.004 + i / segments);
      const wave2 = getColor(t * 0.003 + i / segments * 1.5 + 0.3);
      const wave3 = getColor(t * 0.005 + i / segments * 0.7 + 0.6);
      let r = (wave1[0] * 0.4 + wave2[0] * 0.35 + wave3[0] * 0.25);
      let g = (wave1[1] * 0.4 + wave2[1] * 0.35 + wave3[1] * 0.25);
      let b = (wave1[2] * 0.4 + wave2[2] * 0.35 + wave3[2] * 0.25);
      if (floodAmount > 0.05) {
        r = lerp(r, floodCol[0], floodAmount * 0.85);
        g = lerp(g, floodCol[1], floodAmount * 0.85);
        b = lerp(b, floodCol[2], floodAmount * 0.85);
      }
      const shimmer = 0.85 + 0.15 * Math.sin(t * 0.02 + i * 0.15);
      r *= shimmer; g *= shimmer; b *= shimmer;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR - ringW / 2, a1, a2);
      ctx.strokeStyle = `rgb(${~~r},${~~g},${~~b})`;
      ctx.lineWidth = ringW;
      ctx.lineCap = 'butt';
      ctx.stroke();
    }

    // Glow
    ctx.globalCompositeOperation = 'destination-over';
    const glowCol = getColor(t * 0.003);
    ctx.shadowColor = `rgba(${~~glowCol[0]},${~~glowCol[1]},${~~glowCol[2]},0.3)`;
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR - ringW / 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0)';
    ctx.lineWidth = ringW;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();
  };
}


export function initAnimatedBrand(){ return; // Static three-part brand; ring retained below for future motion work.

 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const logos=[...document.querySelectorAll('img.brand-symbol')].map(img=>{
  const span=document.createElement('span');span.className='brand-symbol animated-brand';span.setAttribute('aria-hidden','true');
  span.innerHTML=`<canvas></canvas><svg class="original-triskele" viewBox="-9 -16 264 264" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path fill="#4a73a0" stroke="#fff" stroke-width="6" stroke-linejoin="round" d="M177.29,131.84c-22.95,0-43.02-12.33-53.94-30.73c-22.95,0-43.03,12.33-53.96,30.73c-5.57,9.37-8.77,20.3-8.77,31.99c0,34.64,28.08,62.71,62.72,62.71c34.64,0,62.71-28.07,62.71-62.71C186.05,152.15,182.86,141.21,177.29,131.84z"/>
        <path fill="#527baa" stroke="#fff" stroke-width="6" stroke-linejoin="round" d="M177.3,6.41c-22.95,0-43.02,12.33-53.94,30.73c5.56,9.36,8.75,20.3,8.75,31.98s-3.19,22.62-8.75,31.99c10.92,18.4,30.99,30.73,53.94,30.73c34.64,0,62.72-28.08,62.72-62.72S211.93,6.41,177.3,6.41z"/>
        <path fill="#5b84b2" stroke="#fff" stroke-width="6" stroke-linejoin="round" d="M123.36,37.14C112.43,18.74,92.35,6.41,69.4,6.41c-34.64,0-62.71,28.07-62.71,62.71s28.08,62.72,62.72,62.72c10.92-18.4,30.99-30.73,53.94-30.73c5.56-9.36,8.77-20.3,8.77-31.99C132.12,57.44,128.92,46.5,123.36,37.14z"/>
      </svg>`;
  img.replaceWith(span);return {node:span,draw:createRingRenderer(span.querySelector('canvas'),128),visible:true};
 });
 if(!logos.length)return;
 const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{const logo=logos.find(l=>l.node===entry.target);logo.visible=entry.isIntersecting;});});
 logos.forEach(logo=>{logo.draw();observer.observe(logo.node);});
 let frame;
 function animate(){if(!document.hidden)logos.filter(l=>l.visible).forEach(l=>l.draw());frame=requestAnimationFrame(animate);}
 function sync(){cancelAnimationFrame(frame);if(!reduced.matches&&!document.hidden)frame=requestAnimationFrame(animate);}
 reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);sync();
}
