# Plan de implementación: dos escrows y flujo de cobro

> **Estado: implementado (mayo 2026).** Este documento es el plan original que se usó como guía. Para el estado actual del código, roles exactos, archivos y trade-offs reales, ver [ARCHITECTURE.md](ARCHITECTURE.md). Las Fases A, B y C de este plan ya están en `main`; los `escrowId` y `escrowNominalId` se crean desde el front con el SDK `@trustless-work/escrow`, y las páginas `/app/claim-provider/[id]` y `/app/claim-investor/[id]` liberan cada escrow.

## Objetivo

Separar el flujo en **dos escrows** y ajustar acciones por rol:

1. **Escrow Inversión (investor → provider):** El inversionista bloquea el monto a invertir; se libera cuando el **proveedor** cobra.
2. **Escrow Nominal (debtor → investor):** El deudor “paga” solo **confirmando** en la app; el dinero nominal que paga en la vida real debe ir al inversionista (segundo escrow: deudor bloquea nominal, se libera cuando el **inversionista** reclama).
3. **Pagar (deudor):** Solo registrar que el deudor hizo el pago (sin liberar escrow en ese paso).
4. **Cobrar factura (proveedor):** Botón habilitado cuando la factura está financiada; al cobrar se libera el Escrow Inversión hacia el proveedor.
5. **Reclamar cobro (inversionista):** Botón habilitado cuando el deudor ya marcó la factura como pagada; al reclamar se libera el Escrow Nominal hacia el inversionista.

---

## Flujo deseado (resumen)

```
[Proveedor] Tokeniza factura
     ↓
[Inversionista] Financia → crea ESCROW 1 (inversionista bloquea “monto a invertir”)
     ↓
[Proveedor] Cobra factura → se libera ESCROW 1 → proveedor recibe liquidez
     ↓
[Deudor] Confirma pago → solo se marca “pagada” en la app (sin mover escrow aquí)
     ↓
  (En la vida real el deudor paga el nominal; en la app se modela con ESCROW 2)
[Deudor] Opcional: bloquea nominal en ESCROW 2 (o se asume pago externo)
     ↓
[Inversionista] Reclama cobro → se libera ESCROW 2 → inversionista recibe nominal
```

---

## 1. Modelo de datos

### 1.1 Factura (Invoice)

Campos nuevos o aclarados:

| Campo | Uso |
|-------|-----|
| `escrowId` | **Renombrar o reutilizar:** id del **Escrow Inversión** (creado al financiar). |
| `escrowNominalId` (nuevo) | Id del **Escrow Nominal** (creado cuando el deudor “paga” / bloquea el nominal). Opcional si el nominal no se bloquea on-chain. |

Estados que ya tienes siguen siendo útiles:

- `en_mercado` → disponible para invertir.
- `financiada` → invertida; proveedor puede **Cobrar factura** (liberar Escrow 1).
- `pagada` → deudor confirmó pago; inversionista puede **Reclamar cobro** (liberar Escrow 2, si existe).

Si quieres distinguir “proveedor ya cobró” vs “proveedor aún no cobra”, se puede añadir un estado intermedio (ej. `cobrada_por_proveedor`) o un booleano `providerClaimedAt`; no es estrictamente necesario para el primer MVP de dos escrows.

### 1.2 Store y API

- Añadir `escrowNominalId?: string | null` en tipo `Invoice` y en `invoices-store` (crear, leer, escribir).
- Mantener `escrowId` como escrow de inversión.
- En `setInvoicePaid`: no tocar escrow; solo marcar estado `pagada` y preservar `debtorAddress` (ya lo haces).

---

## 2. Escrow 1: Inversión (investor → provider)

### 2.1 Quién hace qué

- **Al invertir:** el inversionista crea y fondea el escrow (como ahora, pero con roles distintos).
- **Montos:** solo el “monto a invertir” (nominal × (1 − descuento/100)), en USDC.
- **Receptor (receiver):** `providerAddress` (proveedor).
- **releaseSigner / quien libera:** `providerAddress` (proveedor). Así el proveedor solo cobra cuando hace la acción “Cobrar factura”.

### 2.2 Roles Trustless Work (Escrow 1)

- `signer`: inversionista (crea/fondea).
- `receiver`: **proveedor** (recibe al liberar).
- `releaseSigner`: **proveedor** (solo el proveedor puede liberar).
- `approver`: puede ser proveedor o plataforma, según quieras que el cobro sea unilateral del proveedor o con aprobación.
- `serviceProvider`: en single-release puede ser el proveedor (el que “entrega” al recibir el cobro).

Con esto, al hacer “Cobrar factura” el proveedor llama a change-milestone (si aplica), approve y release; los fondos salen a `receiver` = proveedor.

### 2.3 Cambios en el código actual

- En **inversión** (`app/app/market/[id]/page.tsx` y payload a Trustless Work):
  - `receiver`: de `address` (investor) a `invoice.providerAddress`.
  - `releaseSigner`: de `invoice.debtorAddress` a `invoice.providerAddress`.
  - Ajustar `approver` y `serviceProvider` para que el flujo “liberar” lo tenga el proveedor (no el deudor).
- Backend: seguir guardando en la factura `escrowId` = id del Escrow 1.

---

## 3. Acción “Cobrar factura” (proveedor)

### 3.1 Cuándo se habilita

- Factura en estado **financiada**.
- Usuario conectado es el **proveedor** (`providerAddress === address`).
- Opcional: comprobar que Escrow 1 existe (`escrowId` presente).

### 3.2 Dónde mostrarla

- **Dashboard (Actividad reciente):** en filas donde rol = Proveedor y estado = Financiada, mostrar botón **“Cobrar factura”** (además o en lugar de “Ver”).
- Opcional: vista detalle de factura para proveedor (`/app/market/[id]` o `/app/invoice/[id]`) con botón “Cobrar factura”.

### 3.3 Flujo al cobrar

1. Front: llamar a Trustless Work (change milestone + approve + release) con el `escrowId` de la factura, firmando con la wallet del proveedor.
2. Backend: nuevo endpoint `POST /api/invoices/[id]/claim-by-provider` (o similar) que:
   - Verifica que la factura está `financiada` y que `providerAddress` coincide con el que reclama.
   - Opcional: marcar algo tipo “proveedor ya cobró” (campo o estado) para no mostrar “Cobrar” dos veces.
3. UI: mensaje de éxito y actualizar estado de la factura / lista.

No es obligatorio crear este endpoint si toda la lógica de liberación es on-chain y solo necesitas actualizar estado en backend; puede ser solo front + actualizar “proveedor cobró” en store.

---

## 4. Pago del deudor (solo confirmación)

### 4.1 Comportamiento

- El botón **“Pagar”** del deudor **no** debe liberar ningún escrow ni mover fondos en ese paso.
- Solo debe:
  - Registrar que el deudor confirmó el pago (por ejemplo `POST /api/invoices/[id]/pay` que hace `setInvoicePaid(id)`).
  - Marcar la factura como **pagada** y, si aplica, guardar `escrowNominalId` cuando en el futuro el deudor bloquee el nominal en Escrow 2.

### 4.2 Cambios en código actual

- En **`app/app/pay/[id]/page.tsx`**:
  - Quitar toda la lógica de Trustless Work (changeMilestoneStatus, approveMilestone, releaseFunds) para el escrow actual.
  - Dejar solo: llamada a `POST /api/invoices/[id]/pay` (body puede ser `{}` o `{ confirmedByDebtor: true }`).
- En **`app/api/invoices/[id]/pay/route.ts`**:
  - No llamar a `releaseEscrow` ni a Trustless Work; solo `setInvoicePaid(id)` y devolver la factura actualizada.

Así, “Pagar” = solo confirmación del deudor; el dinero al inversionista se maneja con Escrow 2.

---

## 5. Escrow 2: Nominal (debtor → investor)

### 5.1 Momento de creación

Dos opciones:

- **A) Escrow 2 se crea cuando el deudor confirma el pago**  
  En la misma pantalla “Pagar”, el deudor: (1) bloquea el nominal en un nuevo escrow (Trustless Work), (2) luego se llama a `POST /api/invoices/[id]/pay` con `escrowNominalId` y se marca factura como pagada. El inversionista luego “reclama” y se libera ese escrow hacia él.

- **B) Sin escrow on-chain para el nominal**  
  El deudor solo confirma en la app que pagó; el flujo de dinero nominal es externo (transferencia bancaria, etc.). En ese caso no hay Escrow 2; el botón “Reclamar cobro” del inversionista podría ocultarse o usarse solo para marcar “ya recibí el pago” sin mover fondos on-chain.

Recomendación para MVP con dos escrows: **opción A** (crear Escrow 2 al “pagar” el deudor).

### 5.2 Roles Escrow 2 (nominal)

- **Fondeador (signer):** deudor (`debtorAddress`).
- **Monto:** nominal de la factura, en USDC.
- **Receptor (receiver):** inversionista (`investorAddress`).
- **releaseSigner:** inversionista (solo el inversionista puede liberar y llevarse el nominal).

### 5.3 Creación del Escrow 2

- **Dónde:** en la pantalla de pago del deudor (`/app/pay/[id]`), al hacer “Pagar”:
  1. Crear y fondear Escrow 2 (Trustless Work) con roles anteriores.
  2. Llamar a `POST /api/invoices/[id]/pay` con body `{ escrowNominalId: "..." }`.
  3. Backend guarda `escrowNominalId` y hace `setInvoicePaid(id)`.
- Store: en `setInvoicePaid` aceptar opcionalmente `escrowNominalId` y guardarlo en la factura.

---

## 6. Acción “Reclamar cobro” (inversionista)

### 6.1 Cuándo se habilita

- Factura en estado **pagada**.
- Usuario conectado es el **inversionista** (`investorAddress === address`).
- Existe `escrowNominalId` (si no hay Escrow 2, se puede ocultar el botón).

### 6.2 Dónde mostrarla

- **Dashboard:** en filas donde rol = Inversionista y estado = Pagada, mostrar **“Reclamar cobro”** (y opcionalmente “Ver”).
- Detalle de factura para el inversionista.

### 6.3 Flujo al reclamar

1. Front: con `escrowNominalId`, llamar a Trustless Work (change milestone + approve + release) firmando con la wallet del inversionista (releaseSigner).
2. Backend: opcional `POST /api/invoices/[id]/claim-by-investor` para marcar “inversionista ya reclamó” y no mostrar de nuevo el botón.
3. UI: éxito y actualizar estado.

---

## 7. Orden sugerido de implementación

### Fase A – Sin romper lo actual

1. **Modelo y store**
   - Añadir `escrowNominalId` a `Invoice` y a `invoices-store` (crear/actualizar/lectura).
   - Mantener `escrowId` como escrow de inversión.

2. **Pago = solo confirmación**
   - En `app/app/pay/[id]/page.tsx`: quitar todas las llamadas a Trustless Work (changeMilestoneStatus, approveMilestone, releaseFunds).
   - Dejar solo `POST /api/invoices/[id]/pay` (sin body de escrow por ahora).
   - En `app/api/invoices/[id]/pay/route.ts`: no llamar a `releaseEscrow`; solo `setInvoicePaid(id)`.

Con esto, “Pagar” ya no mueve fondos; solo marca la factura como pagada.

### Fase B – Escrow 1 correcto (inversión → proveedor)

3. **Roles Escrow 1**
   - En la pantalla de inversión, crear el escrow con:
     - `receiver`: `invoice.providerAddress`
     - `releaseSigner`: `invoice.providerAddress`
     - `approver` / `serviceProvider`: según modelo Trustless Work (proveedor como quien “recibe” y libera).
   - Probar que, tras invertir, el proveedor pueda liberar fondos hacia su wallet (sin que el deudor intervenga).

4. **Botón “Cobrar factura” (proveedor)**
   - En dashboard (y opcional detalle), para facturas con rol Proveedor y estado Financiada, mostrar “Cobrar factura”.
   - Flujo: change milestone + approve + release con wallet del proveedor sobre `escrowId`.
   - Opcional: endpoint `POST /api/invoices/[id]/claim-by-provider` y/o campo `providerClaimedAt` para no mostrar dos veces el botón.

### Fase C – Escrow 2 (nominal) y “Reclamar cobro”

5. **Crear Escrow 2 al pagar (deudor)**
   - En `/app/pay/[id]`: al hacer “Pagar”, crear y fondear un segundo escrow (nominal, receiver = investor, releaseSigner = investor, signer = debtor).
   - Llamar a `POST /api/invoices/[id]/pay` con `{ escrowNominalId }`.
   - Backend: guardar `escrowNominalId` en la factura y llamar a `setInvoicePaid(id)`.

6. **Botón “Reclamar cobro” (inversionista)**
   - En dashboard (y opcional detalle), para facturas con rol Inversionista y estado Pagada y con `escrowNominalId`, mostrar “Reclamar cobro”.
   - Flujo: liberar Escrow 2 (change + approve + release) con wallet del inversionista.
   - Opcional: endpoint y campo “investorClaimedAt” para no mostrar dos veces.

### Fase D – Ajustes y edge cases

7. **Estados y mensajes**
   - Textos claros: “Cobrar factura” (proveedor), “Confirmar pago” (deudor), “Reclamar cobro” (inversionista).
   - Manejo de errores y estados intermedios (ej. proveedor cobró pero factura sigue “financiada” en UI hasta refresco).

8. **Tests y revisión**
   - Flujo completo: tokenizar → invertir → proveedor cobra → deudor confirma pago (y opcional Escrow 2) → inversionista reclama.
   - Verificar que no se pueda cobrar/reclamar dos veces.

---

## 8. Resumen de endpoints y acciones

| Acción | Rol | Condición | Efecto |
|--------|-----|-----------|--------|
| Invertir | Inversionista | Factura `en_mercado` | Crea Escrow 1 (inversionista → proveedor), factura → `financiada`. |
| Cobrar factura | Proveedor | Factura `financiada`, es el proveedor | Libera Escrow 1 → proveedor recibe liquidez. |
| Pagar / Confirmar pago | Deudor | Factura `financiada`, es el deudor | (Opcional) Crea Escrow 2 (deudor → inversionista); factura → `pagada`. |
| Reclamar cobro | Inversionista | Factura `pagada`, es el inversionista, existe Escrow 2 | Libera Escrow 2 → inversionista recibe nominal. |

---

## 9. Notas

- **Trustline USDC:** Tanto el proveedor como el deudor y el inversionista deben poder tener USDC (trustline) donde aplique para recibir o bloquear en cada escrow.
- **Compatibilidad:** Las facturas ya financiadas con el escrow actual (donde el deudor liberaba hacia el inversionista) pueden quedarse como están; la lógica nueva aplica a inversiones y pagos hechos después de este cambio.
- Si se prefiere no tener Escrow 2 on-chain (pago nominal fuera de chain), se puede dejar solo “Confirmar pago” del deudor y ocultar “Reclamar cobro” o convertirlo en “Marcar como cobrado” sin movimiento de fondos.

Si quieres, el siguiente paso puede ser implementar solo la **Fase A** (pago = solo confirmación) y la **Fase B** (Escrow 1 con receiver = proveedor + botón Cobrar factura), y dejar Escrow 2 y “Reclamar cobro” para una segunda iteración.
