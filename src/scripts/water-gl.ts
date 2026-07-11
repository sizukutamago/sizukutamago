/**
 * Full-page "water surface" — a single-pass raw WebGL fragment shader.
 * White (paper) base, gently undulating waves with light glints + caustics.
 * Interaction (load / pointer / click / [data-drop]) drops ripples that
 * glow in 水色. No Three.js.
 *
 * Drive it from anywhere:
 *   window.dispatchEvent(new CustomEvent("gl:drop", { detail: { x, y, strength } }))
 *   // x,y in CSS pixels (client coords)
 */

const VERT = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const MAX_DROPS = 12;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec4 u_drops[${MAX_DROPS}];
uniform int u_dropCount;

vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x){ return mod289(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++){ v += a * snoise(p); p *= 2.0; a *= 0.5; }
  return v;
}

// smooth undulating surface height (directional swell + organic detail)
float waveH(vec2 p, float t){
  float h = 0.0;
  h += sin(p.x * 2.6 + t * 1.10) * 0.10;
  h += sin(p.y * 2.1 - t * 0.85) * 0.09;
  h += sin((p.x * 0.8 + p.y * 1.2) + t * 1.35) * 0.06;
  h += fbm(p * 1.5 + vec2(t * 0.25, 0.0)) * 0.45;
  return h;
}

const vec3 PAPER    = vec3(0.984, 0.992, 0.996); // #FBFDFE
const vec3 SHALLOW  = vec3(0.855, 0.935, 0.976);
const vec3 SKY_SOFT = vec3(0.729, 0.902, 0.992); // #BAE6FD
const vec3 SKY_DEEP = vec3(0.490, 0.827, 0.988); // #7DD3FC

void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  float aspect = u_res.x / u_res.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 3.2;
  float t = u_time * 0.45;

  // interactive ripples (scalar height + coloured rim)
  float rip = 0.0;
  for (int i = 0; i < ${MAX_DROPS}; i++){
    if (i >= u_dropCount) break;
    vec4 d = u_drops[i];
    float age = u_time - d.z;
    if (age < 0.0 || age > 4.0) continue;
    vec2 dp = (d.xy - 0.5) * vec2(aspect, 1.0) * 3.2;
    float dist = distance(p, dp);
    float ring = exp(-pow((dist - 0.9 * age) * 3.5, 2.0));
    ring *= sin(18.0 * dist - 9.0 * age) * exp(-1.1 * age) * d.w;
    rip += ring;
  }

  // surface normal from wave height (finite differences)
  float e = 0.02;
  float h0 = waveH(p, t) + rip * 0.25;
  float hx = waveH(p + vec2(e, 0.0), t) - h0;
  float hy = waveH(p + vec2(0.0, e), t) - h0;
  vec3 n = normalize(vec3(-hx, -hy, e));

  vec3 L = normalize(vec3(0.35, 0.55, 0.78));
  vec3 V = vec3(0.0, 0.0, 1.0);
  float diff = clamp(dot(n, L) * 0.5 + 0.5, 0.0, 1.0);
  vec3 R = reflect(-L, n);
  float spec = pow(clamp(dot(R, V), 0.0, 1.0), 60.0);

  // caustic network distorted by the surface normal
  vec2 cp = p * 1.1 + n.xy * 1.3 + vec2(t * 0.15, -t * 0.1);
  float cn = fbm(cp + fbm(cp));
  float caustic = pow(abs(cn), 2.5);

  vec3 col = mix(PAPER, SHALLOW, clamp(0.34 + h0 * 0.85 + caustic * 0.32, 0.0, 1.0));
  col = mix(col, SKY_SOFT, caustic * 0.52);         // 水色 in the caustic network
  float trough = smoothstep(0.12, -0.28, h0);       // deeper blue in wave dips
  col = mix(col, SKY_SOFT, trough * 0.38);
  col *= 0.93 + 0.07 * diff;                         // gentle light variation
  col += vec3(1.0) * spec * 0.4;                     // white specular glints
  col = mix(col, SKY_DEEP, clamp(abs(rip) * 0.9, 0.0, 0.5)); // 水色 ripple rim

  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (dither - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("[water-gl] compile:", gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

interface Drop {
  x: number;
  y: number;
  start: number;
  strength: number;
}

export function initWaterGL(canvas: HTMLCanvasElement) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const gl = (canvas.getContext("webgl", {
    antialias: false,
    alpha: false,
    powerPreference: "low-power",
  }) || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
  if (!gl) return;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  if (!prog) return;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("[water-gl] link:", gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, "u_res");
  const uTime = gl.getUniformLocation(prog, "u_time");
  const uDrops = gl.getUniformLocation(prog, "u_drops");
  const uDropCount = gl.getUniformLocation(prog, "u_dropCount");

  const start = performance.now();
  let clock = 0;
  const drops: Drop[] = [];
  const packed = new Float32Array(MAX_DROPS * 4);

  function pushDrop(clientX: number, clientY: number, strength: number) {
    const x = clientX / window.innerWidth;
    const y = 1 - clientY / window.innerHeight; // client (top) -> uv (bottom)
    drops.push({ x, y, start: clock, strength });
    if (drops.length > MAX_DROPS) drops.shift();
    schedule();
  }
  window.addEventListener("gl:drop", (e) => {
    const d = (e as CustomEvent).detail;
    if (d) pushDrop(d.x, d.y, d.strength ?? 1);
  });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  window.addEventListener("resize", resize, { passive: true });

  function draw() {
    resize();
    for (let i = drops.length - 1; i >= 0; i--) {
      if (clock - drops[i].start > 4) drops.splice(i, 1);
    }
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      packed[i * 4] = d.x;
      packed[i * 4 + 1] = d.y;
      packed[i * 4 + 2] = d.start;
      packed[i * 4 + 3] = d.strength;
    }
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, clock);
    gl.uniform4fv(uDrops, packed);
    gl.uniform1i(uDropCount, drops.length);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  if (reduce) {
    clock = 8;
    draw();
    canvas.dataset.gl = "static";
    return;
  }

  let scheduled = false;
  let inView = true;
  let visible = !document.hidden;
  let lost = false;

  function schedule() {
    if (scheduled || lost || !inView || !visible) return;
    scheduled = true;
    requestAnimationFrame(loop);
  }
  function loop(now: number) {
    scheduled = false;
    if (lost || !inView || !visible) return;
    clock = (now - start) / 1000;
    draw();
    schedule();
  }

  const io = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      schedule();
    },
    { threshold: 0 },
  );
  io.observe(canvas);
  document.addEventListener("visibilitychange", () => {
    visible = !document.hidden;
    schedule();
  });
  canvas.addEventListener(
    "webglcontextlost",
    (e) => {
      e.preventDefault();
      lost = true;
      canvas.style.display = "none";
    },
    false,
  );

  schedule();
  canvas.dataset.gl = "on";
}
