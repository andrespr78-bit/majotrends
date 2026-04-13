const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const db = new DatabaseSync('majotrends.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS tendencias (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria   TEXT NOT NULL,
    nombre      TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    fuerza      INTEGER NOT NULL DEFAULT 5,
    estado      TEXT NOT NULL DEFAULT 'fuerte'
  );

  CREATE TABLE IF NOT EXISTS cronologia (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    anio        INTEGER NOT NULL,
    temporada   TEXT NOT NULL,
    categoria   TEXT NOT NULL,
    tendencia   TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    estado      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS proyecciones (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    anio        INTEGER NOT NULL,
    escenario   TEXT NOT NULL,
    categoria   TEXT NOT NULL,
    proyeccion  TEXT NOT NULL,
    descripcion TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre                TEXT NOT NULL,
    email                 TEXT UNIQUE NOT NULL,
    password_hash         TEXT NOT NULL,
    estado                TEXT NOT NULL DEFAULT 'pendiente',
    mensaje_solicitud     TEXT,
    fecha_solicitud       TEXT NOT NULL,
    fecha_aprobacion      TEXT,
    fecha_vencimiento_trial TEXT,
    stripe_customer_id    TEXT,
    stripe_subscription_id TEXT,
    created_at            TEXT DEFAULT (datetime('now'))
  );
`);

// ===== SEED TENDENCIAS =====
const n = db.prepare('SELECT COUNT(*) as c FROM tendencias').get();
if (n.c === 0) {
  const iT = db.prepare('INSERT INTO tendencias (categoria,nombre,descripcion,fuerza,estado) VALUES (?,?,?,?,?)');
  [
    ['colores','Tostado y Camel','Tonos tierra cálidos dominan la paleta SS25. Desde arena hasta camel oscuro, la familia terrosa lidera en outerwear.',9,'fuerte'],
    ['colores','Rosa Polvo','El rosa nude y polvoso se consolida como neutro moderno. Combinado con blanco roto y crema es la firma del lujo discreto.',8,'fuerte'],
    ['colores','Rojo Cereza','Bold y seguro. El rojo cereza profundo emergió en FW24 y se mantiene fuerte en abrigos y blazers oversized.',8,'fuerte'],
    ['colores','Verde Salvia','El verde apagado y herbal reemplaza el verde bosque. Muy fuerte en prendas de abrigo y capas.',7,'fuerte'],
    ['colores','Azul Marino Intenso','Clásico que resurge como reacción al maximalismo. Lidera en blazers estructurados y gabardinas.',7,'emergente'],
    ['colores','Lavanda Suave','Pastel sofisticado que sube desde accesorios hacia outerwear. Aún emergente pero con momentum.',5,'emergente'],
    ['colores','Naranja Burnt','Tuvo su momento en 2023. Ahora en descenso, reemplazado por tonos más neutros.',3,'decayendo'],
    ['siluetas','Oversized Estructurado','La silueta dominante. Hombros definidos, volumen en el cuerpo pero largo controlado. No flojo, sino arquitectónico.',10,'fuerte'],
    ['siluetas','Mini + Botas Altas','Contraste de proporciones: prendas cortas con botas largas. Genera el efecto de piernas infinitas muy buscado.',8,'fuerte'],
    ['siluetas','Línea A Midi','Falda o vestido en A hasta la pantorrilla. Elegante, versátil, favorecedor para todas las tallas.',8,'fuerte'],
    ['siluetas','Capas y Superposición','Layering como estilo, no como necesidad. Dos o tres piezas de diferente largo crean profundidad visual.',7,'fuerte'],
    ['siluetas','Cintura Marcada','Regreso del cuerpo definido. Cinturón ancho sobre abrigo o blazer. Reacción al oversized sin estructura.',6,'emergente'],
    ['siluetas','Bodycon Minimalista','Vestido ajustado en telas nobles (punto grueso, crepé). Diferente al bodycon de los 2000s por la calidad de tela.',5,'emergente'],
    ['siluetas','Crop Extremo','El crop radical pierde fuerza en outerwear. Se mantiene en casual pero cede terreno.',3,'decayendo'],
    ['telas','Bouclé y Textura','La tela de Chanel democratizada. Bouclé en todos los precios y colores. Ideal para blazers y abrigos cortos.',9,'fuerte'],
    ['telas','Satén Pesado','No el satén brillante sino el satén opaco y de caída. Para blusas, faldas y vestidos de ocasión.',8,'fuerte'],
    ['telas','Lana Doble Faz','Premium y arquitectónica. Para abrigos de inversión. Tiene reversible que duplica el uso.',7,'fuerte'],
    ['telas','Cuero Vegano','Leatherette de alta calidad reemplaza al cuero animal en el imaginario de la clienta joven.',7,'fuerte'],
    ['telas','Organza y Velo','Transparencia controlada. Usada en capas sobre prendas sólidas. Femenino y moderno.',6,'emergente'],
    ['telas','Denim Premium','El denim sale del casual y entra al smart casual en chaquetas y faldas de corte tailored.',5,'emergente'],
    ['telas','Terciopelo Aplastado','Muy fuerte en 2023 FW, ahora saturado. Cede ante texturas más sutiles.',3,'decayendo'],
    ['estampados','Flores Abstractas Grandes','No el floral romántico sino flores gráficas, grandes, en colorway inesperado. Arte más que naturaleza.',8,'fuerte'],
    ['estampados','Animal Print Neutro','Leopardo en beige/camel/blanco. No en colores vibrantes. El animal print se volvió neutro sofisticado.',8,'fuerte'],
    ['estampados','Pied-de-Poule (Houndstooth)','El clásico chequeado vuelve con fuerza en abrigos y blazers. Generacional, intemporal.',7,'fuerte'],
    ['estampados','Lisos Texturizados','El "estampado" más vendido: liso pero con textura visible (jacquard, relieve, tejido).',7,'fuerte'],
    ['estampados','Rayas Verticales Bold','Rayas anchas en dos colores contrastantes. Efecto vertical estilizador. Fuerte en blazers.',6,'emergente'],
    ['estampados','Tie-Dye Refinado','El tie-dye artesanal y de paleta suave sube lento.',4,'emergente'],
    ['estampados','Tropical Vibrante','Palmeras, flores tropicales en colores saturados. Saturado y en descenso rápido.',2,'decayendo'],
    ['estilos','Quiet Luxury','Menos logos, más calidad. Prendas que gritan sofisticación sin etiqueta visible.',10,'fuerte'],
    ['estilos','Coastal Grandmother','Ropa de resort relajada pero elegante. Linos, rayas, neutros.',8,'fuerte'],
    ['estilos','Corporate Chic','La oficina vuelve a ser aspiracional. Blazers, pantalones sastre, gabardinas.',8,'fuerte'],
    ['estilos','Dopamine Dressing','Color como terapia. Prendas vibrantes para el bienestar emocional.',6,'fuerte'],
    ['estilos','Ballet Core','Inspiración en la bailarina: faldas midi, wrap tops, colores pastel, lazos.',7,'emergente'],
    ['estilos','Tomboy Luxe','Prendas masculinas en telas lujosas y cortes femeninos.',6,'emergente'],
    ['estilos','Y2K Revival','El regreso de los 2000. Lleva tiempo pero pierde fuerza en outerwear.',3,'decayendo'],
  ].forEach(d => iT.run(...d));

  const iC = db.prepare('INSERT INTO cronologia (anio,temporada,categoria,tendencia,descripcion,estado) VALUES (?,?,?,?,?,?)');
  [
    [2023,'SS','colores','Verde Botella','Dominó la primavera 2023. Desde esmeralda hasta oliva, toda la familia verde fue la reina de la temporada.','furor'],
    [2023,'SS','siluetas','Oversized Ligero','Camisas y blazers XL pero en telas livianas. El volumen llega al verano sin sofocación.','furor'],
    [2023,'SS','estilos','Coastal Grandmother','La estética de la abuela costera explotó en TikTok y se tradujo en ventas reales de lino y rayas.','furor'],
    [2023,'SS','telas','Crochet y Macramé','Prendas artesanales para el verano. Muy fotografiadas, menos vendidas.','decayendo'],
    [2023,'FW','colores','Naranja Burnt','El tono más fotografiado del otoño 2023. Aparecía en todo: abrigos, botas, bolsos.','furor'],
    [2023,'FW','siluetas','Capas Excesivas','Máximo layering: 4-5 prendas visibles simultáneamente. Arte de street style.','furor'],
    [2023,'FW','telas','Terciopelo Aplastado','El terciopelo oscuro y aplastado fue el tejido del invierno 2023.','furor'],
    [2023,'FW','estilos','Quiet Luxury','Emerge con fuerza en FW23 impulsado por series como Succession.','emergiendo'],
    [2024,'SS','colores','Rosa Polvo + Tostado','La dupla del año: rosa polvoso combinado con camel. Definió el SS24 de principio a fin.','furor'],
    [2024,'SS','siluetas','Mini + Botas Altas','La combinación más fotografiada del verano 2024.','furor'],
    [2024,'SS','estampados','Flores Abstractas','No el floral clásico: flores grandes, gráficas, en paletas inesperadas.','furor'],
    [2024,'SS','estilos','Quiet Luxury','Se consolida como el estilo aspiracional dominante.','furor'],
    [2024,'FW','colores','Rojo Cereza','Entró fuerte en FW24: profundo, maduro, opuesto al rojo vibrante de temporadas pasadas.','furor'],
    [2024,'FW','siluetas','Oversized Estructurado','El oversized madura: deja de ser flojo y se vuelve arquitectónico.','furor'],
    [2024,'FW','telas','Bouclé y Tweed','La textura bouclé se democratiza y aparece en todas las categorías de precio.','furor'],
    [2024,'FW','estilos','Corporate Chic','El regreso del blazer como pieza central. La oficina es aspiracional de nuevo.','furor'],
    [2024,'FW','estilos','Ballet Core','Las bailarinas se escaparon del estudio: faldas midi, lazos, rosa, satén en el día a día.','emergiendo'],
    [2025,'SS','colores','Verde Salvia + Azul Marino','Los colores frescos de SS25 reemplazan los pasteles obvios.','furor'],
    [2025,'SS','siluetas','Línea A Midi','La falda midi en A lidera las ventas de SS25. Favorece a todas las siluetas corporales.','furor'],
    [2025,'SS','telas','Organza y Transparencias','Las capas livianas sobre prendas sólidas definen el SS25 más editorial.','furor'],
    [2025,'SS','estilos','Ballet Core','Se consolida: ya no es tendencia emergente sino estilo establecido.','furor'],
    [2025,'FW','colores','Negro Total + Rojo Cereza','Bicolor potente para FW25.','furor'],
    [2025,'FW','siluetas','Cintura Marcada','Reacción al oversized puro: se busca definir la cintura con cinturones y cortes.','emergiendo'],
    [2025,'FW','telas','Lana Premium + Cuero Vegano','Las dos pieles del invierno 2025.','furor'],
    [2025,'FW','estilos','Tomboy Luxe','Blazers masculinos en telas lujosas, pantalón de pinza ancho.','emergiendo'],
  ].forEach(d => iC.run(...d));

  const iP = db.prepare('INSERT INTO proyecciones (anio,escenario,categoria,proyeccion,descripcion) VALUES (?,?,?,?,?)');
  [
    [2026,'conservador','colores','Neutros con un acento','Paleta dominante de beige, crema y gris perla con un color de acento por temporada.'],
    [2026,'conservador','siluetas','Oversized controlado + Línea A','Las dos siluetas ya establecidas se mantienen sin grandes cambios.'],
    [2026,'conservador','telas','Bouclé y Lana Doble Faz','Las telas con trayectoria se refuerzan. El cliente invierte en calidad conocida.'],
    [2026,'conservador','estampados','Lisos y Pied-de-Poule','Predominan los lisos texturizados con el clásico chequeado como estampado estrella.'],
    [2026,'probable','colores','Rojo + Chocolate + Crema','Triada terrosa-cálida. El chocolate emerge como nuevo neutro.'],
    [2026,'probable','siluetas','Cintura Marcada + Volumen Estratégico','La silueta de reloj de arena moderna: volumen en hombros y caderas, cintura definida.'],
    [2026,'probable','telas','Cuero Vegano + Denim Premium','Materiales con presencia que van más allá de la moda hacia el lifestyle.'],
    [2026,'probable','estampados','Animal Print Sofisticado + Flores 3D','El animal print se reinventa con aplicaciones 3D. Las flores salen del plano.'],
    [2026,'tendencia_fuerte','colores','Morado Uva + Plata Mercurio','Combinación inesperada pero con precedente en las pasarelas de vanguardia.'],
    [2026,'tendencia_fuerte','siluetas','Asimetría Calculada','Dobladillos irregulares, un hombro descubierto, cierres laterales.'],
    [2026,'tendencia_fuerte','telas','Materiales Técnicos Couture','Telas de alto rendimiento en cortes y acabados de lujo.'],
    [2026,'tendencia_fuerte','estampados','Fotografía Digital + Pixel Art','La imagen digital se transfiere al tejido.'],
    [2027,'conservador','colores','Regreso al Blanco Óptico','El blanco puro como declaración de intenciones. Minimalismo extremo.'],
    [2027,'conservador','siluetas','Tailoring Clásico','El traje sastre tradicional resurge sin modificaciones.'],
    [2027,'conservador','telas','Seda Natural y Lino Premium','Materiales nobles y naturales como respuesta al fast fashion.'],
    [2027,'conservador','estampados','Sin Estampado','El liso absoluto domina. El color de la prenda es suficiente declaración.'],
    [2027,'probable','colores','Paleta Bosque: Verde Musgo + Marrón Turba','Tonos muy orgánicos. Conexión con naturaleza en su expresión más sofisticada.'],
    [2027,'probable','siluetas','Maxi Volumen + Silueta Cápsula','Prendas que son esculturas. La ropa como objeto de arte con funcionalidad.'],
    [2027,'probable','telas','Regenerativas y Trazables','La tela cuenta su historia: origen, proceso, impacto.'],
    [2027,'probable','estampados','Tejido Artesanal Visible','El tejido manual como estampado político y estético.'],
    [2027,'tendencia_fuerte','colores','Metálicos Mate: Oro Viejo + Cobre','Metales sin brillo. La sofisticación del metal opaco.'],
    [2027,'tendencia_fuerte','siluetas','Híbrida: Prenda Multifunción','Una pieza que es tres: chaqueta + chaleco + capucha.'],
    [2027,'tendencia_fuerte','telas','Biomateriales: Micelio y Algas','Las telas del futuro llegan al mainstream.'],
    [2027,'tendencia_fuerte','estampados','Generativo por IA','Estampados creados por algoritmos, únicos por prenda.'],
  ].forEach(d => iP.run(...d));
}

// ===== SEED OWNER =====
const ownerExists = db.prepare(`SELECT id FROM usuarios WHERE email = 'majo@majocolombia.com'`).get();
if (!ownerExists) {
  const hash = bcrypt.hashSync('majo2026!', 12);
  db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, estado, fecha_solicitud, fecha_aprobacion)
    VALUES (?, ?, ?, 'activo', ?, ?)
  `).run('María José Obando', 'majo@majocolombia.com', hash,
    new Date().toISOString(), new Date().toISOString());
}

const andresExists = db.prepare(`SELECT id FROM usuarios WHERE email = 'andres@majocolombia.com'`).get();
if (!andresExists) {
  const hash = bcrypt.hashSync('Majo2026!', 12);
  db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, estado, fecha_solicitud, fecha_aprobacion)
    VALUES (?, ?, ?, 'activo', ?, ?)
  `).run('Andrés Pardo', 'andres@majocolombia.com', hash,
    new Date().toISOString(), new Date().toISOString());
}

// ===== TENDENCIAS QUERIES =====
const getTendencias       = db.prepare('SELECT * FROM tendencias ORDER BY fuerza DESC');
const getTendenciasCat    = db.prepare('SELECT * FROM tendencias WHERE categoria = ? ORDER BY fuerza DESC');
const getCronologia       = db.prepare('SELECT * FROM cronologia ORDER BY anio DESC, temporada DESC');
const getCronologiaFiltro = db.prepare('SELECT * FROM cronologia WHERE anio = ? ORDER BY temporada DESC');
const getProyecciones     = db.prepare('SELECT * FROM proyecciones ORDER BY anio, escenario');
const getProyFiltro       = db.prepare('SELECT * FROM proyecciones WHERE anio = ? AND escenario = ? ORDER BY categoria');

// ===== USUARIOS QUERIES =====
const createUser   = db.prepare(`
  INSERT INTO usuarios (nombre, email, password_hash, mensaje_solicitud, fecha_solicitud)
  VALUES (?, ?, ?, ?, ?)
`);
const getUserByEmail = db.prepare('SELECT * FROM usuarios WHERE email = ?');
const getUserById    = db.prepare('SELECT * FROM usuarios WHERE id = ?');
const getAllUsers     = db.prepare('SELECT * FROM usuarios ORDER BY created_at DESC');
const getPendingUsers = db.prepare(`SELECT * FROM usuarios WHERE estado = 'pendiente' ORDER BY created_at ASC`);
const getActiveUsers  = db.prepare(`SELECT * FROM usuarios WHERE estado NOT IN ('pendiente','rechazado') ORDER BY created_at DESC`);

const updateUserEstado   = db.prepare('UPDATE usuarios SET estado = ? WHERE id = ?');
const updateUserApproved = db.prepare(`
  UPDATE usuarios SET estado = ?, fecha_aprobacion = ?, fecha_vencimiento_trial = ? WHERE id = ?
`);
const updateUserStripe = db.prepare(`
  UPDATE usuarios SET stripe_customer_id = ?, stripe_subscription_id = ?, estado = ? WHERE id = ?
`);

module.exports = {
  getTendencias, getTendenciasCat, getCronologia, getCronologiaFiltro, getProyecciones, getProyFiltro,
  createUser, getUserByEmail, getUserById, getAllUsers, getPendingUsers, getActiveUsers,
  updateUserEstado, updateUserApproved, updateUserStripe,
};
