# Mainnet Migration Checklist

> Plan documentado para migrar Faro de Stellar Testnet a Mainnet para producción real.

---

## 1. Auditoría del Contrato Soroban

- [ ] Auditoría interna completa del contrato de tokenización de facturas
- [ ] Revisión de vectores de ataque: reentrancy, overflow, access control
- [ ] Si el presupuesto lo permite: auditoría externa con firma especializada en Soroban
- [ ] Publicar reporte de auditoría (resumen ejecutivo) para transparencia con inversionistas

---

## 2. Deploy del Contrato a Mainnet

- [ ] Crear cuenta admin nueva (multisig o hardware-backed, NO single-key hot wallet)
- [ ] Fondear la cuenta admin con XLM para gas y operaciones
- [ ] Compilar contrato para producción (`--release`, optimizado)
- [ ] Deploy del contrato a Stellar Mainnet:
  ```bash
  stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/faro_token.wasm \
    --source admin \
    --network mainnet
  ```
- [ ] Guardar y respaldar el contract ID de forma segura
- [ ] Verificar deploy con `stellar contract invoke --network mainnet -- get_factory_info`

---

## 3. Cambio de USDC Testnet → Mainnet

- [ ] Reemplazar el token testnet por USDC mainnet de Circle
  - Issuer: `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`
  - Asset code: `USDC`
- [ ] Actualizar `FARO_INVOICE_TOKEN_CONTRACT_ID` en variables de entorno
- [ ] Verificar que el frontend reconoce USDC mainnet correctamente
- [ ] Probar flujo completo: conectar wallet → tokenizar factura → inversor paga → claim

---

## 4. Migración de Trustless Work

- [ ] Confirmar disponibilidad del entorno mainnet de Trustless Work
- [ ] Coordinar con el equipo de Trustless Work la migración
- [ ] Actualizar endpoints y config de Trustless Work en `.env.production`
- [ ] Probar flujo de escrow con facturas reales en mainnet

---

## 5. Variables de Entorno (.env.production)

- [ ] Crear archivo `.env.production` separado de `.env.local`
- [ ] Almacenar secretos en Vercel (no en el repositorio):
  - `FARO_INVOICE_TOKEN_CONTRACT_ID`
  - `TRUSTLESS_WORK_API_KEY`
  - `STELLAR_ADMIN_SECRET`
  - `NEXT_PUBLIC_APP_URL`
- [ ] Verificar que `.env.production` está en `.gitignore`

---

## 6. Estrategia de Rollback

- [ ] Mantener deploy de testnet activo como fallback
- [ ] Documentar pasos de rollback: restaurar variables de entorno, redeploy de testnet
- [ ] Tener un flag `NEXT_PUBLIC_NETWORK=testnet|mainnet` para switcheo rápido
- [ ] Probar rollback en staging antes del launch

---

## 7. Comunicación a Usuarios Beta

- [ ] Avisar con mínimo 2 semanas de anticipación
- [ ] Explicar que testnet → mainnet NO es transparente:
  - Las cuentas de testnet no migran
  - Las facturas tokenizadas en testnet no son válidas en mainnet
  - Los balances de testnet USDC no tienen valor real
- [ ] Publicar FAQ y canal de soporte temporal (Discord/Telegram)
- [ ] Enviar email a lista de beta testers registrados

---

## 8. Términos y Condiciones + Disclaimer

- [ ] Redactar términos y condiciones legales para uso en producción
- [ ] Incluir disclaimer de riesgo: volatilidad, riesgo de smart contract, no garantía de retorno
- [ ] Revisión legal según jurisdicción aplicable (México e internacional)
- [ ] Publicar en `/legal/terms` y `/legal/disclaimer`

---

## 9. KYC / AML

- [ ] Definir si aplica KYC/AML por jurisdicción de los inversionistas
- [ ] Evaluar integración con proveedores KYC (Sumsub, Onfido, etc.)
- [ ] Implementar límites según regulación: ¿monto máximo sin KYC? ¿inversionistas acreditados?
- [ ] Documentar política de cumplimiento en `docs/KYC-POLICY.md`

---

## 10. Plan de Soporte 24/7 (Primeros 30 Días)

- [ ] Designar equipo de guardia para incidencias críticas
- [ ] Configurar alertas: RPC caído, contrato pausado, errores 5xx > umbral
- [ ] Tener procedimiento de emergencia: pausar contrato, comunicar a usuarios
- [ ] Monitoreo de métricas clave: volumen tokenizado, claims exitosos, tiempo de respuesta

---

## Cronograma Estimado

| Fase | Duración | Dependencias |
|------|----------|-------------|
| Auditoría interna | Semana 1-2 | Ninguna |
| Auditoría externa | Semana 3-5 | Presupuesto disponible |
| Deploy a mainnet | Semana 5 | Auditoría completada |
| Migración Trustless Work | Semana 5-6 | Coordinación con equipo TW |
| Pruebas end-to-end | Semana 6-7 | Deploy + Trustless Work listos |
| Comunicación a usuarios | Semana 7 | Pruebas pasadas |
| Launch | Semana 8 | Todas las anteriores |

---

*Parte del proceso de migración de Faro a Mainnet. Revisar y actualizar este documento conforme avance cada fase.*
