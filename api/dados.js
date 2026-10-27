// Lê a aba "Dados - API" publicada como CSV e devolve os números em JSON
const CSV_URL = process.env.PLANILHA_CSV_URL || 'COLE_AQUI_O_LINK_CSV';

function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const num = (s) => {
  const t = String(s || '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace('%', '');
  if (t === '') return null; const n = Number(t); return isNaN(n) ? null : n;
};

module.exports = async (req, res) => {
  try {
    if (!/^https:\/\/docs\.google\.com\//.test(CSV_URL)) throw new Error('Link da planilha não configurado');
    const r = await fetch(CSV_URL + (CSV_URL.includes('?') ? '&' : '?') + 't=' + Date.now(), { redirect: 'follow' });
    if (!r.ok) throw new Error('Planilha respondeu ' + r.status);
    const linhas = parseCSV(await r.text());
    const dados = {};
    for (const c of linhas) {
      const nome = (c[0] || '').trim();
      if (!nome || (c[1] || '').trim() === 'QTD') continue;
      const conv = /%/.test(c[2] || '') ? num(c[2]) : null;
      dados[nome] = { qtd: num(c[1]), conversao: conv === null ? null : conv / 100 };
    }
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=30');
    res.status(200).json({ atualizadoEm: new Date().toISOString(), dados });
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).json({ erro: e.message });
  }
};
