import { makePairPlayer } from './real-demos.js';

const motion = matchMedia('(prefers-reduced-motion: reduce)');
const autoplayAllowed = () => !motion.matches && !navigator.connection?.saveData;

// The same script serves review.html and review-zh.html. Chinese terms follow
// the Chinese manuscript (manuscript_zh.tex and the tables' Chinese labels).
const ZH = document.documentElement.lang.startsWith('zh');
const pick = (en, zh) => (ZH ? zh : en);

const UI = pick({
  enlargeSim: title => 'Enlarge ' + title + ' video', simLabel: title => title + ' video',
  compare: name => `Compare FoveaWAM success and π0.5 failure on ${name}`,
  tasks: 'tasks', scenes: '100 test scenes per task', summary: 'Tasks per family',
}, {
  enlargeSim: title => '放大“' + title + '”视频', simLabel: title => title + '视频',
  compare: name => `对比 FoveaWAM 与 π0.5 在“${name}”上的成功与失败`,
  tasks: '个任务', scenes: '每个任务 100 个测试场景', summary: '各任务族的任务数',
});

// Task families and order follow Figure 4c of the paper. Each task: [id, short label, full title].
const FAMILIES = [
  { key: 'grasp', name: pick('Grasp', '抓取'),
    tasks: [['grasp', pick('Harmonic', '谐波'), '谐波抓取'], ['t1_belt', pick('Conveyor', '传送带'), '传送带抓取'],
      ['t1_xyz', pick('Translating', '平移'), '平移抓取'], ['t1_so3', pick('Rotating', '旋转'), '旋转抓取'],
      ['t1_occ', pick('Occluded', '遮挡'), '遮挡抓取']] },
  { key: 'place', name: pick('Place', '放置'),
    tasks: [['t2_trans', pick('Translating', '移动容器'), '移动容器'], ['t2_se3', pick('Rotating', '旋转容器'), '旋转容器']] },
  { key: 'pass', name: pick('Pass', '穿越'),
    tasks: [['t3_phase', pick('Passage', '导线穿越'), '导线穿越'], ['t3_full', pick('Full passage', '完整穿越'), '完整导线穿越']] },
  { key: 'impact', name: pick('Impact', '撞击'),
    tasks: [['t5_replan', pick('Post-impact', '撞击后抓取'), '撞击后抓取']] },
  { key: 'capture', name: pick('Capture', '捕获'),
    tasks: [['t4_sphere', pick('Ball', '小球'), '小球捕获'], ['t4_sphere_tabletop', pick('Tabletop ball', '桌面小球'), '桌面小球捕获'],
      ['t4_slider', pick('Slider', '滑块'), '滑块捕获'], ['t4_can', pick('Can', '罐体'), '罐体捕获']] },
];

// Real-robot task names in Chinese (English comes from media.json).
const REAL_ZH = { t1: '传送带抓取', t2: '移动盒放置', t3: '转盘抓取', t4: '玩具车抓取', t5: '网球拦截', t6: '斜坡小车抓取' };

// Figure 4b redrawn as a small donut: tasks per family, in the family colours.
function familySummary() {
  // Clockwise from the top, in the order of Figure 4b.
  const counts = ['grasp', 'place', 'pass', 'capture', 'impact']
    .map(key => ({ key, n: FAMILIES.find(family => family.key === key).tasks.length }));
  const total = counts.reduce((sum, family) => sum + family.n, 0);
  const r = 62, c = 2 * Math.PI * r, gap = 3;
  let start = 0;
  const arcs = counts.map(({ key, n }) => {
    const length = (n / total) * c;
    const mid = (start + length / 2) / c * 2 * Math.PI - Math.PI / 2;
    const arc = `<circle class="arc-${key}" r="${r}" cx="100" cy="100" stroke-dasharray="${length - gap} ${c - length + gap}" stroke-dashoffset="${-start}" transform="rotate(-90 100 100)"/>` +
      `<text class="arc-count" x="${(100 + r * Math.cos(mid)).toFixed(1)}" y="${(100 + r * Math.sin(mid)).toFixed(1)}">${n}</text>`;
    start += length;
    return arc;
  }).join('');
  const box = document.createElement('figure');
  box.className = 'wall-summary';
  box.innerHTML = `<svg viewBox="0 0 200 200" role="img" aria-label="${UI.summary}: ` +
    FAMILIES.map(family => family.name + ' ' + family.tasks.length).join(', ') + `">${arcs}` +
    `<text class="donut-total" x="100" y="98">${total}</text><text class="donut-unit" x="100" y="124">${UI.tasks}</text></svg>` +
    `<figcaption>${UI.scenes}</figcaption>`;
  return box;
}

function initTaskWall(tasks) {
  if (!tasks?.length) return;
  const section = document.querySelector('#task-demos');
  const wall = section.querySelector('#sim-track');
  const template = section.querySelector('#sim-example');
  const dialog = section.querySelector('#sim-dialog');
  const full = dialog.querySelector('video');
  const byId = new Map(tasks.map(task => [task.id, task]));
  const inView = new Set();
  const previews = [];
  let wantsPlayback = autoplayAllowed();


  function update() {
    const play = wantsPlayback && !document.hidden && !document.querySelector('dialog[open]');
    for (const video of previews) {
      if (!play || !inView.has(video)) { if (!video.paused) video.pause(); continue; }
      if (!video.paused) continue;
      if (!video.hasAttribute('src')) {
        video.src = video.dataset.src;
        video.currentTime = Number(video.dataset.start);
      }
      video.play().catch(error => {
        if (error.name === 'NotAllowedError' && wantsPlayback) { wantsPlayback = false; update(); }
      });
    }
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) entry.isIntersecting ? inView.add(entry.target) : inView.delete(entry.target);
    update();
  }, { threshold: 0.25 });

  function enlarge(task, preview) {
    dialog.querySelector('h3').textContent = task.displayTitle;
    dialog.querySelector('#sim-original').href = task.video;
    full.setAttribute('aria-label', UI.simLabel(task.displayTitle));
    full.poster = task.poster;
    full.src = task.video;
    full.currentTime = preview.currentTime;
    dialog.showModal();
    update();
    full.play().catch(() => { /* The dialog player has its own controls. */ });
  }

  const placed = new Set();
  const groups = FAMILIES.map(family => {
    const items = family.tasks.filter(([id]) => byId.has(id));
    if (!items.length) return null;
    const group = document.createElement('div');
    group.className = 'family family-' + family.key;
    group.style.setProperty('--span', items.length);
    const label = document.createElement('p');
    label.className = 'family-label';
    label.innerHTML = `<b>${family.name}</b>`;
    group.append(label);
    for (const [id, short, titleZh] of items) {
      const task = { ...byId.get(id), displayTitle: pick(byId.get(id).title, titleZh) };
      placed.add(id);
      const figure = template.content.firstElementChild.cloneNode(true);
      const button = figure.querySelector('button');
      const video = figure.querySelector('video');
      button.setAttribute('aria-label', UI.enlargeSim(task.displayTitle));
      button.addEventListener('click', () => enlarge(task, video));
      video.poster = task.previewPoster || task.poster;
      video.dataset.src = task.preview || task.video;
      video.dataset.start = task.previewStart || 0;
      figure.querySelector('figcaption').textContent = short;
      group.append(figure);
      previews.push(video);
      observer.observe(video);
    }
    return group;
  }).filter(Boolean);

  wall.replaceChildren(...groups, familySummary());
  const unplaced = tasks.filter(task => !placed.has(task.id));
  if (unplaced.length) console.warn('Tasks missing from the wall layout:', unplaced.map(task => task.id));

  dialog.addEventListener('close', () => {
    full.pause();
    full.removeAttribute('src');
    full.load();
    update();
  });
  document.addEventListener('toggle', event => { if (event.target.tagName === 'DIALOG') update(); }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) full.pause(); update(); });
  motion.addEventListener('change', () => { if (motion.matches) wantsPlayback = false; update(); });
  wall.hidden = false;
  update();
}

function initRealWall(tasks) {
  const wall = document.querySelector('#real-wall');
  const fallback = document.querySelector('#real-fallback');
  const dialog = document.querySelector('#real-dialog');
  if (!wall || !tasks?.length || tasks.some(task => !task.success || !task.failure)) return;
  const taskName = task => pick(task.title.charAt(0) + task.title.slice(1).toLowerCase(), REAL_ZH[task.id] || task.title);
  const pairs = [];
  const inView = new Set();
  let wantsPlayback = autoplayAllowed();

  // Each card loops its two previews together, restarting both when the success clip ends.
  function playPair(pair) {
    const [lead, other] = pair.videos;
    for (const video of pair.videos) {
      if (!video.hasAttribute('src')) video.src = video.dataset.src;
    }
    if (Math.abs(lead.currentTime - other.currentTime) > 0.12) other.currentTime = lead.currentTime;
    Promise.all(pair.videos.map(video => video.play())).catch(error => {
      if (error.name === 'NotAllowedError' && wantsPlayback) { wantsPlayback = false; update(); }
    });
  }

  function update() {
    const play = wantsPlayback && !document.hidden && !document.querySelector('dialog[open]');
    for (const pair of pairs) {
      if (play && inView.has(pair.card)) {
        if (pair.videos.some(video => video.paused)) playPair(pair);
      } else {
        pair.videos.forEach(video => video.paused || video.pause());
      }
    }
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) entry.isIntersecting ? inView.add(entry.target) : inView.delete(entry.target);
    update();
  }, { threshold: 0.3 });

  // Enlarged comparison: full-resolution recordings with a shared scrubber.
  const player = makePairPlayer(dialog.querySelector('#real-panel'), dialog.querySelector('#real-playback-status'));
  let current = 0;
  function show(index) {
    current = (index + tasks.length) % tasks.length;
    const task = tasks[current];
    dialog.querySelector('#real-dialog-title').textContent = taskName(task);
    if (!dialog.open) dialog.showModal();
    update();
    player.selectTask(task, true);
  }

  tasks.forEach((task, index) => {
    const name = taskName(task);
    const card = document.createElement('article');
    card.className = 'real-card';
    card.innerHTML = `
      <h3>${name}</h3>
      <button type="button" class="pair-shot" aria-haspopup="dialog" aria-controls="real-dialog">
        <span class="shot"><video muted playsinline preload="none" aria-hidden="true"></video><span class="badge success">FoveaWAM</span></span>
        <span class="shot"><video muted playsinline preload="none" aria-hidden="true"></video><span class="badge failure"><span>π<sub>0.5</sub></span></span></span>
      </button>`;
    const button = card.querySelector('button');
    button.setAttribute('aria-label', UI.compare(name));
    button.addEventListener('click', () => show(index));
    const videos = [...card.querySelectorAll('video')];
    ['success', 'failure'].forEach((kind, i) => {
      videos[i].poster = `assets/real/previews/${task.id}-${kind}.jpg`;
      videos[i].dataset.src = `assets/real/previews/${task.id}-${kind}.mp4`;
    });
    const pair = { card, videos };
    videos[0].addEventListener('ended', () => {
      videos.forEach(video => { video.pause(); video.currentTime = 0; });
      update();
    });
    // The failure clip waits at its last frame until the success clip restarts both.
    pairs.push(pair);
    wall.append(card);
    observer.observe(card);
  });

  dialog.querySelector('#real-previous').addEventListener('click', () => show(current - 1));
  dialog.querySelector('#real-next').addEventListener('click', () => show(current + 1));
  dialog.addEventListener('keydown', event => {
    if (event.target.matches('input') || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    show(current + (event.key === 'ArrowRight' ? 1 : -1));
  });
  dialog.addEventListener('close', () => { player.pause(); update(); });
  document.addEventListener('visibilitychange', update);
  motion.addEventListener('change', () => { if (motion.matches) wantsPlayback = false; update(); });
  wall.hidden = false;
  fallback.hidden = true;
  update();
}

function revealTarget(hash) {
  const target = hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
  target?.closest('details')?.setAttribute('open', '');
  return target;
}

export function initReviewGalleries(media, initialHash) {
  initRealWall(media.real);
  initTaskWall(media.benchmark);
  const target = revealTarget(location.hash);
  // The galleries above the destination acquire their height when the catalogue arrives.
  if (target && performance.getEntriesByType('navigation')[0]?.type !== 'back_forward') {
    requestAnimationFrame(() => {
      if (location.hash === initialHash) target.scrollIntoView({ behavior: 'instant' });
    });
  }
}
