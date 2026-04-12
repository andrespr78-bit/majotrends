// ===== NAVEGACIÓN =====
const views = { dashboard: null, cronologia: null, proyecciones: null, ia: null };
Object.keys(views).forEach(k => { views[k] = document.getElementById(`view-${k}`); });

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    Object.entries(views).forEach(([k, el]) => el.classList.toggle('active', k === btn.dataset.view));
    if (btn.dataset.view === 'cronologia') renderCrono(activeCronoYear);
    if (btn.dataset.view === 'proyecciones') renderProyecciones();
  });
});

// ===== DATOS =====
let allTendencias = [];
let allCrono      = [];
let allProy       = [];

async function loadAll() {
  [allTendencias, allCrono, allProy] = await Promise.all([
    fetch('/api/tendencias').then(r => r.json()),
    fetch('/api/cronologia').then(r => r.json()),
    fetch('/api/proyecciones').then(r => r.json()),
  ]);
  renderDashboard('all');
  updateHero();
}

// ===== DASHBOARD =====

const CAT_LABEL = {
  colores: 'Color', siluetas: 'Silueta', telas: 'Tela',
  estampados: 'Estampado', estilos: 'Estilo'
};
const ESTADO_LABEL = { fuerte: 'En furor', emergente: 'Emergente', decayendo: 'Decayendo' };

function updateHero() {
  // Temporada actual
  const month = new Date().getMonth();
  const year  = new Date().getFullYear();
  const season = (month >= 2 && month <= 7) ? 'SS' : 'FW';
  document.getElementById('hero-season').textContent = `${season}${year} · Ropa Exterior Femenina`;

  // Stats
  const fuertes    = allTendencias.filter(t => t.estado === 'fuerte').length;
  const emergentes = allTendencias.filter(t => t.estado === 'emergente').length;
  document.getElementById('hero-stats').innerHTML = `
    <div class="hero-stat">
      <div class="hero-stat-num">${fuertes}</div>
      <div class="hero-stat-label">En furor</div>
    </div>
    <div class="hero-stat">
      <div class="hero-stat-num">${emergentes}</div>
      <div class="hero-stat-label">Emergentes</div>
    </div>
    <div class="hero-stat">
      <div class="hero-stat-num">${allTendencias.length}</div>
      <div class="hero-stat-label">Total rastreadas</div>
    </div>
  `;
}

function renderDashboard(cat) {
  const data = cat === 'all' ? allTendencias : allTendencias.filter(t => t.categoria === cat);
  const grid = document.getElementById('trends-grid');
  grid.innerHTML = data.map(t => `
    <div class="trend-card ${t.estado}">
      <div class="trend-card-top">
        <span class="trend-nombre">${esc(t.nombre)}</span>
        <span class="trend-cat-chip">${CAT_LABEL[t.categoria] || t.categoria}</span>
      </div>
      <p class="trend-desc">${esc(t.descripcion)}</p>
      <div class="trend-footer">
        <div class="fuerza-bar-wrap">
          <div class="fuerza-label">Fuerza ${t.fuerza}/10</div>
          <div class="fuerza-bar">
            <div class="fuerza-fill" style="width:${t.fuerza * 10}%"></div>
          </div>
        </div>
        <span class="estado-badge ${t.estado}">${ESTADO_LABEL[t.estado] || t.estado}</span>
      </div>
    </div>
  `).join('');
}

document.querySelectorAll('.cat-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderDashboard(btn.dataset.cat);
  });
});

// ===== CRONOLOGÍA =====
let activeCronoYear = 'all';

function renderCrono(yearFilter) {
  activeCronoYear = yearFilter;
  const data = yearFilter === 'all' ? allCrono : allCrono.filter(c => String(c.anio) === String(yearFilter));

  // Group by year → season
  const byYear = {};
  data.forEach(c => {
    if (!byYear[c.anio]) byYear[c.anio] = {};
    if (!byYear[c.anio][c.temporada]) byYear[c.anio][c.temporada] = [];
    byYear[c.anio][c.temporada].push(c);
  });

  const SEASON_LABEL = { SS: 'Primavera / Verano', FW: 'Otoño / Invierno' };
  const container = document.getElementById('crono-container');
  container.innerHTML = Object.keys(byYear).sort((a,b) => b-a).map(year => `
    <div class="crono-year-block">
      <div class="crono-year-title">${year}</div>
      ${Object.keys(byYear[year]).sort().map(season => `
        <div class="crono-season-block">
          <div class="crono-season-label">${SEASON_LABEL[season] || season}</div>
          <div class="crono-items">
            ${byYear[year][season].map(c => `
              <div class="crono-item">
                <div class="crono-dot ${c.estado}"></div>
                <div class="crono-item-content">
                  <div class="crono-item-top">
                    <span class="crono-tendencia">${esc(c.tendencia)}</span>
                    <span class="crono-cat-chip">${CAT_LABEL[c.categoria] || c.categoria}</span>
                    <span class="crono-estado-chip ${c.estado}">${c.estado}</span>
                  </div>
                  <p class="crono-desc">${esc(c.descripcion)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

document.querySelectorAll('.year-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCrono(btn.dataset.year);
  });
});

// ===== PROYECCIONES =====
const ESCENARIO_META = {
  conservador:      { title: 'Conservador',     sub: 'Lo que definitivamente vendrá' },
  probable:         { title: 'Probable',         sub: 'La apuesta más sólida' },
  tendencia_fuerte: { title: 'Tendencia Fuerte', sub: 'Alto impacto, más riesgo' },
};

function renderProyecciones() {
  const anio = document.getElementById('proy-anio').value;
  const data = allProy.filter(p => String(p.anio) === String(anio));

  const byEscenario = {};
  data.forEach(p => {
    if (!byEscenario[p.escenario]) byEscenario[p.escenario] = [];
    byEscenario[p.escenario].push(p);
  });

  const ORDER = ['conservador', 'probable', 'tendencia_fuerte'];
  document.getElementById('proy-grid').innerHTML = ORDER.map(esc_key => {
    const meta  = ESCENARIO_META[esc_key];
    const items = byEscenario[esc_key] || [];
    return `
      <div class="proy-col">
        <div class="proy-col-header">
          <div class="proy-col-title">${meta.title}</div>
          <div class="proy-col-sub">${meta.sub}</div>
        </div>
        <div class="proy-items">
          ${items.map(p => `
            <div class="proy-item">
              <div class="proy-item-cat">${CAT_LABEL[p.categoria] || p.categoria}</div>
              <div class="proy-item-title">${esc(p.proyeccion)}</div>
              <div class="proy-item-desc">${esc(p.descripcion)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('proy-anio').addEventListener('change', renderProyecciones);

// ===== MAJO IA =====
const iaMessages = document.getElementById('ia-messages');
const iaInput    = document.getElementById('ia-input');
const iaSend     = document.getElementById('ia-send');

// Auto-resize textarea
iaInput.addEventListener('input', () => {
  iaInput.style.height = 'auto';
  iaInput.style.height = Math.min(iaInput.scrollHeight, 120) + 'px';
});

iaInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendIA(); }
});

iaSend.addEventListener('click', sendIA);

document.querySelectorAll('.pill-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    iaInput.value = btn.dataset.q;
    iaInput.dispatchEvent(new Event('input'));
    iaInput.focus();
  });
});

function addMsg(role, text) {
  const initials = role === 'user' ? 'MJ' : '✦';
  const div = document.createElement('div');
  div.className = `msg msg-${role === 'user' ? 'user' : 'ai'}`;
  div.innerHTML = `
    <div class="msg-avatar">${initials}</div>
    <div class="msg-bubble"></div>
  `;
  div.querySelector('.msg-bubble').textContent = text;
  iaMessages.appendChild(div);
  iaMessages.scrollTop = iaMessages.scrollHeight;
  return div.querySelector('.msg-bubble');
}

async function sendIA() {
  const pregunta = iaInput.value.trim();
  if (!pregunta) return;

  iaInput.value = '';
  iaInput.style.height = 'auto';
  iaSend.disabled = true;

  addMsg('user', pregunta);

  // AI bubble with cursor
  const bubble = addMsg('ai', '');
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  bubble.appendChild(cursor);
  iaMessages.scrollTop = iaMessages.scrollHeight;

  try {
    const res = await fetch('/api/consulta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pregunta }),
    });

    if (!res.ok) {
      const err = await res.json();
      cursor.remove();
      bubble.textContent = `⚠ ${err.error}`;
      return;
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') { cursor.remove(); break; }
        try {
          const p = JSON.parse(raw);
          if (p.error) throw new Error(p.error);
          if (p.text) {
            cursor.remove();
            bubble.appendChild(document.createTextNode(p.text));
            bubble.appendChild(cursor);
            iaMessages.scrollTop = iaMessages.scrollHeight;
          }
        } catch {}
      }
    }
    cursor.remove();
  } catch (err) {
    cursor.remove();
    bubble.textContent = `⚠ ${err.message}`;
  } finally {
    iaSend.disabled = false;
    iaInput.focus();
  }
}

// ===== UTIL =====
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  t.classList.remove('fade');
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.classList.add('fade'); setTimeout(() => t.hidden=true, 300); }, 2500);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', loadAll);
