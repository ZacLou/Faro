"use client"

/**
 * Stepper compartido para los flujos on-chain de Faro (invertir, pagar,
 * cobrar como proveedor, reclamar como inversionista). Reemplaza al spinner
 * único con una lista vertical de pasos que indica claramente dónde va la
 * operación (preparando XDR / esperando firma / enviando a la red), para
 * que el usuario sepa qué falta — sobre todo cuando una firma queda en
 * espera en Freighter.
 *
 * Uso:
 *   const stepper = useEscrowStepper([
 *     { id: "init",   label: "Preparando escrow" },
 *     { id: "sign1",  label: "Firmando creación en Freighter" },
 *     { id: "send1",  label: "Enviando a la red" },
 *   ])
 *   stepper.reset()
 *   stepper.start("init")
 *   ...
 *   stepper.complete("init"); stepper.start("sign1")
 *   ...
 *   if (stepper.active) <EscrowStepper steps={stepper.steps} />
 */

import { useCallback, useMemo, useState } from "react"
import { CheckCircle2, Loader2, AlertCircle, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

export type StepStatus = "pending" | "in_progress" | "done" | "error"

export interface StepperStepDef {
  id: string
  label: string
}

export interface StepperStep extends StepperStepDef {
  status: StepStatus
  detail?: string
}

interface UseEscrowStepperReturn {
  steps: StepperStep[]
  active: boolean
  /** Resetea todos los pasos a pending y oculta el stepper. */
  reset: () => void
  /** Marca el paso como in_progress y muestra el stepper. */
  start: (id: string, detail?: string) => void
  /** Marca el paso como done. */
  complete: (id: string) => void
  /** Marca el paso como error y deja el stepper visible. */
  fail: (id: string, detail?: string) => void
  /** Marca todos los pasos pending como done (al cerrar con éxito). */
  finishAll: () => void
}

export function useEscrowStepper(defs: StepperStepDef[]): UseEscrowStepperReturn {
  const initial = useMemo<StepperStep[]>(
    () => defs.map((d) => ({ ...d, status: "pending" as StepStatus })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(defs)]
  )
  const [steps, setSteps] = useState<StepperStep[]>(initial)
  const [active, setActive] = useState(false)

  const reset = useCallback(() => {
    setSteps(initial)
    setActive(false)
  }, [initial])

  const start = useCallback(
    (id: string, detail?: string) => {
      setActive(true)
      setSteps((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: "in_progress", detail } : s
        )
      )
    },
    []
  )

  const complete = useCallback((id: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "done", detail: undefined } : s
      )
    )
  }, [])

  const fail = useCallback((id: string, detail?: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "error", detail } : s
      )
    )
  }, [])

  const finishAll = useCallback(() => {
    setSteps((prev) =>
      prev.map((s) =>
        s.status === "pending" || s.status === "in_progress"
          ? { ...s, status: "done", detail: undefined }
          : s
      )
    )
  }, [])

  return { steps, active, reset, start, complete, fail, finishAll }
}

function StepIcon({ status, index }: { status: StepStatus; index: number }) {
  if (status === "done") {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-500/15">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      </div>
    )
  }
  if (status === "in_progress") {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-primary/15">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    )
  }
  if (status === "error") {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-destructive bg-destructive/15">
        <AlertCircle className="h-4 w-4 text-destructive" />
      </div>
    )
  }
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
      {index + 1}
    </div>
  )
}

export function EscrowStepper({ steps }: { steps: StepperStep[] }) {
  return (
    <div className="glass-panel border-primary/20 bg-primary/5 p-5">
      <ol className="flex flex-col gap-3">
        {steps.map((step, i) => (
          <li key={step.id} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <StepIcon status={step.status} index={i} />
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "mt-1 h-4 w-0.5 transition-colors",
                    step.status === "done" ? "bg-emerald-500/40" : "bg-border"
                  )}
                />
              )}
            </div>
            <div className="flex-1 pt-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.status === "done"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : step.status === "in_progress"
                      ? "text-foreground"
                      : step.status === "error"
                        ? "text-destructive"
                        : "text-muted-foreground"
                )}
              >
                {step.label}
              </p>
              {step.detail && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {step.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      {steps.some((s) => s.status === "in_progress") && (
        <p className="mt-4 flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <Circle className="h-3 w-3 fill-current" />
          Si te pide firmar, revisa la ventana de Freighter. No cierres esta
          pestaña.
        </p>
      )}
    </div>
  )
}
