/**
 * dashboard.js
 * Toda la lógica del dashboard está conectada al store reactivo.
 * El propósito de este archivo es demostrar cómo usar reactive-store-js
 * en una aplicación real.
 */

// ─────────────────────────────────────────────
// 1. ESTADO INICIAL
// ─────────────────────────────────────────────

const store = createStore({
  members: {
    total: 1312,
    active: 847,
  },
  events: {
    upcoming: 3,
  },
  languages: [
    { name: 'JavaScript', pct: 78, color: '#f7df1e' },
    { name: 'Python',     pct: 54, color: '#3572A5' },
    { name: 'TypeScript', pct: 41, color: '#3178c6' },
    { name: 'CSS',        pct: 38, color: '#a78bfa' },
    { name: 'SQL',        pct: 29, color: '#34d399' },
  ],
  filters: {
    level: 'all',
    country: 'all',
  },
  activity: [],
});

// ─────────────────────────────────────────────
// 2. COMPUTED PROPERTIES
// ─────────────────────────────────────────────

const retentionRate = store.compute('retentionRate', (s) => {
  const rate = (s.members.active / s.members.total) * 100;
  return `${rate.toFixed(1)}%`;
});

// ─────────────────────────────────────────────
// 3. REFERENCIAS AL DOM
// ─────────────────────────────────────────────

const els = {
  kpiMembers:      document.getElementById('kpi-members'),
  kpiMembersDelta: document.getElementById('kpi-members-delta'),
  kpiActive:       document.getElementById('kpi-active'),
  kpiActiveDelta:  document.getElementById('kpi-active-delta'),
  kpiEvents:       document.getElementById('kpi-events'),
  kpiRetention:    document.getElementById('kpi-retention'),
  langChart:       document.getElementById('lang-chart'),
  activityFeed:    document.getElementById('activity-feed'),
  filterLevel:     document.getElementById('filter-level'),
  filterCountry:   document.getElementById('filter-country'),
  filterResult:    document.getElementById('filter-result-text'),
  btnUndo:         document.getElementById('btn-undo'),
  btnRedo:         document.getElementById('btn-redo'),
  btnSimulate:     document.getElementById('btn-simulate'),
  btnDevtools:     document.getElementById('btn-devtools'),
  devtoolsPanel:   document.getElementById('devtools-panel'),
  devtoolsOutput:  document.getElementById('devtools-output'),
  devtoolsClose:   document.getElementById('devtools-close'),
  toast:           document.getElementById('toast'),
};

// ─────────────────────────────────────────────
// 4. RENDER FUNCTIONS
// ─────────────────────────────────────────────

function renderKpiMembers(newVal, oldVal) {
  els.kpiMembers.textContent = newVal.toLocaleString('es-ES');
  if (oldVal !== undefined) {
    const diff = newVal - oldVal;
    renderDelta(els.kpiMembersDelta, diff);
    flashCard('[data-reactive="members.total"]');
  }
}

function renderKpiActive(newVal, oldVal) {
  els.kpiActive.textContent = newVal.toLocaleString('es-ES');
  if (oldVal !== undefined) {
    const diff = newVal - oldVal;
    renderDelta(els.kpiActiveDelta, diff);
    flashCard('[data-reactive="members.active"]');
  }
}

function renderKpiEvents(newVal) {
  els.kpiEvents.textContent = newVal;
}

function renderRetention() {
  els.kpiRetention.textContent = retentionRate();
}

function renderDelta(el, diff) {
  if (diff === 0) { el.textContent = ''; return; }
  el.textContent = diff > 0 ? `+${diff}` : `${diff}`;
  el.className = 'kpi-delta ' + (diff > 0 ? 'positive' : 'negative');
}

function flashCard(selector) {
  const card = document.querySelector(selector);
  if (!card) return;
  card.classList.add('updated');
  setTimeout(() => card.classList.remove('updated'), 800);
}

function renderLangChart(languages) {
  els.langChart.innerHTML = languages.map(lang => `
    <div class="lang-row">
      <div class="lang-header">
        <span class="lang-name">${lang.name}</span>
        <span class="lang-pct">${lang.pct}%</span>
      </div>
      <div class="lang-bar-track">
        <div class="lang-bar-fill"
             style="width: ${lang.pct}%; background: ${lang.color}">
        </div>
      </div>
    </div>
  `).join('');
}

function renderActivity(activities) {
  const MAX_ITEMS = 6;
  const recent = activities.slice(-MAX_ITEMS).reverse();
  els.activityFeed.innerHTML = recent.map(item => `
    <li class="activity-item">
      <div class="activity-avatar" style="background: ${item.avatarBg}">${item.emoji}</div>
      <div class="activity-content">
        <p class="activity-text">${item.text}</p>
        <time class="activity-time">${item.time}</time>
      </div>
    </li>
  `).join('');
}

function renderFilterResult(filters) {
  const level   = filters.level   !== 'all' ? filters.level   : null;
  const country = filters.country !== 'all' ? filters.country : null;

  const countryNames = { es: 'España', mx: 'México', ar: 'Argentina', co: 'Colombia' };

  if (!level && !country) {
    els.filterResult.textContent = 'todas las miembras';
    return;
  }

  const parts = [];
  if (level)   parts.push(`nivel ${level}`);
  if (country) parts.push(countryNames[country]);
  els.filterResult.textContent = parts.join(', ');
}

function updateDevtools() {
  if (!els.devtoolsPanel.classList.contains('open')) return;
  els.devtoolsOutput.textContent = JSON.stringify(store.devtools(), null, 2);
}

// ─────────────────────────────────────────────
// 5. SUSCRIPCIONES AL STORE
//    Aquí es donde reactive-store-js brilla:
//    cada trozo del UI reacciona solo a lo que necesita.
// ─────────────────────────────────────────────

store.subscribe('members.total',  (newVal, oldVal) => {
  renderKpiMembers(newVal, oldVal);
  renderRetention();
  updateDevtools();
});

store.subscribe('members.active', (newVal, oldVal) => {
  renderKpiActive(newVal, oldVal);
  renderRetention();
  updateDevtools();
});

store.subscribe('events.upcoming', (newVal) => {
  renderKpiEvents(newVal);
  updateDevtools();
});

store.subscribe('languages', (newVal) => {
  renderLangChart(newVal);
  updateDevtools();
});

store.subscribe('activity', (newVal) => {
  renderActivity(newVal);
  updateDevtools();
});

store.subscribe('filters', (newVal) => {
  renderFilterResult(newVal);
  updateDevtools();
});

// El wildcard notifica cualquier cambio — perfecto para las DevTools
store.subscribe('*', () => updateDevtools());

// ─────────────────────────────────────────────
// 6. RENDER INICIAL
// ─────────────────────────────────────────────

(function init() {
  const s = store.snapshot();
  renderKpiMembers(s.members.total);
  renderKpiActive(s.members.active);
  renderKpiEvents(s.events.upcoming);
  renderRetention();
  renderLangChart(s.languages);
  renderFilterResult(s.filters);
  renderActivity(s.activity);
})();

// ─────────────────────────────────────────────
// 7. SIMULACIÓN DE ACTIVIDAD
// ─────────────────────────────────────────────

const ACTIVITY_TEMPLATES = [
  { emoji: '👩‍💻', avatarBg: '#2a1a4a', text: '<strong>@paula_dev</strong> hizo push a su proyecto del post #04' },
  { emoji: '🎉', avatarBg: '#1a3a2a', text: '<strong>@marta_js</strong> completó el reto de closures' },
  { emoji: '📝', avatarBg: '#1a2a3a', text: '<strong>@ana_codes</strong> publicó una pregunta en el canal #javascript' },
  { emoji: '⭐', avatarBg: '#3a2a1a', text: '<strong>@lucia_frontend</strong> dejó una estrella en reactive-store-js' },
  { emoji: '🚀', avatarBg: '#2a3a1a', text: '<strong>@sofia_dev</strong> se unió a la comunidad' },
  { emoji: '💬', avatarBg: '#1a3a3a', text: '<strong>@carmen_tech</strong> respondió en el hilo del Event Loop' },
  { emoji: '🐛', avatarBg: '#3a1a1a', text: '<strong>@eva_eng</strong> abrió una issue en lru-cache-js' },
  { emoji: '✅', avatarBg: '#1a2a4a', text: '<strong>@nuria_dev</strong> cerró un PR en api-resilience-wrapper' },
];

function getTime() {
  return new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function simulateActivity() {
  const template = ACTIVITY_TEMPLATES[Math.floor(Math.random() * ACTIVITY_TEMPLATES.length)];
  const newItem = { ...template, time: `Ahora · ${getTime()}` };

  // Mutamos el array del store → el subscriber de 'activity' se dispara automáticamente
  const current = store.snapshot().activity;
  store.state.activity = [...current, newItem];

  // Con cierta probabilidad, actualizamos también las métricas
  if (Math.random() > 0.5) {
    store.state.members.total  = store.state.members.total  + Math.floor(Math.random() * 3);
    store.state.members.active = store.state.members.active + Math.floor(Math.random() * 5) - 1;
  }

  if (Math.random() > 0.8) {
    store.state.events.upcoming = store.state.events.upcoming + (Math.random() > 0.5 ? 1 : -1);
  }
}

// ─────────────────────────────────────────────
// 8. EVENTOS DE UI
// ─────────────────────────────────────────────

els.btnSimulate.addEventListener('click', simulateActivity);

els.btnUndo.addEventListener('click', () => {
  const ok = store.undo();
  showToast(ok ? '↩ Estado anterior restaurado' : 'No hay más cambios que deshacer');
  // Re-render completo tras undo/redo
  const s = store.snapshot();
  renderKpiMembers(s.members.total);
  renderKpiActive(s.members.active);
  renderKpiEvents(s.events.upcoming);
  renderRetention();
  renderLangChart(s.languages);
  renderActivity(s.activity);
  renderFilterResult(s.filters);
  updateDevtools();
});

els.btnRedo.addEventListener('click', () => {
  const ok = store.redo();
  showToast(ok ? '↪ Cambio rehecho' : 'No hay cambios para rehacer');
  const s = store.snapshot();
  renderKpiMembers(s.members.total);
  renderKpiActive(s.members.active);
  renderKpiEvents(s.events.upcoming);
  renderRetention();
  renderLangChart(s.languages);
  renderActivity(s.activity);
  renderFilterResult(s.filters);
  updateDevtools();
});

els.filterLevel.addEventListener('change', (e) => {
  store.state.filters.level = e.target.value;
});

els.filterCountry.addEventListener('change', (e) => {
  store.state.filters.country = e.target.value;
});

els.btnDevtools.addEventListener('click', () => {
  els.devtoolsPanel.classList.toggle('open');
  updateDevtools();
});

els.devtoolsClose.addEventListener('click', () => {
  els.devtoolsPanel.classList.remove('open');
});

// ─────────────────────────────────────────────
// 9. UTILIDADES
// ─────────────────────────────────────────────

let toastTimer = null;

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2500);
}
