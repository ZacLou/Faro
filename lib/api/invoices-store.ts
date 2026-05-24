/**
 * Almacenamiento de facturas para MVP.
 * Lee y escribe en data/invoices.json en cada operación para que las facturas
 * persistan correctamente entre peticiones y entre workers (ej. dev server con varios procesos).
 * Sustituir por base de datos en producción.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"
import type { Invoice, InvoiceCreateInput } from "@/lib/product"

const DATA_DIR = join(process.cwd(), "data")
const FILE_PATH = join(DATA_DIR, "invoices.json")

interface StoredData {
  nextId: number
  invoices: Invoice[]
}

function readFromFile(): StoredData {
  const defaultData: StoredData = { nextId: 1, invoices: [] }
  try {
    if (!existsSync(FILE_PATH)) {
      return defaultData
    }
    const raw = readFileSync(FILE_PATH, "utf-8")
    const data = JSON.parse(raw) as Partial<StoredData>
    if (!data || typeof data.nextId !== "number" || !Array.isArray(data.invoices)) {
      return defaultData
    }
    return {
      nextId: data.nextId > 0 ? data.nextId : 1,
      invoices: data.invoices,
    }
  } catch (e) {
    console.error("[invoices-store] Error reading file:", e)
    return defaultData
  }
}

function writeToFile(data: StoredData): void {
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true })
    }
    const payload = { nextId: data.nextId, invoices: data.invoices }
    writeFileSync(FILE_PATH, JSON.stringify(payload, null, 0), "utf-8")
  } catch (e) {
    console.error("[invoices-store] Error writing file:", e)
    throw e
  }
}

function generateId(nextId: number): string {
  return `FAC-${String(nextId).padStart(3, "0")}`
}

export function createInvoice(input: InvoiceCreateInput): Invoice {
  const data = readFromFile()
  const now = new Date().toISOString()
  const id = generateId(data.nextId)
  data.nextId += 1
  const invoice: Invoice = {
    id,
    providerAddress: input.providerAddress,
    emitterName: input.emitterName,
    debtorName: input.debtorName,
    debtorAddress: input.debtorAddress ?? null,
    amount: input.amount,
    currency: input.currency,
    dueDate: input.dueDate,
    discountRatePercent: input.discountRatePercent,
    status: "en_mercado",
    createdAt: now,
    investorAddress: null,
    escrowId: null,
    escrowNominalId: null,
    providerClaimedAt: null,
    investorClaimedAt: null,
    financedAt: null,
    paidAt: null,
    tokenizeTxHash: null,
  }
  data.invoices.push(invoice)
  writeToFile(data)
  return invoice
}

export function setInvoiceTokenizeTxHash(
  id: string,
  tokenizeTxHash: string
): Invoice | null {
  const data = readFromFile()
  const invoice = data.invoices.find((i) => i.id === id)
  if (!invoice) return null
  invoice.tokenizeTxHash = tokenizeTxHash
  writeToFile(data)
  return invoice
}

export function listInvoices(filters?: {
  status?: Invoice["status"]
  providerAddress?: string
  investorAddress?: string
  debtorAddress?: string
}): Invoice[] {
  const data = readFromFile()
  let list = [...data.invoices]
  if (filters?.status) {
    list = list.filter((i) => i.status === filters.status)
  }
  if (filters?.providerAddress) {
    const needle = filters.providerAddress.trim().toLowerCase()
    if (needle) {
      list = list.filter((i) => {
        const addr = i.providerAddress
        return typeof addr === "string" && addr.trim().toLowerCase() === needle
      })
    }
  }
  if (filters?.investorAddress) {
    const needle = filters.investorAddress.trim().toLowerCase()
    if (needle) {
      list = list.filter((i) => {
        const addr = i.investorAddress
        if (addr == null || typeof addr !== "string") return false
        return addr.trim().toLowerCase() === needle
      })
    }
  }
  if (filters?.debtorAddress) {
    const needle = filters.debtorAddress.trim().toLowerCase()
    if (needle) {
      list = list.filter((i) => {
        const addr = i.debtorAddress
        if (addr == null || typeof addr !== "string") return false
        return addr.trim().toLowerCase() === needle
      })
    }
  }
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function getInvoiceById(id: string): Invoice | undefined {
  const data = readFromFile()
  const needle = typeof id === "string" ? id.trim() : ""
  if (!needle) return undefined
  return data.invoices.find((i) => i.id === needle)
}

export function setInvoiceInvested(
  id: string,
  investorAddress: string,
  escrowId?: string
): Invoice | null {
  const data = readFromFile()
  const invoice = data.invoices.find((i) => i.id === id)
  if (!invoice || invoice.status !== "en_mercado") return null
  invoice.status = "financiada"
  invoice.investorAddress = investorAddress
  invoice.escrowId = escrowId ?? null
  invoice.financedAt = new Date().toISOString()
  writeToFile(data)
  return invoice
}

export function setInvoicePaid(
  id: string,
  escrowNominalId?: string | null
): Invoice | null {
  const data = readFromFile()
  const invoice = data.invoices.find((i) => i.id === id)
  if (!invoice || invoice.status !== "financiada") return null
  const preservedDebtorAddress = invoice.debtorAddress
  invoice.status = "pagada"
  if (preservedDebtorAddress !== undefined) invoice.debtorAddress = preservedDebtorAddress
  if (escrowNominalId !== undefined) invoice.escrowNominalId = escrowNominalId ?? null
  invoice.paidAt = new Date().toISOString()
  writeToFile(data)
  return invoice
}

export function setProviderClaimed(id: string): Invoice | null {
  const data = readFromFile()
  const invoice = data.invoices.find((i) => i.id === id)
  if (!invoice) return null
  invoice.providerClaimedAt = new Date().toISOString()
  writeToFile(data)
  return invoice
}

export function setInvestorClaimed(id: string): Invoice | null {
  const data = readFromFile()
  const invoice = data.invoices.find((i) => i.id === id)
  if (!invoice) return null
  invoice.investorClaimedAt = new Date().toISOString()
  writeToFile(data)
  return invoice
}
