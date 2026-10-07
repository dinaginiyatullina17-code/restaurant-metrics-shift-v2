/*
 * «Показатели ресторана» — логика интерактивного курса.
 * Адаптировано из reusable/script.js: SPA-навигация, SCORM/localStorage,
 * появление блоков, сортировка и drag-and-drop без зависимостей.
 */

const PAGES = ['home','income','revenue','costs','profit','productivity','summary'];
const CHAPTER_ORDER = ['income','revenue','costs','profit','productivity','summary'];
const CHAPTER_NAMES = {
  home:'', income:'Доходы ресторана', revenue:'Что влияет на выручку',
  costs:'Затраты на смене', profit:'Как смена влияет на прибыль',
  productivity:'Производительность труда', summary:'Главное по теме'
};

const PROGRESS_KEY = 'restaurant_metrics_2_progress_v12';
const PAGE_REQUIREMENTS = {
  home: ['map-hall', 'map-cash', 'map-kitchen', 'map-assembly', 'map-handoff', 'map-manager'],
  income: ['reveal-digital', 'income-feedback'],
  revenue: ['reveal-revenue', 'reveal-traffic', 'reveal-average-check', 'average-check-feedback'],
  costs: ['cost-feedback'],
  profit: [],
  productivity: ['itph-feedback', 'seef-recall-feedback'],
  summary: ['final-feedback']
};
const TEST_ANSWERS = {
  'income-feedback': 'Сравни продажи с целью, проверь трафик и средний чек, затем дай команде конкретную задачу.',
  'average-check-feedback': 'При стабильном трафике сначала проверь наполненность и стоимость блюд в заказе, а затем скорректируй фокус продаж.',
  'cost-feedback': 'К прямому Food Cost относятся продукты и упаковка; к прочему — списания, питание сотрудников, недостачи и излишки.',
  'itph-feedback': 'Если фактический ITPH выше плана и растёт очередь, команда перегружена: усиль загруженную станцию по SEEF.',
  'seef-recall-feedback': 'Опытный сотрудник усиливает сборку, а новичок получает подходящую задачу с учётом его навыков.',
  'final-feedback': 'Если трафик не изменился, а выручка снизилась — проверь средний чек. При очереди сопоставь нагрузку с часами команды и скорректируй расстановку. Жалобы могут снижать возвратность Гостей.'
};
let currentPage = 'home';
let unlockedChapters = 1;
let completedTests = new Set();
let testAttempts = {};
let noticeTimer = null;

function missingTests(pageId) {
  return (PAGE_REQUIREMENTS[pageId] || []).filter(id => !completedTests.has(id));
}

function refreshHomeContinue() {
  const button = document.getElementById('continue-from-map');
  const gate = document.getElementById('employee-gate-hint');
  const teamBlock = document.getElementById('map-next-step');
  const startBlock = document.getElementById('home-start');
  const ready = missingTests('home').length === 0;
  if (button) button.disabled = !ready;
  if (gate) gate.hidden = ready;
  if (teamBlock) teamBlock.hidden = !ready;
  if (teamBlock) teamBlock.classList.toggle('visible', ready);
  if (startBlock) startBlock.hidden = !ready;
}

function showCourseNotice(message, feedbackId) {
  const notice = document.getElementById('course-notice');
  if (notice) {
    notice.textContent = message;
    notice.classList.add('show');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => notice.classList.remove('show'), 4200);
  }
  if (!feedbackId) {
    document.getElementById('map-next-step')?.scrollIntoView({behavior:'smooth', block:'center'});
    document.getElementById('map-next-step')?.classList.add('needs-attention');
    setTimeout(() => document.getElementById('map-next-step')?.classList.remove('needs-attention'), 1800);
    return;
  }
  const requirement = document.getElementById(feedbackId);
  const target = requirement?.matches('details')
    ? requirement
    : requirement?.matches('.employee-hotspot')
      ? requirement.closest('.restaurant-map')
      : requirement?.closest('.exercise-card, .action-card');
  if (!target) return;
  target.classList.add('needs-attention');
  target.scrollIntoView({behavior:'smooth', block:'center'});
  setTimeout(() => target.classList.remove('needs-attention'), 1800);
}

function unlockNextChapterIfReady(pageId) {
  const idx = CHAPTER_ORDER.indexOf(pageId);
  if (idx === -1 || missingTests(pageId).length) return;
  const nextUnlocked = Math.min(idx + 2, CHAPTER_ORDER.length);
  if (nextUnlocked > unlockedChapters) {
    unlockedChapters = nextUnlocked;
    applyHomeLocks();
    saveProgress();
  }
}

function navigateTo(pageId) {
  if (!PAGES.includes(pageId)) return;
  const idx = CHAPTER_ORDER.indexOf(pageId);
  const currentIdx = CHAPTER_ORDER.indexOf(currentPage);
  if (currentPage === 'home' && idx >= 0) {
    const missing = missingTests('home');
    if (missing.length) {
      showCourseNotice('Сначала изучи карточку каждого сотрудника на картинке. После этого сможешь перейти к модулю 1.', missing[0]);
      return;
    }
  }
  if (idx > currentIdx && currentIdx !== -1) {
    const missing = missingTests(currentPage);
    if (missing.length) {
      showCourseNotice('Чтобы продолжить, открой все раскрывающиеся блоки и пройди тесты выше.', missing[0]);
      return;
    }
  }
  if (idx > 0) {
    for (let chapterIndex = 0; chapterIndex < idx; chapterIndex += 1) {
      const missing = missingTests(CHAPTER_ORDER[chapterIndex]);
      if (missing.length) {
        showCourseNotice('Сначала заверши предыдущие модули: открой все раскрывающиеся блоки и пройди тесты.', missing[0]);
        return;
      }
    }
  }
  if (idx >= unlockedChapters) {
    showCourseNotice('Эта глава откроется после прохождения предыдущей.');
    return;
  }

  PAGES.forEach(id => document.getElementById('page-' + id)?.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (!target) return;
  document.getElementById('top-nav')?.classList.toggle('home-hidden', pageId === 'home');
  target.classList.add('active');
  currentPage = pageId;
  unlockNextChapterIfReady(pageId);
  window.scrollTo({top:0, behavior:'instant'});

  const chapterLabel = document.getElementById('nav-chapter');
  const progressLabel = document.getElementById('nav-progress');
  const progressBar = document.getElementById('progress-bar');
  if (chapterLabel) chapterLabel.textContent = CHAPTER_NAMES[pageId] || '';
  if (idx !== -1) {
    if (progressLabel) progressLabel.textContent = `${idx + 1} / ${CHAPTER_ORDER.length}`;
    if (progressBar) progressBar.style.width = `${Math.round(((idx + 1) / CHAPTER_ORDER.length) * 100)}%`;
  } else {
    if (progressLabel) progressLabel.textContent = '';
    if (progressBar) progressBar.style.width = '0%';
  }
  applyHomeLocks();
  setTimeout(initFadeIn, 40);
}

function initFadeIn() {
  const elements = document.querySelectorAll('.page.active .fade-in:not(.visible)');
  if (!('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {threshold:.08, rootMargin:'0px 0px -40px 0px'});
  elements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) el.classList.add('visible');
    else observer.observe(el);
  });
}

function collectState() { return {version:12, unlocked:unlockedChapters, completed:[...completedTests], attempts:testAttempts}; }

function saveProgress() {
  const json = JSON.stringify(collectState());
  try { localStorage.setItem(PROGRESS_KEY, json); } catch (_) {}
  if (window.SCORM && typeof SCORM.set === 'function') {
    SCORM.set('cmi.suspend_data', json);
    const status = typeof SCORM.get === 'function' ? SCORM.get('cmi.core.lesson_status') : '';
    if (!status || status === 'not attempted' || status === 'unknown') SCORM.set('cmi.core.lesson_status', 'incomplete');
    if (typeof SCORM.commit === 'function') SCORM.commit();
  }
}

function loadProgress() {
  let json = '';
  if (window.SCORM && typeof SCORM.get === 'function') {
    try { json = SCORM.get('cmi.suspend_data') || ''; } catch (_) {}
  }
  if (!json) {
    try { json = localStorage.getItem(PROGRESS_KEY) || localStorage.getItem('restaurant_metrics_2_progress_v11') || localStorage.getItem('restaurant_metrics_2_progress_v10') || ''; } catch (_) {}
  }
  if (json) {
    try {
      const state = JSON.parse(json);
      if ([10,11,12].includes(state.version) && typeof state.unlocked === 'number') {
        unlockedChapters = Math.max(1, Math.min(state.unlocked, CHAPTER_ORDER.length));
      }
      if ([10,11,12].includes(state.version) && Array.isArray(state.completed)) completedTests = new Set(state.completed);
      if (state.version === 10 || state.version === 11) {
        ['map-hall','map-cash','map-kitchen','map-assembly','map-handoff','map-manager','team-overview-opened'].forEach(id => completedTests.delete(id));
      }
      if ([10,11,12].includes(state.version) && state.attempts && typeof state.attempts === 'object') testAttempts = state.attempts;
    } catch (_) {}
  }
  unlockedChapters = 1;
  for (let index = 0; index < CHAPTER_ORDER.length - 1; index += 1) {
    if (missingTests(CHAPTER_ORDER[index]).length) break;
    unlockedChapters = index + 2;
  }
  applyHomeLocks();
  restoreTestStates();
  document.querySelectorAll('.employee-hotspot[id]').forEach(hotspot => {
    const viewed = completedTests.has(hotspot.id);
    hotspot.classList.toggle('viewed', viewed);
    hotspot.classList.toggle('needs-viewing', !viewed);
  });
  refreshHomeContinue();
  if (json && (() => { try { return JSON.parse(json).version < 12; } catch (_) { return false; } })()) saveProgress();
}

function applyHomeLocks() {
  CHAPTER_ORDER.forEach((_, index) => {
    const card = document.getElementById('home-card-' + (index + 1));
    if (!card) return;
    const locked = index >= unlockedChapters;
    card.classList.toggle('locked', locked);
    card.setAttribute('aria-disabled', String(locked));
  });
}

function initRequiredReveals() {
  document.querySelectorAll('details[data-required-reveal]').forEach(details => {
    details.addEventListener('toggle', () => {
      if (!details.open || completedTests.has(details.id)) return;
      completedTests.add(details.id);
      details.classList.add('reveal-completed');
      unlockNextChapterIfReady(currentPage);
      saveProgress();
    });
    if (completedTests.has(details.id)) details.classList.add('reveal-completed');
  });
}

function lockTest(id) {
  const box = document.getElementById(id);
  const test = box?.closest('.exercise-card, .action-card');
  if (!test) return;
  test.classList.add('test-completed');
  test.querySelectorAll('button:not([data-keep-enabled]), input, select').forEach(control => { control.disabled = true; });
}

function restoreTestStates() {
  Object.keys(TEST_ANSWERS).forEach(id => {
    if (completedTests.has(id)) lockTest(id);
  });
}

function showFeedback(id, ok, goodText, badText) {
  const box = document.getElementById(id);
  if (!box) return;
  const tracked = Object.prototype.hasOwnProperty.call(TEST_ANSWERS, id);
  if (tracked && completedTests.has(id)) return;

  if (!tracked) {
    box.className = `feedback-box show ${ok ? 'correct' : 'incorrect'}`;
    box.innerHTML = `<strong>${ok ? goodText : badText}</strong>`;
    return;
  }

  if (ok) {
    box.className = 'feedback-box show correct';
    box.innerHTML = `<strong>${goodText}</strong>`;
    completedTests.add(id);
    lockTest(id);
  } else {
    const attempt = Math.min(2, Number(testAttempts[id] || 0) + 1);
    testAttempts[id] = attempt;
    box.className = 'feedback-box show incorrect';
    if (attempt < 2) {
      box.innerHTML = `<strong>Подсказка:</strong> ${badText}<span class="attempt-feedback">Попробуй ещё раз.</span>`;
    } else {
      box.innerHTML = `<strong>Разбор:</strong> ${badText}<span class="attempt-feedback"><b>Правильное решение:</b> ${TEST_ANSWERS[id]}</span>`;
      completedTests.add(id);
      lockTest(id);
    }
  }
  unlockNextChapterIfReady(currentPage);
  saveProgress();
}

function answerChoice(button, isCorrect, feedbackId, successText, errorText) {
  const group = button.closest('[data-choice-group]');
  if (!group) return;
  group.querySelectorAll('button').forEach(item => item.classList.remove('correct-pick','wrong-pick'));
  button.classList.add(isCorrect ? 'correct-pick' : 'wrong-pick');
  showFeedback(feedbackId, isCorrect, successText, errorText || 'Посмотри внимательнее на связь показателя с целью по выручке.');
}

/* Сортировка управленческого цикла */
const CORRECT_ORDER = [0,1,2,3,4];

function initSortable() {
  const list = document.getElementById('sortable-list');
  if (!list || list.dataset.bound) return;
  list.dataset.bound = '1';
  let dragElement = null;
  list.querySelectorAll('.sort-item').forEach(item => {
    item.tabIndex = 0;
    item.addEventListener('dragstart', () => {
      dragElement = item;
      setTimeout(() => item.classList.add('dragging'), 0);
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      list.querySelectorAll('.sort-item').forEach(el => el.classList.remove('drag-over-top','drag-over-bottom'));
      dragElement = null;
    });
    item.addEventListener('keydown', event => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      if (event.key === 'ArrowUp' && item.previousElementSibling) list.insertBefore(item, item.previousElementSibling);
      if (event.key === 'ArrowDown' && item.nextElementSibling) list.insertBefore(item.nextElementSibling, item);
      item.focus();
    });
    item.addEventListener('touchstart', () => { dragElement = item; item.classList.add('dragging'); }, {passive:true});
    item.addEventListener('touchmove', event => markInsertPoint(list, event.touches[0].clientY), {passive:true});
    item.addEventListener('touchend', event => {
      if (!dragElement) return;
      const target = insertTarget(list, event.changedTouches[0].clientY);
      if (target.el) target.before ? list.insertBefore(dragElement,target.el) : target.el.insertAdjacentElement('afterend',dragElement);
      dragElement.classList.remove('dragging');
      dragElement = null;
    });
  });
  list.addEventListener('dragover', event => {
    event.preventDefault();
    if (!dragElement) return;
    const after = getDragAfterElement(list,event.clientY);
    after ? list.insertBefore(dragElement,after) : list.appendChild(dragElement);
  });
}

function insertTarget(list,y) {
  const elements = [...list.querySelectorAll('.sort-item:not(.dragging)')];
  let target = null, before = true;
  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    if (y < rect.top + rect.height / 2) { target = element; before = true; break; }
    target = element; before = false;
  }
  return {el:target,before};
}
function markInsertPoint(list,y) {
  const target = insertTarget(list,y);
  list.querySelectorAll('.sort-item').forEach(item => item.classList.remove('drag-over-top','drag-over-bottom'));
  if (target.el) target.el.classList.add(target.before ? 'drag-over-top' : 'drag-over-bottom');
}
function getDragAfterElement(container,y) {
  return [...container.querySelectorAll('.sort-item:not(.dragging)')].reduce((closest,child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    return offset < 0 && offset > closest.offset ? {offset,element:child} : closest;
  }, {offset:-Infinity,element:null}).element;
}
function checkSortOrder() {
  const indices = [...document.querySelectorAll('#sortable-list .sort-item')].map(el => Number(el.dataset.idx));
  const ok = indices.length === CORRECT_ORDER.length && indices.every((value,index) => value === CORRECT_ORDER[index]);
  showFeedback('sort-feedback',ok,'Верно! Это путь от данных к устойчивой работе команды.','Порядок пока не складывается. Начни со сравнения плана и факта.');
}

/* Drag-and-drop Food Cost с мышью, клавиатурой и тачем */
function initZoneSort(poolId,zone1Id,zone2Id) {
  const pool = document.getElementById(poolId);
  const zone1 = document.getElementById(zone1Id);
  const zone2 = document.getElementById(zone2Id);
  if (!pool || !zone1 || !zone2) return;
  const zones = [pool,zone1,zone2];
  zones.forEach(zone => {
    if (!zone.dataset.zoneBound) {
      zone.dataset.zoneBound = '1';
      zone.addEventListener('dragover', event => { event.preventDefault(); zone.classList.add('drag-over'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
      zone.addEventListener('drop', event => {
        event.preventDefault(); zone.classList.remove('drag-over');
        const chip = document.getElementById(event.dataTransfer.getData('text/plain'));
        if (chip) zone.appendChild(chip);
      });
    }
  });
  pool.querySelectorAll('.drag-chip').forEach(chip => bindChip(chip,pool,zone1,zone2));
}

function bindChip(chip,pool,zone1,zone2) {
  if (chip.dataset.chipBound) return;
  chip.dataset.chipBound = '1';
  chip.draggable = true;
  chip.tabIndex = 0;
  chip.setAttribute('role','button');
  chip.setAttribute('aria-label',chip.textContent.trim() + '. Нажми Enter, чтобы переместить.');
  chip.addEventListener('dragstart',event => { event.dataTransfer.setData('text/plain',chip.id); chip.classList.add('dragging'); });
  chip.addEventListener('dragend',() => chip.classList.remove('dragging'));
  chip.addEventListener('keydown',event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    const next = chip.parentElement === pool ? zone1 : chip.parentElement === zone1 ? zone2 : pool;
    next.appendChild(chip); chip.focus();
  });
  let clone = null;
  chip.addEventListener('touchstart',() => {
    clone = chip.cloneNode(true);
    clone.style.cssText = 'position:fixed;pointer-events:none;opacity:.78;z-index:9999;';
    document.body.appendChild(clone);
  },{passive:true});
  chip.addEventListener('touchmove',event => {
    const touch = event.touches[0];
    if (clone) { clone.style.left = `${touch.clientX - 40}px`; clone.style.top = `${touch.clientY - 20}px`; }
    [pool,zone1,zone2].forEach(zone => zone.classList.toggle('drag-over',inRect(touch,zone.getBoundingClientRect())));
  },{passive:true});
  chip.addEventListener('touchend',event => {
    clone?.remove(); clone = null;
    const touch = event.changedTouches[0];
    [pool,zone1,zone2].forEach(zone => {
      zone.classList.remove('drag-over');
      if (inRect(touch,zone.getBoundingClientRect())) zone.appendChild(chip);
    });
  });
}
function inRect(point,rect) { return point.clientX >= rect.left && point.clientX <= rect.right && point.clientY >= rect.top && point.clientY <= rect.bottom; }
function setEq(a,b) { return a.length === b.length && a.every(value => b.includes(value)); }
function checkZoneSort(zone1Id,zone2Id,correct1,correct2,feedbackId) {
  const keys = id => [...document.getElementById(id).querySelectorAll('.drag-chip')].map(chip => chip.dataset.key);
  const ok = setEq(keys(zone1Id),correct1) && setEq(keys(zone2Id),correct2);
  showFeedback(feedbackId,ok,'Верно! Прямой и прочий Food Cost распределены правильно.','Проверь: прямой FC связан с приготовлением заказа, прочий — со списаниями и учётом.');
}
function resetZonePool(poolId,...zoneIds) {
  const pool = document.getElementById(poolId);
  if (!pool) return;
  zoneIds.forEach(id => document.getElementById(id)?.querySelectorAll('.drag-chip').forEach(chip => pool.appendChild(chip)));
  shuffleChildren(pool);
}
function resetZoneTest(poolId,zoneIds,feedbackId) {
  resetZonePool(poolId,...zoneIds);
  completedTests.delete(feedbackId);
  testAttempts[feedbackId] = 0;
  const feedback = document.getElementById(feedbackId);
  const test = feedback?.closest('.exercise-card');
  if (feedback) { feedback.className = 'feedback-box'; feedback.innerHTML = ''; }
  if (test) {
    test.classList.remove('test-completed');
    test.querySelectorAll('button, input, select').forEach(control => { control.disabled = false; });
  }
  unlockedChapters = 1;
  for (let index = 0; index < CHAPTER_ORDER.length - 1; index += 1) {
    if (missingTests(CHAPTER_ORDER[index]).length) break;
    unlockedChapters = index + 2;
  }
  applyHomeLocks();
  saveProgress();
}
function shuffleChildren(element) {
  if (!element) return;
  const children = [...element.children];
  for (let index = children.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [children[index],children[swap]] = [children[swap],children[index]];
  }
  children.forEach(child => element.appendChild(child));
}

/* Интерактив прибыли */
let expectedProfitStep = 1;
const PROFIT_TEXT = {
  1:'Выручка − FC = маржинальная прибыль',
  2:'Маржа − LC = операционная прибыль',
  3:'Операционная прибыль − аренда и прочие затраты = EBITDA'
};
function profitStep(step,button) {
  if (step !== expectedProfitStep) {
    if (completedTests.has('profit-feedback')) {
      const feedback = document.getElementById('profit-feedback');
      if (feedback) {
        feedback.className = 'feedback-box show incorrect';
        feedback.innerHTML = '<strong>Подсказка:</strong> сначала вычти предыдущую статью затрат.';
      }
    } else {
      showFeedback('profit-feedback',false,'','Сначала вычти предыдущую статью затрат.');
    }
    return;
  }
  button.classList.add('done'); button.disabled = true;
  const chip = document.createElement('span'); chip.textContent = PROFIT_TEXT[step];
  document.getElementById('profit-path')?.appendChild(chip);
  expectedProfitStep += 1;
  if (expectedProfitStep === 4) {
    if (completedTests.has('profit-feedback')) {
      const feedback = document.getElementById('profit-feedback');
      if (feedback) {
        feedback.className = 'feedback-box show correct';
        feedback.innerHTML = '<strong>Верно! Ты снова дошёл от выручки до EBITDA.</strong>';
      }
    } else {
      showFeedback('profit-feedback',true,'Верно! Ты дошёл от выручки до EBITDA.','');
    }
  }
}
function resetProfitPath() {
  expectedProfitStep = 1;
  const path = document.getElementById('profit-path'); if (path) path.innerHTML = '';
  document.querySelectorAll('.profit-buttons button').forEach(button => { button.disabled = false; button.classList.remove('done'); });
  const feedback = document.getElementById('profit-feedback');
  if (feedback) {
    feedback.className = 'feedback-box';
    feedback.innerHTML = '';
  }
}

function checkItphAnswer() {
  const raw = document.getElementById('itph-answer')?.value.trim().replace(',','.');
  const value = Number(raw);
  showFeedback('itph-feedback',Number.isFinite(value) && Math.abs(value - 21) < .01,'Верно! 126 ÷ 6 = 21.','Раздели 126 проданных позиций на 6 отработанных часов.');
}

function checkFinalLinks() {
  const selects = [...document.querySelectorAll('#final-links select')];
  const allFilled = selects.every(select => select.value);
  const allCorrect = allFilled && selects.every(select => select.value === select.dataset.answer);
  const values = selects.map(select => select.value).filter(Boolean);
  const unique = new Set(values).size === values.length;
  let hint = 'Сопоставь, какой показатель изменился в каждой ситуации, и выбери связанный с ним вывод.';
  if (!allFilled) hint = 'Выбери вывод или действие для каждой ситуации.';
  else if (!unique) hint = 'Каждый вывод используется один раз. Проверь строки, где выбран одинаковый вариант.';
  showFeedback('final-feedback',allCorrect,'Верно! Для каждой ситуации ты выбрал связанный с ней показатель и подходящее действие.',hint);
}

const RESTAURANT_ZONE_DATA = {
  hall: { title:'Сотрудник в зале', text:'Создаёт комфорт, поддерживает чистоту и общается с Гостями.', metrics:['Гостевой опыт','Трафик'] },
  cash: { title:'Кассир', text:'Принимает заказ, помогает с выбором и предлагает дополнительные позиции.', metrics:['Выручка','Средний чек','Трафик'] },
  kitchen: { title:'Сотрудник кухни', text:'Готовит блюда по стандарту и правильно использует продукты.', metrics:['SOS','Food Cost','Гостевой опыт'] },
  assembly: { title:'Сотрудник сборки', text:'Быстро и правильно собирает заказ.', metrics:['SOS','Food Cost','Гостевой опыт'] },
  handoff: { title:'Сотрудник выдачи', text:'Проверяет заказ и вовремя передаёт его Гостю.', metrics:['SOS','Food Cost','Гостевой опыт'] },
  manager: { place:'Управляющий сменой', title:'Видит → направляет → проверяет', text:'Смотрит показатели, находит проблемную зону и говорит сотруднику, что нужно проверить или исправить сейчас.', metrics:['Все показатели смены'], note:'В этом курсе ты познакомишься с каждым из них.' }
};

function selectRestaurantZone(zone) {
  const panel = document.getElementById('zone-popover');
  const data = RESTAURANT_ZONE_DATA[zone];
  document.querySelectorAll('.employee-hotspot').forEach(item => {
    item.classList.toggle('active', item.dataset.zone === zone);
  });
  if (!panel || !data) return;
  const badges = data.metrics.map(metric => `<b>${metric}</b>`).join('');
  const place = data.place ? `<span>${data.place}</span>` : '';
  const note = data.note ? `<small class="zone-note">${data.note}</small>` : '';
  panel.innerHTML = `${place}<h3>${data.title}</h3><p>${data.text}</p><strong class="metric-caption">Показатели, на которые влияет</strong><div class="metric-badges">${badges}</div>${note}`;
}

function initRestaurantMap() {
  document.querySelectorAll('.employee-hotspot[data-zone]').forEach(hotspot => {
    hotspot.addEventListener('click', () => {
      selectRestaurantZone(hotspot.dataset.zone);
      completedTests.add(hotspot.id);
      hotspot.classList.remove('needs-viewing', 'active');
      hotspot.classList.add('viewed');
      refreshHomeContinue();
      saveProgress();
    });
  });
}

function completeCourse() {
  const missing = missingTests('summary');
  if (missing.length) {
    showCourseNotice('Сначала пройди финальный тест выше.', missing[0]);
    return;
  }
  try { localStorage.setItem(PROGRESS_KEY + '_completed','passed'); } catch (_) {}
  if (window.SCORM && typeof SCORM.complete === 'function') {
    SCORM.complete();
  } else if (window.SCORM && typeof SCORM.set === 'function') {
    SCORM.set('cmi.core.lesson_status','passed');
    if (typeof SCORM.commit === 'function') SCORM.commit();
  }
  const title = document.getElementById('completion-title');
  if (title) title.textContent = 'Курс завершён';
  const button = document.getElementById('complete-course-button');
  if (button) {
    button.disabled = true;
    button.textContent = 'Завершено';
  }
  document.getElementById('completion-panel')?.classList.add('show');
}

document.addEventListener('DOMContentLoaded',() => {
  const pageUrl = new URL(location.href);
  if (pageUrl.searchParams.get('reset') === '1') {
    try {
      ['restaurant_metrics_2_progress','restaurant_metrics_2_progress_v2','restaurant_metrics_2_progress_v3','restaurant_metrics_2_progress_v4','restaurant_metrics_2_progress_v5','restaurant_metrics_2_progress_v6','restaurant_metrics_2_progress_v7','restaurant_metrics_2_progress_v8','restaurant_metrics_2_progress_v9','restaurant_metrics_2_progress_v10','restaurant_metrics_2_progress_v11','restaurant_metrics_2_progress_v12'].forEach(key => {
        localStorage.removeItem(key);
        localStorage.removeItem(key + '_completed');
      });
    } catch (_) {}
    unlockedChapters = 1;
    completedTests = new Set();
    testAttempts = {};
    pageUrl.searchParams.delete('reset');
    history.replaceState({}, '', pageUrl);
  }
  const previewPage = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? new URLSearchParams(location.search).get('page')
    : null;
  if (previewPage && PAGES.includes(previewPage)) unlockedChapters = CHAPTER_ORDER.length;
  navigateTo(previewPage && PAGES.includes(previewPage) ? previewPage : 'home');
  const previewFocus = previewPage ? new URLSearchParams(location.search).get('focus') : null;
  if (previewFocus) setTimeout(() => document.getElementById(previewFocus)?.scrollIntoView({behavior:'instant', block:'start'}), 120);
  applyHomeLocks();
  restoreTestStates();
  initRequiredReveals();
  initSortable();
  initZoneSort('idea-pool','zone-left','zone-right');
  shuffleChildren(document.getElementById('idea-pool'));
  initRestaurantMap();
});
window.addEventListener('load',loadProgress);
