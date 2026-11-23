import { initRealDemos } from './real-demos.js';

const $ = (selector, root = document) => root.querySelector(selector);
// review-zh.html shares this script; its labels switch on the page language.
const zh = document.documentElement.lang.startsWith('zh');
const t = (en, cn) => (zh ? cn : en);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const resourceNav = $('.paper-links');
resourceNav.addEventListener('toggle', event => {
  if (!event.target.open) return;
  const panel = $('.resource-options', event.target);
  if (panel.getBoundingClientRect().bottom > document.documentElement.clientHeight) {
    panel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}, true);

function dismissResourceMenu(event) {
  const menu = $('details[open]', resourceNav);
  if (!menu) return;
  if (!menu.contains(event.target) || (event.type === 'click' && event.target.closest('a[href]'))) {
    menu.open = false;
  }
}
document.addEventListener('click', dismissResourceMenu);
document.addEventListener('focusin', dismissResourceMenu);
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const menu = $('details[open]', resourceNav);
  if (menu) {
    menu.open = false;
    $('summary', menu).focus();
    event.preventDefault();
  }
});

const dialog = $('#figure-dialog');
const dialogImage = $('#dialog-image');
const dialogViewport = $('.dialog-viewport', dialog);
const sizeButton = $('#figure-size', dialog);
const originalImage = $('#original-image', dialog);
const figurePDF = $('#figure-pdf', dialog);

function setActualSize(enabled) {
  dialogViewport.classList.toggle('actual-size', enabled);
  sizeButton.textContent = enabled ? t('Fit to window', '适应窗口') : t('Actual size', '原始尺寸');
  dialogViewport.scrollTo(0, 0);
}

sizeButton.addEventListener('click', () => setActualSize(!dialogViewport.classList.contains('actual-size')));
$$('.figure-open').forEach(button => button.addEventListener('click', () => {
  const image = $('img', button);
  $('#figure-dialog-title').textContent = button.dataset.title;
  dialogImage.src = button.dataset.original || image.src;
  dialogImage.alt = image.alt;
  originalImage.href = button.dataset.fullPng || dialogImage.src;
  originalImage.textContent = button.dataset.fullPng ? t('Full figure PNG', '完整图片 PNG') : t('Original PNG', '原图 PNG');
  figurePDF.hidden = !button.dataset.pdf;
  if (button.dataset.pdf) figurePDF.href = button.dataset.pdf;
  else figurePDF.removeAttribute('href');
  dialog.showModal();
  setActualSize(false);
}));
$('#close-figure').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});

const copyCitation = $('#copy-bibtex');
const citationEntry = $('#bibtex-entry');
const copyLabel = $('.copy-label', copyCitation);
const readyLabel = copyLabel.textContent;
const citationStatus = $('#citation-status');
let recentCopy = 0;
let copyReset;

function copySelectedCitation() {
  const range = document.createRange();
  range.selectNodeContents(citationEntry);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  try {
    if (document.execCommand('copy')) {
      selection.removeAllRanges();
      return true;
    }
  } catch { /* Keep the entry selected for manual copying. */ }
  return false;
}

copyCitation.hidden = false;
copyCitation.addEventListener('click', async () => {
  const attempt = ++recentCopy;
  clearTimeout(copyReset);
  let copied = false;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(citationEntry.textContent.trim());
      copied = true;
    } catch { /* Try copying the rendered selection when clipboard access is denied. */ }
  }
  if (attempt !== recentCopy) return;
  if (!copied) copied = copySelectedCitation();
  copyCitation.dataset.state = copied ? 'copied' : 'selected';
  copyLabel.textContent = copied ? t('Copied!', '已复制') : t('Text selected', '已选中文本');
  citationStatus.textContent = copied ? t('BibTeX copied to clipboard.', 'BibTeX 已复制到剪贴板。') : t('Citation selected. Use your browser’s Copy command.', '已选中引用，请使用浏览器的复制命令。');
  copyReset = setTimeout(() => {
    delete copyCitation.dataset.state;
    copyLabel.textContent = readyLabel;
    citationStatus.textContent = '';
  }, copied ? 2000 : 5000);
});

const videoObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => { if (!entry.isIntersecting) entry.target.pause(); });
}, { threshold: 0.08 });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) $$('#benchmark-grid video').forEach(video => video.pause());
});

async function loadMedia() {
  const initialHash = location.hash;
  const response = await fetch('media.json');
  if (!response.ok) throw new Error(`Could not load media.json (${response.status})`);
  const media = await response.json();
  if ($('#sim-track')) {
    const { initReviewGalleries } = await import('./review-media.js');
    initReviewGalleries(media, initialHash);
    return;
  }
  const benchmarkGrid = $('#benchmark-grid');
  media.benchmark.forEach(task => {
    const article = document.createElement('article');
    article.className = 'benchmark-card';
    article.innerHTML = `<video controls muted playsinline loop preload="none" poster="${task.poster}" aria-label="${task.title}, native oracle at original speed"><source src="${task.video}" type="video/mp4"></video><div class="card-meta"><span>${task.category}</span><span>${task.duration.toFixed(2)} s · 1×</span></div><h3>${task.title}</h3>`;
    benchmarkGrid.append(article);
    videoObserver.observe($('video', article));
  });
  initRealDemos($('#real-grid'), media.real, $('#real-media-status'));
}

loadMedia().catch(error => {
  console.error(error);
  const message = $('#media-error');
  if (message) { message.hidden = false; message.textContent = t('The simulation videos could not be loaded.', '仿真视频无法加载。'); }
  if ($('#real-grid .real-scene')) return;
  const realStatus = $('#real-media-status');
  realStatus.textContent = t('The real-robot recordings could not be loaded.', '真机录像无法加载。');
  realStatus.hidden = false;
});
