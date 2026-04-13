// MaJo Trends v2.1 - con referencias Pinterest
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

// Global fetch wrapper — redirect to /login on 401/402
async function apiFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  if (res.status === 401) { location.href = '/login'; throw new Error('Unauthorized'); }
  if (res.status === 402) {
    const d = await res.json().catch(() => ({}));
    location.href = d.redirect || '/pago';
    throw new Error('Payment required');
  }
  return res;
}

async function loadMe() {
  try {
    const res  = await apiFetch('/api/me');
    const user = await res.json();
    document.getElementById('user-name').textContent = user.nombre.split(' ')[0];
    const badge = document.getElementById('user-badge');
    if (user.estado === 'trial' && user.dias_restantes != null) {
      badge.textContent = `Trial · ${user.dias_restantes}d`;
      badge.className = 'user-badge trial';
    } else if (user.estado === 'activo') {
      badge.textContent = 'Pro';
      badge.className = 'user-badge activo';
    }
  } catch {}
}

async function loadAll() {
  const [t, c, p] = await Promise.all([
    apiFetch('/api/tendencias').then(r => r.json()),
    apiFetch('/api/cronologia').then(r => r.json()),
    apiFetch('/api/proyecciones').then(r => r.json()),
  ]);
  allTendencias = t;
  allCrono      = c;
  allProy       = p;
  renderDashboard('all');
  updateHero();
}

// ===== REFERENCIAS PINTEREST =====
const REFS = {
  // Colores
  'Tostado y Camel':      [{ l:'Camel coat outfit 2025',         q:'camel coat outfit 2025' },
                           { l:'Earth tones fashion mujer',      q:'earth tones fashion women outfit' },
                           { l:'Tostado camel look',             q:'tostado camel outfit moda mujer' },
                           { l:'Neutral tones wardrobe',         q:'neutral tones wardrobe capsule 2025' }],
  'Rosa Polvo':           [{ l:'Dusty pink outfit 2025',         q:'dusty pink outfit 2025' },
                           { l:'Mauve fashion style',            q:'mauve blush fashion style women' },
                           { l:'Rosa polvo moda mujer',          q:'rosa polvo outfit moda colombiana' },
                           { l:'Soft pink aesthetic look',       q:'soft pink aesthetic outfit 2025' }],
  'Rojo Cereza':          [{ l:'Cherry red outfit 2025',         q:'cherry red outfit 2025' },
                           { l:'Rojo cereza abrigo',             q:'rojo cereza abrigo moda mujer' },
                           { l:'Deep red coat fashion',          q:'deep red coat fashion style' },
                           { l:'Cherry red blazer look',         q:'cherry red blazer outfit women' }],
  'Verde Salvia':         [{ l:'Sage green outfit 2025',         q:'sage green outfit 2025' },
                           { l:'Verde salvia moda',              q:'verde salvia outfit moda mujer' },
                           { l:'Sage coat fashion',              q:'sage green coat winter fashion' },
                           { l:'Muted green style',              q:'muted green fashion aesthetic 2025' }],
  'Azul Marino Intenso':  [{ l:'Navy blue outfit 2025',          q:'navy blue outfit women 2025' },
                           { l:'Navy blazer look',               q:'navy blazer women outfit smart' },
                           { l:'Azul marino moda mujer',         q:'azul marino outfit moda femenina' },
                           { l:'Deep navy fashion',              q:'deep navy fashion style coat' }],
  'Lavanda Suave':        [{ l:'Lavender outfit 2025',           q:'lavender outfit women 2025' },
                           { l:'Soft purple fashion',            q:'soft purple lilac fashion style' },
                           { l:'Lavanda moda femenina',          q:'lavanda outfit tendencia moda' },
                           { l:'Lilac aesthetic look',           q:'lilac aesthetic pastel outfit 2025' }],
  'Naranja Burnt':        [{ l:'Burnt orange outfit',            q:'burnt orange outfit women' },
                           { l:'Rust orange fashion',            q:'rust orange fashion style fall' },
                           { l:'Naranja quemado moda',           q:'naranja quemado outfit tendencia' },
                           { l:'Terracotta style look',          q:'terracotta fashion outfit aesthetic' }],
  // Siluetas
  'Oversized Estructurado': [{ l:'Oversized structured coat 2025', q:'oversized structured coat outfit 2025' },
                              { l:'Architectural blazer look',      q:'architectural blazer oversized women' },
                              { l:'Oversized con hombros definidos',q:'oversized shoulder blazer outfit' },
                              { l:'Power dressing 2025',            q:'power dressing women 2025' }],
  'Mini + Botas Altas':   [{ l:'Mini skirt tall boots 2025',     q:'mini skirt tall boots outfit 2025' },
                           { l:'Micro mini botas largas',         q:'micro mini falda botas altas moda' },
                           { l:'Short dress knee high boots',     q:'short dress knee high boots fashion' },
                           { l:'Proporción mini + over-knee',     q:'mini skirt over knee boots style' }],
  'Línea A Midi':         [{ l:'A-line midi skirt 2025',         q:'a line midi skirt outfit 2025' },
                           { l:'Falda midi línea A look',         q:'falda midi linea a outfit moda' },
                           { l:'Midi length fashion style',       q:'midi length fashion style women' },
                           { l:'Flowy midi outfit',               q:'flowy midi skirt elegant outfit' }],
  'Capas y Superposición':[{ l:'Layering outfit 2025',           q:'layering outfit fashion 2025' },
                           { l:'Fashion layers style',            q:'fashion layers multiple pieces style' },
                           { l:'Superposición moda mujer',        q:'superposicion capas moda femenina' },
                           { l:'Outfit capas editorial',          q:'outfit capas editorial fashion look' }],
  'Cintura Marcada':      [{ l:'Cinched waist outfit 2025',      q:'cinched waist outfit women 2025' },
                           { l:'Belt over coat style',            q:'wide belt over coat fashion style' },
                           { l:'Cinturón sobre abrigo look',      q:'cinturon ancho sobre abrigo moda' },
                           { l:'Defined waist fashion',           q:'defined waist hourglass fashion 2025' }],
  'Bodycon Minimalista':  [{ l:'Minimalist bodycon 2025',        q:'minimalist bodycon dress outfit 2025' },
                           { l:'Sleek bodycon fashion',           q:'sleek bodycon knit dress style' },
                           { l:'Bodycon minimalista moda',        q:'bodycon minimalista elegante moda' },
                           { l:'Body-con knit editorial',         q:'bodycon knit editorial fashion look' }],
  'Crop Extremo':         [{ l:'Cropped jacket outfit',          q:'cropped jacket outfit women' },
                           { l:'Crop blazer estilo',              q:'crop blazer outfit estilo moda' },
                           { l:'Extreme crop fashion',            q:'extreme crop top fashion style' }],
  // Telas
  'Bouclé y Textura':     [{ l:'Boucle blazer outfit 2025',      q:'boucle blazer outfit women 2025' },
                           { l:'Bouclé coat chanel style',        q:'boucle coat chanel style fashion' },
                           { l:'Textura bouclé moda',             q:'textura boucle moda femenina look' },
                           { l:'Tweed boucle editorial',          q:'tweed boucle editorial fashion 2025' }],
  'Satén Pesado':         [{ l:'Heavy satin outfit 2025',        q:'heavy satin outfit women 2025' },
                           { l:'Matte satin fashion style',       q:'matte satin fashion elegant style' },
                           { l:'Satén pesado moda mujer',         q:'saten pesado vestido falda moda' },
                           { l:'Liquid satin look',               q:'liquid satin fashion outfit evening' }],
  'Lana Doble Faz':       [{ l:'Double face wool coat 2025',     q:'double face wool coat fashion 2025' },
                           { l:'Luxury wool coat style',          q:'luxury wool coat outfit winter' },
                           { l:'Lana doble faz abrigo',           q:'lana doble faz abrigo moda invierno' },
                           { l:'Investment coat fashion',         q:'investment coat fashion quality style' }],
  'Cuero Vegano':         [{ l:'Vegan leather outfit 2025',      q:'vegan leather outfit women 2025' },
                           { l:'Faux leather fashion',            q:'faux leather jacket skirt fashion' },
                           { l:'Cuero vegano moda',               q:'cuero vegano outfit tendencia moda' },
                           { l:'Vegan leather editorial',         q:'vegan leather editorial fashion look' }],
  'Organza y Velo':       [{ l:'Organza layer outfit 2025',      q:'organza layer outfit fashion 2025' },
                           { l:'Sheer overlay style',             q:'sheer overlay fashion transparent layer' },
                           { l:'Organza moda femenina',           q:'organza tela outfit moda femenina' },
                           { l:'Transparent layer editorial',     q:'transparent layer dress editorial 2025' }],
  'Denim Premium':        [{ l:'Premium denim outfit 2025',      q:'premium denim outfit tailored 2025' },
                           { l:'Denim tailored fashion',          q:'denim tailored fashion smart casual' },
                           { l:'Denim premium moda mujer',        q:'denim premium elegante outfit mujer' },
                           { l:'Elevated denim style',            q:'elevated denim style fashion women' }],
  'Terciopelo Aplastado': [{ l:'Crushed velvet outfit',          q:'crushed velvet outfit women fashion' },
                           { l:'Terciopelo aplastado moda',       q:'terciopelo aplastado outfit moda' },
                           { l:'Velvet fashion style',            q:'velvet fashion style elegant winter' }],
  // Estampados
  'Flores Abstractas Grandes': [{ l:'Abstract floral print 2025',  q:'abstract floral print outfit 2025' },
                                 { l:'Large floral pattern fashion', q:'large floral pattern fashion women' },
                                 { l:'Flores abstractas gráficas',   q:'flores abstractas graficas moda outfit' },
                                 { l:'Graphic floral editorial',     q:'graphic floral print editorial fashion' }],
  'Animal Print Neutro':  [{ l:'Neutral leopard outfit 2025',    q:'neutral leopard print outfit 2025' },
                           { l:'Beige animal print style',        q:'beige animal print fashion style women' },
                           { l:'Animal print neutro moda',        q:'animal print neutro camel moda mujer' },
                           { l:'Subtle leopard fashion',          q:'subtle leopard print fashion elegant' }],
  'Pied-de-Poule (Houndstooth)': [{ l:'Houndstooth outfit 2025', q:'houndstooth outfit women 2025' },
                                   { l:'Pied-de-poule coat style',  q:'pied de poule coat fashion style' },
                                   { l:'Pata de gallo moda',        q:'pata de gallo estampado moda mujer' },
                                   { l:'Classic check fashion',     q:'classic houndstooth check fashion 2025' }],
  'Lisos Texturizados':   [{ l:'Textured solid fabric 2025',     q:'textured solid fabric outfit 2025' },
                           { l:'Jacquard fashion style',          q:'jacquard fashion women elegant style' },
                           { l:'Tejido texturizado moda',         q:'tejido texturizado relieve moda mujer' },
                           { l:'Embossed fabric outfit',          q:'embossed textured fabric outfit fashion' }],
  'Rayas Verticales Bold':[{ l:'Bold stripes outfit 2025',       q:'bold vertical stripes outfit 2025' },
                           { l:'Stripe blazer fashion',           q:'stripe blazer women fashion style' },
                           { l:'Rayas verticales moda',           q:'rayas verticales outfit tendencia moda' },
                           { l:'Graphic stripes editorial',       q:'graphic stripes fashion editorial look' }],
  'Tie-Dye Refinado':     [{ l:'Refined tie dye 2025',           q:'refined tie dye fashion 2025' },
                           { l:'Artisan dye style',               q:'artisan hand dye fashion style' },
                           { l:'Tie dye suave moda',              q:'tie dye suave elegante moda outfit' }],
  'Tropical Vibrante':    [{ l:'Tropical print outfit',          q:'tropical print fashion outfit women' },
                           { l:'Vibrant floral resort',           q:'vibrant floral resort wear fashion' },
                           { l:'Tropical moda verano',            q:'tropical estampado moda verano outfit' }],
  // Estilos
  'Quiet Luxury':         [{ l:'Quiet luxury outfit 2025',       q:'quiet luxury outfit 2025' },
                           { l:'Old money aesthetic style',       q:'old money aesthetic outfit women' },
                           { l:'Stealth wealth fashion',          q:'stealth wealth fashion style minimal' },
                           { l:'Quiet luxury moda mujer',         q:'quiet luxury moda mujer latina 2025' }],
  'Coastal Grandmother':  [{ l:'Coastal grandmother 2025',       q:'coastal grandmother style outfit 2025' },
                           { l:'Linen coastal fashion',           q:'linen coastal fashion elegant resort' },
                           { l:'Resort elegante estilo',          q:'resort elegant outfit coastal style' },
                           { l:'Coastal abuela estética',         q:'coastal grandmother aesthetic fashion' }],
  'Corporate Chic':       [{ l:'Corporate chic outfit 2025',     q:'corporate chic outfit women 2025' },
                           { l:'Office fashion style',            q:'office fashion style women professional' },
                           { l:'Business chic moda mujer',        q:'business chic moda femenina ejecutiva' },
                           { l:'Power suit fashion',              q:'power suit women fashion 2025' }],
  'Dopamine Dressing':    [{ l:'Dopamine dressing 2025',         q:'dopamine dressing outfit 2025' },
                           { l:'Color therapy fashion',           q:'color therapy happy dressing fashion' },
                           { l:'Colores vibrantes moda',          q:'colores vibrantes outfit moda mujer' },
                           { l:'Joyful color outfit',             q:'joyful colorful outfit fashion style' }],
  'Ballet Core':          [{ l:'Balletcore outfit 2025',         q:'balletcore outfit fashion 2025' },
                           { l:'Ballet inspired fashion',         q:'ballet inspired fashion women style' },
                           { l:'Ballet core moda mujer',          q:'ballet core tendencia moda mujer' },
                           { l:'Romantic ballet aesthetic',       q:'romantic ballet aesthetic fashion outfit' }],
  'Tomboy Luxe':          [{ l:'Tomboy luxe outfit 2025',        q:'tomboy luxe outfit women 2025' },
                           { l:'Masculine feminine fashion',      q:'masculine feminine fashion style women' },
                           { l:'Tomboy chic moda',                q:'tomboy chic outfit moda femenina' },
                           { l:'Tailored menswear women',         q:'tailored menswear inspired women fashion' }],
  'Y2K Revival':          [{ l:'Y2K fashion 2025',               q:'y2k fashion outfit 2025' },
                           { l:'2000s revival style',             q:'2000s revival fashion aesthetic' },
                           { l:'Y2K estética moda',               q:'y2k estetica moda latina outfit' }],
};

function pinterestUrl(q) {
  return 'https://www.pinterest.com/search/pins/?q=' + encodeURIComponent(q);
}

// ─── Panel de referencias ────────────────────────────────────────────────────
(function initRefsPanel() {
  const overlay = document.createElement('div');
  overlay.id = 'refs-overlay';
  overlay.innerHTML = `
    <div id="refs-panel" role="dialog" aria-modal="true">
      <div class="refs-panel-head">
        <div>
          <div class="refs-panel-eyebrow">Referencias visuales</div>
          <div class="refs-panel-title" id="refs-title"></div>
        </div>
        <button class="refs-close" id="refs-close" aria-label="Cerrar">✕</button>
      </div>
      <p class="refs-hint">Búsquedas en Pinterest — se abren en nueva pestaña</p>
      <div class="refs-links" id="refs-links"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', e => { if (e.target === overlay) closeRefs(); });
  document.getElementById('refs-close').addEventListener('click', closeRefs);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeRefs(); });
})();

function openRefs(nombre) {
  const refs = REFS[nombre];
  if (!refs) return;
  document.getElementById('refs-title').textContent = nombre;
  document.getElementById('refs-links').innerHTML = refs.map(r => `
    <a class="refs-link" href="${pinterestUrl(r.q)}" target="_blank" rel="noopener noreferrer">
      <span class="refs-link-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
        </svg>
      </span>
      <span class="refs-link-label">${esc(r.l)}</span>
      <span class="refs-link-arrow">↗</span>
    </a>
  `).join('');

  const overlay = document.getElementById('refs-overlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('refs-panel').focus();
}

function closeRefs() {
  document.getElementById('refs-overlay').classList.remove('open');
  document.body.style.overflow = '';
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
      ${REFS[t.nombre] ? `<button class="refs-btn" onclick="openRefs('${t.nombre.replace(/'/g,"\\'")}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
        Ver referencias
      </button>` : ''}
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
    const res = await apiFetch('/api/consulta', {
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

// ===== LOGOUT =====
document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/auth/logout', { method: 'POST' });
  location.href = '/login';
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadMe();
  loadAll();
});
