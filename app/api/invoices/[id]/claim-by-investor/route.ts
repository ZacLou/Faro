import { NextResponse } from "next/server"
import { getInvoiceById, setInvestorClaimed } from "@/lib/api/invoices-store"

/**
 * POST /api/invoices/[id]/claim-by-investor
 * Marca que el inversionista reclamó el escrow nominal (deudor → inversionista),
 * para ocultar "Reclamar cobro". La liberación on-chain la hace el front con
 * Trustless Work; este endpoint solo persiste el estado.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const idStr = typeof id === "string" ? id.trim() : ""
    const invoice = idStr ? getInvoiceById(idStr) : undefined
    if (!invoice) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
    }
    if (invoice.status !== "pagada") {
      return NextResponse.json(
        { error: "Solo se puede reclamar el cobro de una factura pagada" },
        { status: 400 }
      )
    }

    const updated = setInvestorClaimed(idStr)
    if (!updated) {
      return NextResponse.json(
        { error: "No se pudo registrar el cobro del inversionista" },
        { status: 409 }
      )
    }
    return NextResponse.json(updated)
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: "Error al registrar el cobro del inversionista" },
      { status: 500 }
    )
  }
}
