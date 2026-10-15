export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../lib/db";
import { conManejoErrores } from "../../../lib/api-utils";

// "Este mes no": un gasto fijo que un mes concreto no se paga.
export const POST = conManejoErrores(async function POST(request) {
  await ensureSchema();
  const { gastoFijoId, anioMes } = await request.json();
  if (!gastoFijoId || !/^\d{4}-\d{2}$/.test(anioMes || "")) {
    return NextResponse.json({ error: "Falta el gasto fijo o el mes" }, { status: 400 });
  }
  await sql`
    INSERT INTO gastos_fijos_saltados (gasto_fijo_id, anio_mes) VALUES (${gastoFijoId}, ${anioMes})
    ON CONFLICT DO NOTHING
  `;
  return NextResponse.json({ ok: true });
});

export const DELETE = conManejoErrores(async function DELETE(request) {
  await ensureSchema();
  const { searchParams } = new URL(request.url);
  const gastoFijoId = searchParams.get("gastoFijoId");
  const anioMes = searchParams.get("anioMes");
  if (!gastoFijoId || !anioMes) {
    return NextResponse.json({ error: "Falta el gasto fijo o el mes" }, { status: 400 });
  }
  await sql`DELETE FROM gastos_fijos_saltados WHERE gasto_fijo_id = ${gastoFijoId} AND anio_mes = ${anioMes}`;
  return NextResponse.json({ ok: true });
});
