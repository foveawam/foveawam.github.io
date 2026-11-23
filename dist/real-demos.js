// review-zh.html shares this script; its labels switch on the page language.
const zh = document.documentElement.lang.startsWith('zh');
const t = (en, cn) => (zh ? cn : en);

export function makePairPlayer(panel, status, { onCycle } = {}) {
  const videos = [...panel.querySelectorAll('video')];
  const [primary, comparison] = videos;
  const button = panel.querySelector('.real-play');
  const timeline = panel.querySelector('input[type="range"]');
  let task;
  let frame = 0;
  let wantsPlay = false;
  let started = false;
  let revision = 0;
  let animation = 0;

  function showFrame(next) {
    frame = Math.min(task.frames - 1, Math.max(0, next));
    timeline.value = String(frame);
    const time = (frame / task.fps).toFixed(2);
    timeline.setAttribute('aria-valuetext', time + ' seconds, frame ' + (frame + 1) + ' of ' + task.frames);
  }

  function align(video) {
    const target = frame / task.fps;
    if (video.readyState >= 1 && Math.abs(video.currentTime - target) > 0.002) video.currentTime = target;
  }

  function hold() {
    revision++;
    started = false;
    cancelAnimationFrame(animation);
    videos.forEach(video => video.pause());
  }

  function pause() {
    wantsPlay = false;
    hold();
    button.setAttribute('aria-label', t('Play both videos', '同时播放两段视频'));
    button.dataset.playing = 'false';
  }

  function fail() {
    pause();
    status.textContent = t('The paired recordings could not play. Press play to try again.', '这组录像无法播放，请再次点击播放。');
    status.hidden = false;
  }

  function tick() {
    if (!started) return;
    const next = Math.min(task.frames - 1, Math.floor(primary.currentTime * task.fps));
    if (next !== frame) showFrame(next);
    if (!comparison.seeking && !comparison.ended && !primary.ended &&
        Math.abs(primary.currentTime - comparison.currentTime) > 1.5 / task.fps) {
      comparison.currentTime = primary.currentTime;
    }
    animation = requestAnimationFrame(tick);
  }

  function startWhenReady() {
    if (!wantsPlay || started || !videos.every(video => video.readyState >= 3 && !video.seeking)) return;
    started = true;
    const attempt = revision;
    Promise.all(videos.map(video => video.play())).then(() => {
      if (attempt === revision) tick();
    }).catch(() => {
      if (attempt === revision) fail();
    });
  }

  function play() {
    status.hidden = true;
    wantsPlay = true;
    button.setAttribute('aria-label', t('Pause both videos', '同时暂停两段视频'));
    button.dataset.playing = 'true';
    if (frame === task.frames - 1) showFrame(0);
    videos.forEach(video => {
      if (video.preload !== 'auto' || video.error) {
        video.preload = 'auto';
        if (video.readyState < 3 || video.error) video.load();
      }
      align(video);
    });
    startWhenReady();
  }

  button.addEventListener('click', () => wantsPlay ? pause() : play());
  timeline.addEventListener('input', () => {
    pause();
    showFrame(Number(timeline.value));
    videos.forEach(align);
  });
  videos.forEach(video => {
    video.addEventListener('loadedmetadata', () => { if (!started) align(video); });
    video.addEventListener('canplay', startWhenReady);
    video.addEventListener('seeked', startWhenReady);
    video.addEventListener('waiting', () => {
      if (!started || video.readyState >= 3) return;
      // Hold both at the earlier frame while either decoder is buffering.
      hold();
      showFrame(Math.floor(Math.min(primary.currentTime, comparison.currentTime) * task.fps));
      videos.forEach(align);
      startWhenReady();
    });
    video.addEventListener('ended', () => {
      if (!wantsPlay || !videos.every(v => v.ended)) return;
      // The caller may move on to another task instead of looping this one.
      if (onCycle?.()) return;
      hold();
      showFrame(0);
      videos.forEach(align);
      startWhenReady();
    });
    video.addEventListener('error', () => { if (video.error) fail(); });
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting && wantsPlay) pause();
  });
  observer.observe(panel);

  function selectTask(next, resume = wantsPlay) {
    pause();
    task = next;
    status.hidden = true;
    timeline.max = String(task.frames - 1);
    showFrame(0);
    [task.success, task.failure].forEach((clip, index) => {
      const video = videos[index];
      const method = index === 0 ? t('FoveaWAM success', 'FoveaWAM 成功') : t('π₀.₅ failure', 'π₀.₅ 失败');
      video.setAttribute('aria-label', task.title + ', ' + method);
      video.width = task.width;
      video.height = task.height;
      video.preload = 'metadata';
      video.poster = clip.poster;
      video.src = clip.video;
      video.load();
    });
    if (resume) play();
  }
  return { selectTask, pause, play, isPlaying: () => wantsPlay };
}

export function initRealDemos(root, tasks, status) {
  if (!tasks?.length || tasks.some(task => !task.success || !task.failure)) {
    status.textContent = t('The paired real-robot recordings are unavailable.', '成对的真机录像暂不可用。');
    status.hidden = false;
    return;
  }
  const tablist = root.querySelector('[role="tablist"]');
  const panel = root.querySelector('[role="tabpanel"]');
  const player = makePairPlayer(panel, status);
  let selected = -1;
  const tabs = tasks.map((task, index) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = 'real-tab-' + task.id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panel.id);
    tab.textContent = task.title;
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', event => {
      const destinations = { ArrowLeft: (index + tasks.length - 1) % tasks.length,
        ArrowRight: (index + 1) % tasks.length, Home: 0, End: tasks.length - 1 };
      if (!(event.key in destinations)) return;
      event.preventDefault();
      const target = destinations[event.key];
      tabs[target].focus();
      select(target);
    });
    return tab;
  });

  function select(index) {
    if (selected === index) return;
    selected = index;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === selected));
      tab.tabIndex = i === selected ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', tabs[selected].id);
    player.selectTask(tasks[selected]);
  }

  tablist.replaceChildren(...tabs);
  root.hidden = false;
  select(Math.max(0, tasks.findIndex(task => task.id === 't5')));
}
