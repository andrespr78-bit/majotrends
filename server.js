const express = require('express');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { getTendencias, getTendenciasCat, getCronologia, getCronologiaFiltro, getProyecciones, getProyFiltro } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3001;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== TENDENCIAS =====
app.get('/api/tendencias', (req, res) => {
  res.json(getTendencias.all());
});
app.get('/api/tendencias/:categoria', (req, res) => {
  res.json(getTendenciasCat.all(req.params.categoria));
});

// ===== CRONOLOGÍA =====
app.get('/api/cronologia', (req, res) => {
  const { anio } = req.query;
  res.json(anio ? getCronologiaFiltro.all(anio) : getCronologia.all());
});

// ===== PROYECCIONES =====
app.get('/api/proyecciones', (req, res) => {
  const { anio, escenario } = req.query;
  res.json(anio && escenario ? getProyFiltro.all(anio, escenario) : getProyecciones.all());
});

// ===== CONSULTA IA (SSE streaming) =====
app.post('/api/consulta', async (req, res) => {
  const { pregunta } = req.body;
  if (!pregunta?.trim()) return res.status(400).json({ error: 'La pregunta es requerida.' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `Eres la asesora de tendencias de moda de MaJo Colombia, una marca de ropa exterior femenina con presencia en Colombia y el mercado latino en EE.UU.

Tu nombre es Majo IA. Respondes SIEMPRE en español, de forma elegante, directa y con criterio editorial.

Tu especialidad:
- Tendencias de ropa exterior femenina (outerwear, vestidos, blazers, abrigos, faldas, pantalones)
- Mercados: Colombia, Miami, Nueva York, Ciudad de México
- Ciclos de moda: fast fashion vs. lujo accesible
- Análisis de temporadas SS (Spring/Summer) y FW (Fall/Winter)
- Proyección de tendencias con base histórica
- Paletas de color, siluetas, telas y estampados
- La cliente MaJo: mujer latinoamericana 28-55 años, profesional, con poder adquisitivo medio-alto

Cuando respondas:
- Sé concreta y editorial, no genérica
- Da ejemplos específicos de prendas, colores, marcas de referencia cuando aplica
- Incluye perspectiva del mercado colombiano cuando sea relevante
- Usa terminología de moda correctamente (SS, FW, outerwear, tailoring, etc.)
- Si proyectas tendencias, basa tu análisis en ciclos históricos reales`,
      messages: [{ role: 'user', content: pregunta.trim() }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`MaJo Trends corriendo en http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) console.warn('⚠  ANTHROPIC_API_KEY no configurada.');
});
