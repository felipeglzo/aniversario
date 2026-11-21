// Resaltados dentro del texto de un recuerdo. Se guardan como ==frase== en el cuerpo
// (nunca cruzan de un renglón a otro). Aquí: quitar marcas, contar y pintar en HTML.
const RE = /==([^\n]+?)==/g;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Texto sin marcas (para contar caracteres, buscar, preheaders…).
const plain = (raw) => String(raw || '').replace(RE, '$1');

// Una línea a HTML, con <mark> (sitio) o con un estilo en línea (correo).
function lineHtml(line, markOpen = '<mark>', markClose = '</mark>') {
  let out = '', i = 0, m;
  RE.lastIndex = 0;
  while ((m = RE.exec(line))) {
    out += esc(line.slice(i, m.index)) + markOpen + esc(m[1]) + markClose;
    i = m.index + m[0].length;
  }
  return out + esc(line.slice(i));
}

// Párrafos: cada renglón con texto es uno. «Largo» = más de un párrafo o más de 220 caracteres:
// entonces el primero va como entrada (serif) y el resto en letra normal.
function paragraphs(raw) {
  const lines = String(raw || '').replace(/\r\n/g, '\n').split(/\n+/).map(l => l.trim()).filter(Boolean);
  const long = lines.length > 1 || [...plain(raw)].length > 220;
  return { lines, long };
}

// Cierra marcas mal formadas y evita guardar marcas vacías.
function clean(raw) {
  return String(raw || '').replace(/====/g, '').replace(/==\s*==/g, '');
}

module.exports = { plain, lineHtml, paragraphs, clean, esc };
