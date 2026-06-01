let appData = { appTitle: 'My World Flashcards', subtitle: 'Sample Personalized Flashcard App', pages: [] };
let pages = [];
let activeGroup = 'All';
let currentPage = null;
let currentCardIndex = 0;
let voices = [];
let chosenVoice = null;
let currentAudio = null;

const AUDIO_VERSION = 'edge-ana-neural-2';
const CARD_VERSION = 'stock-family-polished-1';

const splash = document.getElementById('splash');
const library = document.getElementById('library');
const pageScreen = document.getElementById('pageScreen');
const tabs = document.getElementById('tabs');
const pageGrid = document.getElementById('pageGrid');
const pageTitle = document.getElementById('pageTitle');
const cardGrid = document.getElementById('cardGrid');
const dialog = document.getElementById('cardDialog');
const modalImage = document.getElementById('modalImage');
const modalPhrase = document.getElementById('modalPhrase');
const audioStatus = document.getElementById('audioStatus');

function show(screen) {
  [splash, library, pageScreen].forEach(item => item.classList.remove('active'));
  screen.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

document.getElementById('startBtn').addEventListener('click', () => show(library));
document.getElementById('goHome').addEventListener('click', () => show(splash));
document.getElementById('backToPages').addEventListener('click', () => show(library));
document.getElementById('closeDialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener('close', stopSpeaking);
document.getElementById('playAudio').addEventListener('click', () => playCurrentCard());
document.getElementById('nextCard').addEventListener('click', () => openNextCard());

function groupList() {
  return ['All', ...new Set(pages.map(page => page.group))];
}

function visiblePages() {
  return activeGroup === 'All' ? pages : pages.filter(page => page.group === activeGroup);
}

function renderTabs() {
  tabs.innerHTML = groupList().map(group => `
    <button class="tab ${group === activeGroup ? 'active' : ''}" data-group="${escapeHtml(group)}">
      ${escapeHtml(group)}
    </button>
  `).join('');
  tabs.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => {
    activeGroup = button.dataset.group;
    renderTabs();
    renderPages();
  }));
}

function renderPages() {
  pageGrid.innerHTML = visiblePages().map(page => `
    <button class="page-card" data-page="${escapeHtml(page.id)}">
      <img src="${escapeHtml(versionedUrl(page.thumbnail))}" alt="${escapeHtml(page.title)}">
      <small>${escapeHtml(page.group)}</small>
      <strong>${escapeHtml(page.title)}</strong>
      <span>${page.cards.length} cards</span>
    </button>
  `).join('');
  pageGrid.querySelectorAll('.page-card').forEach(button => button.addEventListener('click', () => {
    const page = pages.find(item => item.id === button.dataset.page);
    openPage(page);
  }));
}

function openPage(page) {
  currentPage = page;
  pageTitle.textContent = page.title;
  cardGrid.innerHTML = page.cards.map((card, index) => `
    <button class="flash-card" data-index="${index}" aria-label="${escapeHtml(card.displayPhrase)}">
      <img src="${escapeHtml(versionedUrl(card.image))}" alt="${escapeHtml(card.displayPhrase)}">
      <span>${escapeHtml(card.displayPhrase)}</span>
    </button>
  `).join('');
  cardGrid.querySelectorAll('.flash-card').forEach(button => button.addEventListener('click', () => {
    openCard(Number(button.dataset.index));
  }));
  show(pageScreen);
}

function openCard(index) {
  currentCardIndex = index;
  const card = currentPage.cards[currentCardIndex];
  stopSpeaking();
  modalImage.src = versionedUrl(card.image);
  modalImage.alt = card.displayPhrase;
  modalPhrase.textContent = card.displayPhrase;
  audioStatus.textContent = '';
  dialog.showModal();
  playCurrentCard();
}

function openNextCard() {
  if (!currentPage) return;
  const nextIndex = (currentCardIndex + 1) % currentPage.cards.length;
  openCard(nextIndex);
}

function playCurrentCard() {
  if (!currentPage) return;
  const card = currentPage.cards[currentCardIndex];
  tryPlayAudioFile(card.audio, speechTextFor(card));
}

function speechTextFor(card) {
  return card.audioPrompt || card.spokenPhrase || card.displayPhrase;
}

function tryPlayAudioFile(path, fallbackPhrase) {
  stopSpeaking();
  audioStatus.textContent = 'Loading sample voice...';
  const audio = new Audio(`${path}?v=${AUDIO_VERSION}`);
  currentAudio = audio;
  audio.preload = 'auto';
  audio.addEventListener('playing', () => {
    audioStatus.textContent = 'Playing MP3 voice';
  }, { once: true });
  audio.addEventListener('ended', () => {
    audioStatus.textContent = '';
  }, { once: true });
  audio.addEventListener('error', () => {
    speakFallback(fallbackPhrase);
  }, { once: true });
  audio.play().catch(() => speakFallback(fallbackPhrase));
}

function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}

function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  voices = speechSynthesis.getVoices();
  chosenVoice = chooseBestAvailableVoice(voices);
}

function chooseBestAvailableVoice(list) {
  if (!list || !list.length) return null;
  const preferred = list
    .filter(voice => /^en/i.test(voice.lang || ''))
    .sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return preferred[0] || list[0];
}

function scoreVoice(voice) {
  const name = (voice.name || '').toLowerCase();
  let score = 0;
  if ((voice.lang || '').toLowerCase().startsWith('en-us')) score += 8;
  ['ana', 'samantha', 'ava', 'zoe', 'aria', 'jenny'].forEach((word, index) => {
    if (name.includes(word)) score += 15 - index;
  });
  if (name.includes('premium') || name.includes('enhanced') || name.includes('neural')) score += 4;
  if (name.includes('compact')) score -= 4;
  return score;
}

function speakFallback(text) {
  audioStatus.textContent = 'MP3 voice is not installed here, so this is the device voice.';
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  if (chosenVoice) utterance.voice = chosenVoice;
  utterance.rate = 0.92;
  utterance.pitch = 1.05;
  utterance.volume = 1;
  speechSynthesis.speak(utterance);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function versionedUrl(path) {
  return `${path}?v=${CARD_VERSION}`;
}

if ('speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

fetch('./data/pages.json')
  .then(response => response.json())
  .then(data => {
    appData = data;
    pages = data.pages || [];
    document.title = appData.appTitle || 'My World Flashcards';
    renderTabs();
    renderPages();
  })
  .catch(() => {
    pageGrid.innerHTML = '<p class="load-error">The sample flashcards could not load.</p>';
  });
