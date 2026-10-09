export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../lib/db";
import { conManejoErrores } from "../../../lib/api-utils";

export const GET = conManejoErrores(async function GET() {
  await ensureSchema();
  const rows = await sql`
    SELECT id, fecha, concepto, gasto, ingreso, categoria_id, no_es_fijo
    FROM movimientos
    ORDER BY fecha ASC, id ASC
  `;
  const [{ valor: saldoInicial }] = await sql`
    SELECT valor FROM config WHERE clave = 'saldo_inicial'
  `;
  return NextResponse.json({ movimientos: rows, saldoInicial: Number(saldoInicial) });
});

export const POST = conManejoErrores(async function POST(request) {
  await ensureSchema();
  const body = await request.json();
  const { fecha, concepto, gasto, ingreso, categoriaId } = body;
  if (!fecha || !concepto) {
    return NextResponse.json({ error: "Falta fecha o concepto" }, { status: 400 });
  }
  const [row] = await sql`
    INSERT INTO movimientos (fecha, concepto, gasto, ingreso, categoria_id)
    VALUES (${fecha}, ${concepto}, ${Number(gasto) || 0}, ${Number(ingreso) || 0}, ${categoriaId || null})
    RETURNING id, fecha, concepto, gasto, ingreso, categoria_id, no_es_fijo
  `;
  return NextResponse.json({ movimiento: row });
});

export const PUT = conManejoErrores(async function PUT(request) {
  await ensureSchema();
  const { id, fecha, concepto, gasto, ingreso, categoriaId, noEsFijo } = await request.json();
  if (!id || !fecha || !concepto) {
    return NextResponse.json({ error: "Falta id, fecha o concepto" }, { status: 400 });
  }
  const [row] = await sql`
    UPDATE movimientos
    SET fecha = ${fecha}, concepto = ${concepto}, gasto = ${Number(gasto) || 0},
        ingreso = ${Number(ingreso) || 0}, categoria_id = ${categoriaId || null},
        no_es_fijo = ${!!noEsFijo}
    WHERE id = ${id}
    RETURNING id, fecha, concepto, gasto, ingreso, categoria_id, no_es_fijo
  `;
  return NextResponse.json({ movimiento: row });
});

// Desmarcar: estos gastos dejan de contar como pago de un gasto fijo.
export const PATCH = conManejoErrores(async function PATCH(request) {
  await ensureSchema();
  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Faltan ids" }, { status: 400 });
  }
  for (const id of ids) {
    await sql`UPDATE movimientos SET no_es_fijo = true WHERE id = ${id}`;
  }
  return NextResponse.json({ ok: true });
});

export const DELETE = conManejoErrores(async function DELETE(request) {
  await ensureSchema();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }
  await sql`DELETE FROM movimientos WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
});
