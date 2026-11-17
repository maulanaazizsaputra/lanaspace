const root = document.documentElement;
const motionFull = root.classList.contains('motion-full');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';
const store = {
get(key) {
try {
return JSON.parse(sessionStorage.getItem(key));
} catch (error) {
return null;
}
},
set(key, value) {
try {
sessionStorage.setItem(key, JSON.stringify(value));
} catch (error) {
}
},
};
root.classList.add('reveal-ready');
const cursor = (() => {
if (!finePointer) return { attach() {} };
const FOLLOW = motionFull ? 0.24 : 0.6;
const GROW = motionFull ? 0.2 : 0.45;
const layer = document.createElement('div');
layer.className = 'cursor';
layer.dataset.state = 'idle';
layer.setAttribute('aria-hidden', 'true');
layer.innerHTML =
'<svg class="cursor__ring" viewBox="0 0 100 100" focusable="false"><circle cx="50" cy="50" r="49"/></svg>' +
'<span class="cursor__label"></span><span class="cursor__dot"></span>';
const lens = document.createElement('div');
lens.className = 'cursor-lens';
lens.setAttribute('aria-hidden', 'true');
const lensImg = document.createElement('img');
lensImg.alt = '';
lensImg.decoding = 'async';
const ring = layer.querySelector('.cursor__ring');
const label = layer.querySelector('.cursor__label');
const dot = layer.querySelector('.cursor__dot');
const RING = 240;
const SIZE = { idle: 26, link: 60, label: 104, lens: 240 };
const saved = store.get('lana-pointer');
let x = saved ? saved.x : -100;
let y = saved ? saved.y : -100;
let rx = x;
let ry = y;
let size = SIZE.idle;
let target = SIZE.idle;
let press = 1;
let raf = 0;
let last = 0;
let current = null;
const render = (now) => {
const dt = Math.min(64, now - (last || now));
last = now;
const follow = 1 - Math.pow(1 - FOLLOW, dt / 16.67);
const grow = 1 - Math.pow(1 - GROW, dt / 16.67);
rx += (x - rx) * follow;
ry += (y - ry) * follow;
size += (target * press - size) * grow;
ring.style.transform = `translate3d(${rx - RING / 2}px, ${ry - RING / 2}px, 0) scale(${size / RING})`;
const state = layer.dataset.state;
if (state === 'label') label.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
if (state === 'lens') lens.style.transform = `translate3d(${rx - RING / 2}px, ${ry - RING / 2}px, 0)`;
const settled = Math.abs(x - rx) < 0.1 && Math.abs(y - ry) < 0.1 && Math.abs(target * press - size) < 0.1;
if (settled) {
raf = 0;
last = 0;
} else {
raf = requestAnimationFrame(render);
}
};
const kick = () => {
if (!raf) raf = requestAnimationFrame(render);
};
const setState = (el) => {
const t = el && el.closest ? el.closest('[data-preview], [data-cursor], a[href], button, label, summary') : null;
if (t === current) return;
current = t;
let kind = 'idle';
if (t) kind = t.dataset.preview ? 'lens' : t.dataset.cursor ? 'label' : 'link';
layer.dataset.state = kind;
target = SIZE[kind];
label.textContent = kind === 'label' ? t.dataset.cursor : '';
if (kind === 'lens') {
if (lensImg.getAttribute('src') !== t.dataset.preview) lensImg.src = t.dataset.preview;
if (!lensImg.isConnected) lens.append(lensImg);
lens.classList.add('is-on');
} else {
lens.classList.remove('is-on');
}
kick();
};
window.addEventListener(
'pointermove',
(e) => {
if (e.pointerType !== 'mouse') return;
if (!layer.classList.contains('is-shown')) {
rx = e.clientX;
ry = e.clientY;
layer.classList.add('is-shown');
}
x = e.clientX;
y = e.clientY;
dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
kick();
},
{ passive: true },
);
document.addEventListener('pointerover', (e) => setState(e.target));
document.addEventListener('pointerdown', () => {
press = 0.8;
kick();
});
document.addEventListener('pointerup', () => {
press = 1;
kick();
});
document.documentElement.addEventListener('mouseleave', () => {
layer.classList.remove('is-shown');
lens.classList.remove('is-on');
current = null;
});
window.addEventListener('pagehide', () => store.set('lana-pointer', { x, y }));
const attach = (parent) => parent.append(layer, lens);
attach(document.body);
root.classList.add('has-cursor');
if (saved) {
dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
layer.classList.add('is-shown');
setState(document.elementFromPoint(x, y));
kick();
}
return { attach };
})();
document.addEventListener(
'click',
(e) => {
const a = e.target.closest('a[href]');
if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
let px = e.clientX;
let py = e.clientY;
if (!e.detail) {
const r = a.getBoundingClientRect();
px = r.left + r.width / 2;
py = r.top + r.height / 2;
}
store.set('lana-vt', { x: Math.round(px), y: Math.round(py), t: Date.now() });
},
true,
);
(() => {
const els = Array.from(document.querySelectorAll('[data-reveal]'));
if (!els.length) return;
if (!('IntersectionObserver' in window)) {
els.forEach((el) => el.classList.add('is-in'));
return;
}
const show = (el, delay) => {
el.style.setProperty('--d', `${delay}ms`);
const go = () => {
el.classList.add('is-in');
setTimeout(() => el.style.removeProperty('--d'), delay + 1700);
};
const pic = el.dataset.reveal ? el.querySelector('img') : null;
if (pic && !pic.complete) {
let done = false;
const once = () => {
if (done) return;
done = true;
go();
};
pic.addEventListener('load', once, { once: true });
pic.addEventListener('error', once, { once: true });
setTimeout(once, 1200);
} else {
go();
}
};
let queue = [];
let scheduled = false;
const flush = () => {
scheduled = false;
const rects = new Map(queue.map((el) => [el, el.getBoundingClientRect()]));
queue.sort((a, b) => rects.get(a).top - rects.get(b).top || rects.get(a).left - rects.get(b).left);
queue.forEach((el, i) => show(el, Math.min(i, 9) * 75));
queue = [];
};
const io = new IntersectionObserver(
(entries) => {
entries.forEach((entry) => {
if (!entry.isIntersecting) return;
io.unobserve(entry.target);
queue.push(entry.target);
});
if (queue.length && !scheduled) {
scheduled = true;
requestAnimationFrame(flush);
}
},
{ rootMargin: '0px 0px -6% 0px' },
);
els.forEach((el) => io.observe(el));
const loader = new IntersectionObserver(
(entries) => {
entries.forEach((entry) => {
if (!entry.isIntersecting) return;
loader.unobserve(entry.target);
entry.target.querySelectorAll('img[loading="lazy"]').forEach((pic) => {
pic.loading = 'eager';
});
});
},
{ rootMargin: '1200px 0px' },
);
els.filter((el) => el.querySelector('.pic-mask')).forEach((el) => loader.observe(el));
})();
(() => {
const sets = Array.from(document.querySelectorAll('.rings'));
if (!sets.length) return;
if (!('IntersectionObserver' in window)) {
sets.forEach((el) => el.classList.add('is-drawn'));
return;
}
const MAX = 8;
const parallax = motionFull && finePointer;
const items = sets.map((el) => {
const layers = Array.from(el.querySelectorAll('.rings__layer'));
const n = layers.length;
if (parallax) el.classList.add('rings--parallax');
return { el, layers, weight: layers.map((_, k) => Math.pow(1 - k / n, 1.7)), x: 0, y: 0, on: false, drawn: false };
});
let px = null;
let py = null;
let raf = 0;
const step = () => {
raf = 0;
let busy = false;
for (const it of items) {
if (!it.on || px === null) continue;
const r = it.el.getBoundingClientRect();
const tx = Math.max(-1, Math.min(1, (px - (r.left + r.width / 2)) / (window.innerWidth * 0.5)));
const ty = Math.max(-1, Math.min(1, (py - (r.top + r.height / 2)) / (window.innerHeight * 0.5)));
it.x += (tx - it.x) * 0.09;
it.y += (ty - it.y) * 0.09;
if (Math.abs(tx - it.x) > 0.0008 || Math.abs(ty - it.y) > 0.0008) busy = true;
for (let k = 0; k < it.layers.length; k++) {
const u = it.x * MAX * it.weight[k] * 0.5;
const v = it.y * MAX * it.weight[k] * 0.5;
it.layers[k].style.translate = `${u.toFixed(3)}% ${v.toFixed(3)}%`;
}
}
if (busy && !document.hidden) raf = requestAnimationFrame(step);
};
const kick = () => {
if (parallax && !raf) raf = requestAnimationFrame(step);
};
const io = new IntersectionObserver((entries) => {
entries.forEach((entry) => {
const it = items.find((item) => item.el === entry.target);
it.on = entry.isIntersecting;
if (it.on && !it.drawn) {
it.drawn = true;
it.el.classList.add('is-drawn');
}
});
kick();
});
items.forEach((it) => io.observe(it.el));
if (parallax) {
window.addEventListener(
'pointermove',
(e) => {
px = e.clientX;
py = e.clientY;
kick();
},
{ passive: true },
);
document.addEventListener('visibilitychange', kick);
}
const ripple = (el, clientX, clientY) => {
const r = el.getBoundingClientRect();
const scale = r.width / el.offsetWidth || 1;
const x = (clientX - r.left) / scale;
const y = (clientY - r.top) / scale;
for (let k = 0; k < 3; k++) {
const d = el.offsetWidth * (motionFull ? 0.42 : 0.05 + k * 0.06);
const s = document.createElement('span');
s.className = 'rings__ripple';
s.style.cssText = `width:${d}px;height:${d}px;left:${x - d / 2}px;top:${y - d / 2}px`;
el.append(s);
const anim = s.animate(
motionFull
? [
{ transform: 'scale(0.05)', opacity: 1 },
{ transform: 'scale(1)', opacity: 0 },
]
: [{ opacity: 1 }, { opacity: 0 }],
{ duration: motionFull ? 1700 : 1100, delay: k * 170, easing: EASE_OUT, fill: 'backwards' },
);
anim.finished.then(
() => s.remove(),
() => s.remove(),
);
}
};
document.addEventListener('pointerdown', (e) => {
const host = e.target.closest('.about-hero, .mabout');
const el = host && host.querySelector('.rings');
if (el) ripple(el, e.clientX, e.clientY);
});
})();
const clockFormat = (() => {
try {
return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
} catch (error) {
return null;
}
})();
function updateClocks() {
if (!clockFormat) return;
const text = `${clockFormat.format(new Date())} WIB`;
document.querySelectorAll('[data-clock]').forEach((el) => {
el.textContent = text;
el.hidden = false;
const group = el.closest('[data-clock-group]');
if (group) group.hidden = false;
});
}
(() => {
if (!clockFormat) return;
const tick = () => {
updateClocks();
setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
};
tick();
})();
function updateMotionToggles() {
const now = motionFull ? 'penuh' : 'hemat';
const other = motionFull ? 'hemat' : 'penuh';
document.querySelectorAll('[data-motion-toggle]').forEach((btn) => {
btn.querySelector('.motion-toggle__state').textContent = now;
btn.setAttribute('aria-label', `Animasi ${now}. Ganti ke animasi ${other}`);
btn.hidden = false;
});
}
(() => {
updateMotionToggles();
document.addEventListener('click', (e) => {
if (!e.target.closest('[data-motion-toggle]')) return;
try {
localStorage.setItem('lana-animasi-v2', motionFull ? 'hemat' : 'penuh');
} catch (error) {
return;
}
window.location.reload();
});
})();
const visitors = { total: null, online: new Map(), offset: 0 };
const visitorNumber = (() => {
try {
return new Intl.NumberFormat('id-ID');
} catch (error) {
return { format: String };
}
})();
function updateVisitors() {
if (visitors.total === null) return;
const now = Date.now() + visitors.offset;
let online = 0;
visitors.online.forEach((ts) => {
if (typeof ts === 'number' && now - ts < 75000) online += 1;
});
if (document.visibilityState === 'visible') online = Math.max(online, 1);
const total = visitorNumber.format(Math.max(visitors.total, online));
const onlineText = visitorNumber.format(online);
document.querySelectorAll('[data-visitors]').forEach((el) => {
const t = el.querySelector('[data-visitors-total]');
const o = el.querySelector('[data-visitors-online]');
if (motionFull && !el.hidden && t.textContent !== total) {
t.classList.remove('is-bump');
void t.offsetWidth;
t.classList.add('is-bump');
}
t.textContent = total;
o.textContent = onlineText;
el.title = `${onlineText} orang sedang melihat situs ini, ${total} pengunjung sejak penghitung dipasang`;
el.hidden = false;
});
}
(() => {
const meta = document.querySelector('meta[name="lana-visitors"]');
if (!meta || !window.EventSource || !window.fetch) return;
const url = (path) => `${meta.content}/${path}.json`;
let id = null;
try {
id = localStorage.getItem('lana-id');
if (!id || !/^[a-z0-9]{12,40}$/.test(id)) {
id = (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 24);
localStorage.setItem('lana-id', id);
}
} catch (error) {
id = null;
}
(async () => {
try {
if (localStorage.getItem('lana-dihitung')) return;
const res = await fetch(url('live/total'), { method: 'PUT', body: JSON.stringify({ '.sv': { increment: 1 } }) });
if (res.ok) localStorage.setItem('lana-dihitung', '1');
} catch (error) {
}
})();
async function beat() {
if (!id || document.visibilityState !== 'visible') return;
try {
const res = await fetch(url(`live/online/${id}`), { method: 'PUT', body: JSON.stringify({ '.sv': 'timestamp' }) });
if (!res.ok) return;
const ts = await res.json();
if (typeof ts === 'number') {
visitors.offset = ts - Date.now();
visitors.online.set(id, ts);
}
updateVisitors();
} catch (error) {
}
}
function tidy() {
const now = Date.now() + visitors.offset;
let n = 0;
visitors.online.forEach((ts, key) => {
if (n < 5 && typeof ts === 'number' && now - ts > 600000) {
n += 1;
fetch(url(`live/online/${key}`), { method: 'DELETE' }).catch(() => {});
}
});
}
function apply(type, path, data) {
const parts = path.split('/').filter(Boolean);
if (!parts.length) {
if (type === 'put') {
visitors.total = typeof data?.total === 'number' ? data.total : 0;
visitors.online = new Map(Object.entries(data?.online || {}));
tidy();
} else if (data) {
Object.entries(data).forEach(([k, v]) => apply('put', `/${k}`, v));
}
return;
}
if (parts[0] === 'total') {
if (typeof data === 'number') visitors.total = data;
} else if (parts[0] === 'online') {
if (parts.length === 1) {
if (type === 'put') visitors.online = new Map(Object.entries(data || {}));
else Object.entries(data || {}).forEach(([k, v]) => (v === null ? visitors.online.delete(k) : visitors.online.set(k, v)));
} else if (data === null) visitors.online.delete(parts[1]);
else visitors.online.set(parts[1], data);
}
if (visitors.total === null) visitors.total = 0;
}
let source = null;
let timer = 0;
function stop() {
if (source) source.close();
source = null;
clearInterval(timer);
}
function start() {
if (source) return;
source = new EventSource(url('live'));
const onEvent = (e) => {
try {
const { path, data } = JSON.parse(e.data);
apply(e.type, path, data);
updateVisitors();
} catch (error) {
}
};
source.addEventListener('put', onEvent);
source.addEventListener('patch', onEvent);
source.addEventListener('cancel', stop);
beat();
timer = setInterval(() => {
beat();
updateVisitors();
}, 30000);
}
document.addEventListener('visibilitychange', () => (document.visibilityState === 'visible' ? start() : stop()));
if (document.visibilityState === 'visible') start();
})();
function slideshow(stage) {
const first = stage && stage.querySelector('[data-menu-bg]');
if (!first) return () => {};
let list = [];
try {
list = JSON.parse(first.dataset.bgs);
} catch (error) {
return () => {};
}
stage.querySelectorAll('.menu-stage__bg').forEach((el) => {
if (el !== first) el.remove();
});
first.style.visibility = '';
const cap = stage.querySelector('[data-menu-cap]');
const caption = (i) => {
if (!cap || !list[i]) return;
cap.href = list[i].href;
cap.querySelector('[data-cap-text]').textContent = list[i].label;
};
let index = Number(first.dataset.index) || 0;
caption(index);
if (list.length < 2) return () => {};
let current = first;
let alive = true;
let timer = 0;
const HOLD = 6500;
const next = async () => {
if (!alive) return;
if (document.hidden) {
timer = setTimeout(next, 1500);
return;
}
const i = (index + 1) % list.length;
const img = new Image();
img.className = 'menu-stage__bg';
img.alt = '';
img.sizes = '100vw';
img.srcset = list[i].srcset;
img.src = list[i].src;
try {
await img.decode();
} catch (error) {
timer = setTimeout(next, HOLD);
return;
}
if (!alive) return;
const ox = Math.round(20 + Math.random() * 60);
const oy = Math.round(25 + Math.random() * 50);
current.after(img);
caption(i);
const anim = img.animate(
motionFull
? [{ clipPath: `circle(0% at ${ox}% ${oy}%)` }, { clipPath: `circle(150% at ${ox}% ${oy}%)` }]
: [{ opacity: 0 }, { opacity: 1 }],
{ duration: motionFull ? 1500 : 1200, easing: motionFull ? EASE_IN_OUT : 'ease', fill: 'both' },
);
try {
await anim.finished;
} catch (error) {
}
if (!alive) return;
if (current !== first) current.remove();
else current.style.visibility = 'hidden';
current = img;
index = i;
timer = setTimeout(next, HOLD);
};
timer = setTimeout(next, HOLD);
return () => {
alive = false;
clearTimeout(timer);
};
}
(() => {
const stage = document.querySelector('.page-home .menu-stage');
if (stage) slideshow(stage);
})();
(() => {
const template = document.getElementById('menu-template');
const opener = document.querySelector('[data-menu-open]');
if (!template || !opener || typeof HTMLDialogElement !== 'function') return;
let dialog = null;
let stop = () => {};
const pickBackground = (stage) => {
const bg = stage.querySelector('[data-menu-bg]');
if (!bg) return;
try {
const list = JSON.parse(bg.dataset.bgs);
const n = Math.floor(Math.random() * list.length);
bg.srcset = list[n].srcset;
bg.src = list[n].src;
bg.dataset.index = String(n);
} catch (error) {
}
};
const close = () => {
if (!dialog || !dialog.open || dialog.classList.contains('is-closing')) return;
dialog.classList.add('is-closing');
const done = () => {
clearTimeout(fallback);
dialog.removeEventListener('transitionend', onEnd);
dialog.classList.remove('is-closing');
dialog.close();
};
const onEnd = (e) => {
if (e.target === dialog && (e.propertyName === 'clip-path' || e.propertyName === 'opacity')) done();
};
const fallback = setTimeout(done, 600);
dialog.addEventListener('transitionend', onEnd);
};
opener.addEventListener('click', (event) => {
if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
event.preventDefault();
if (!dialog) {
dialog = document.createElement('dialog');
dialog.className = 'menu-dialog';
dialog.setAttribute('aria-label', 'Menu');
dialog.append(template.content.cloneNode(true));
document.body.append(dialog);
dialog.addEventListener('click', (e) => {
const onBackdrop = e.target.classList.contains('menu-stage') || e.target.classList.contains('menu-stage__bg');
if (onBackdrop || e.target.closest('[data-menu-close]')) close();
});
dialog.addEventListener('cancel', (e) => {
e.preventDefault();
close();
});
dialog.addEventListener('close', () => {
stop();
cursor.attach(document.body);
});
}
const stage = dialog.querySelector('.menu-stage');
pickBackground(stage);
stage.querySelectorAll('.rings').forEach((svg) => svg.classList.add('is-drawn'));
updateClocks();
updateMotionToggles();
updateVisitors();
const r = opener.getBoundingClientRect();
dialog.style.setProperty('--mx', `${Math.round(r.left + r.width / 2)}px`);
dialog.style.setProperty('--my', `${Math.round(r.top + r.height / 2)}px`);
dialog.showModal();
cursor.attach(dialog);
stop = slideshow(stage);
});
})();
(() => {
if (!finePointer) return;
const at = (el, e) => {
const r = el.getBoundingClientRect();
el.style.setProperty('--x', `${Math.round(e.clientX - r.left)}px`);
el.style.setProperty('--y', `${Math.round(e.clientY - r.top)}px`);
};
const edge = (e) => {
const el = e.target.closest('.inv');
if (el && !el.contains(e.relatedTarget)) at(el, e);
};
document.addEventListener('pointerover', edge);
document.addEventListener('pointerout', edge);
})();
(() => {
const block = document.querySelector('[data-fill]');
if (!block) return;
const words = Array.from(block.querySelectorAll('.mw'));
block.classList.add('is-filling');
let raf = 0;
const update = () => {
raf = 0;
const r = block.getBoundingClientRect();
const vh = window.innerHeight;
const start = vh * 0.9;
const end = vh * 0.3;
const p = Math.min(1, Math.max(0, (start - r.top) / (start - end + r.height * 0.5)));
const n = Math.round(p * words.length);
words.forEach((w, i) => w.classList.toggle('is-on', i < n));
};
const onScroll = () => {
if (!raf) raf = requestAnimationFrame(update);
};
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
update();
})();
(() => {
const group = document.querySelector('.filters');
if (!group) return;
const items = Array.from(document.querySelectorAll('.work'));
const buttons = Array.from(group.querySelectorAll('[data-filter]'));
const apply = (key, animate = false) => {
if (!buttons.some((b) => b.dataset.filter === key)) key = 'semua';
const before = animate ? new Map(items.map((el) => [el, el.hidden ? null : el.getBoundingClientRect()])) : null;
buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === key)));
items.forEach((item) => {
item.hidden = key !== 'semua' && item.dataset.category !== key;
});
if (!before) return;
let entering = 0;
items.forEach((el) => {
if (el.hidden) return;
const a = before.get(el);
const b = el.getBoundingClientRect();
if (!a) {
el.animate(
motionFull
? [
{ opacity: 0, transform: 'translateY(40px)' },
{ opacity: 1, transform: 'none' },
]
: [{ opacity: 0 }, { opacity: 1 }],
{ duration: 700, delay: entering++ * 70, easing: EASE_OUT, fill: 'backwards' },
);
return;
}
const dx = a.left - b.left;
const dy = a.top - b.top;
if (motionFull && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 760, easing: EASE_IN_OUT });
}
});
};
group.hidden = false;
group.addEventListener('click', (event) => {
const button = event.target.closest('[data-filter]');
if (!button) return;
const key = button.dataset.filter;
apply(key, true);
history.replaceState(null, '', key === 'semua' ? location.pathname : `#${key}`);
});
const fromHash = () => apply(decodeURIComponent(location.hash.slice(1)) || 'semua');
window.addEventListener('hashchange', fromHash);
fromHash();
})();
(() => {
const links = Array.from(document.querySelectorAll('a[data-zoom]'));
if (!links.length || typeof HTMLDialogElement !== 'function') return;
const dialog = document.createElement('dialog');
dialog.className = 'lightbox';
dialog.setAttribute('aria-label', 'Pratinjau gambar');
dialog.innerHTML = `
<div class="lightbox__stage">
<div class="lightbox__bar">
<span class="lightbox__count" aria-live="polite"></span>
<button type="button" class="lightbox__close">Tutup</button>
</div>
<div class="lightbox__view" data-cursor="tutup"></div>
<div class="lightbox__foot">
<p class="lightbox__caption"></p>
<div class="lightbox__nav">
<button type="button" data-step="-1">Sebelumnya</button>
<button type="button" data-step="1">Berikutnya</button>
</div>
</div>
</div>`;
document.body.append(dialog);
const view = dialog.querySelector('.lightbox__view');
const caption = dialog.querySelector('.lightbox__caption');
const count = dialog.querySelector('.lightbox__count');
const nav = dialog.querySelector('.lightbox__nav');
const img = document.createElement('img');
img.className = 'lightbox__img';
let index = 0;
const preload = (i) => {
const link = links[(i + links.length) % links.length];
if (link) new Image().src = link.href;
};
const show = (i, dir = 0) => {
index = (i + links.length) % links.length;
const link = links[index];
const thumb = link.querySelector('img');
img.src = link.href;
img.alt = thumb ? thumb.alt : '';
if (!img.isConnected) view.append(img);
caption.textContent = link.dataset.caption || '';
count.textContent = `${index + 1} / ${links.length}`;
preload(index + 1);
if (dir) {
img.animate(
motionFull
? [
{ opacity: 0, transform: `translateX(${dir * 32}px)` },
{ opacity: 1, transform: 'none' },
]
: [{ opacity: 0 }, { opacity: 1 }],
{ duration: 320, easing: EASE_OUT },
);
}
};
nav.hidden = links.length < 2;
links.forEach((link, i) => {
link.addEventListener('click', (event) => {
if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
event.preventDefault();
show(i);
dialog.showModal();
cursor.attach(dialog);
});
});
dialog.addEventListener('click', (event) => {
const step = event.target.closest('[data-step]');
if (step) show(index + Number(step.dataset.step), Number(step.dataset.step));
else if (event.target.closest('.lightbox__close') || event.target === view) dialog.close();
});
dialog.addEventListener('keydown', (event) => {
if (event.key === 'ArrowRight') show(index + 1, 1);
if (event.key === 'ArrowLeft') show(index - 1, -1);
});
dialog.addEventListener('close', () => {
img.remove();
img.removeAttribute('src');
cursor.attach(document.body);
links[index].focus({ preventScroll: true });
});
let startX = null;
view.addEventListener('pointerdown', (event) => {
startX = event.clientX;
});
view.addEventListener('pointerup', (event) => {
if (startX === null) return;
const dx = event.clientX - startX;
startX = null;
if (Math.abs(dx) > 48) {
event.stopPropagation();
show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
}
});
})();