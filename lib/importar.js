// Lee movimientos pegados como texto, una línea por movimiento:
//   dd/mm/aaaa;concepto;importe;categoría
// El importe es negativo si es un gasto y positivo si es un ingreso. La
// categoría es opcional. También vale separar con tabuladores.

// "1.234,56", "-12,50 €", "−0,99", "12.5" -> número (con su signo).
export function leerImporte(texto) {
  let t = String(texto || "")
    .replace(/[€\s]/g, "")
    .replace(/[−–]/g, "-");
  if (!t) return NaN;
  const ultimaComa = t.lastIndexOf(",");
  const ultimoPunto = t.lastIndexOf(".");
  if (ultimaComa > -1 && ultimoPunto > -1) {
    // El último separador es el decimal; el otro, de miles.
    t = ultimaComa > ultimoPunto ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  } else if (ultimaComa > -1) {
    t = t.replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, ""); // "1.234" son miles
  }
  return /^[-+]?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

// "02/11/2026", "2/11/26", "2026-11-02" -> "2026-11-02" (o null).
export function leerFecha(texto) {
  const t = String(texto || "").trim();
  let m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  let dia, mes, anio;
  if (m) {
    [, dia, mes, anio] = m.map(Number);
    if (anio < 100) anio += 2000;
  } else if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) {
    [, anio, mes, dia] = m.map(Number);
  } else {
    return null;
  }
  const d = new Date(anio, mes - 1, dia);
  if (d.getFullYear() !== anio || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function leerMovimientos(texto) {
  const filas = [];
  String(texto || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^total/i.test(l))
    .forEach((linea, i) => {
      const partes = linea.split(linea.includes(";") ? ";" : "\t").map((p) => p.trim());
      const [fechaTexto, concepto, importeTexto, categoria = ""] = partes;
      const fecha = leerFecha(fechaTexto);
      const importe = leerImporte(importeTexto);
      let error = "";
      if (partes.length < 3) error = "Faltan datos (fecha;concepto;importe)";
      else if (!fecha) error = `Fecha no válida: "${fechaTexto}"`;
      else if (!concepto) error = "Falta el concepto";
      else if (!Number.isFinite(importe) || importe === 0) error = `Importe no válido: "${importeTexto}"`;
      filas.push({
        linea: i + 1,
        texto: linea,
        fecha,
        concepto: concepto || "",
        tipo: importe > 0 ? "ingreso" : "gasto",
        importe: Math.round(Math.abs(importe || 0) * 100) / 100,
        categoriaTexto: categoria,
        error,
      });
    });
  return filas;
}

// Busca en el desplegable la categoría que escribió el otro chat:
// "cat-<id>" (gasto variable), "gf-<id>" (gasto fijo) o "" (sin elegir).
export function categoriaDeTexto(texto, gastosFijos, categorias) {
  const t = String(texto || "").trim().toLowerCase();
  if (!t) return "";
  const cat = categorias.find((c) => c.concepto.trim().toLowerCase() === t);
  if (cat) return "cat-" + cat.id;
  const gf = gastosFijos.find((g) => g.concepto.trim().toLowerCase() === t);
  if (gf) return "gf-" + gf.id;
  return "";
}

// ¿Ya hay un movimiento ese día con el mismo importe y tipo?
export function pareceRepetido(fila, movimientos) {
  return movimientos.some((m) => {
    const fecha = String(m.fecha).slice(0, 10);
    const importe = Number(fila.tipo === "gasto" ? m.gasto : m.ingreso);
    return fecha === fila.fecha && Math.abs(importe - fila.importe) < 0.005;
  });
}
