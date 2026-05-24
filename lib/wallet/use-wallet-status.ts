"use client"

/**
 * Hook que reúne el estado "en vivo" de la wallet conectada para mostrarlo de
 * forma persistente en la app: red configurada vs red real de la wallet,
 * trustline USDC y balances. Se refresca al conectar/cambiar de dirección
 * y cuando la ventana recupera el foco.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  getAccountBalances,
  type AccountBalances,
} from "./get-account-balances"
import { useStellarWalletKit } from "./stellar-wallet-kit-provider"

type ExpectedNetworkLabel = "Futurenet" | "Testnet" | "Mainnet"

export interface WalletStatus {
  address: string | null
  isConnected: boolean
  /** Red configurada por la app (env) */
  expectedNetworkLabel: ExpectedNetworkLabel
  /** Red reportada por la wallet (null si no detectable) */
  walletNetwork: { network: string; networkPassphrase: string } | null
  /** true si la wallet está en la red esperada, false si difiere, null si aún no se conoce */
  isOnExpectedNetwork: boolean | null
  /** Balance XLM como número (0 si no fondada o error) */
  xlmBalance: number
  /** Balance USDC como número; null si NO existe trustline o cuenta no fondada */
  usdcBalance: number | null
  /** true si la cuenta tiene trustline USDC */
  hasUsdcTrustline: boolean
  /** Cuenta no fondada (Horizon 404) */
  accountNotFunded: boolean
  loading: boolean
  refetch: () => void
}

function normalizeNetworkName(name: string | undefined): string {
  if (!name) return ""
  return name.toUpperCase().replace(/[^A-Z]/g, "")
}

function networksMatch(
  expected: ExpectedNetworkLabel,
  wallet: { network: string; networkPassphrase: string } | null
): boolean | null {
  if (!wallet) return null
  const exp = normalizeNetworkName(expected)
  const got = normalizeNetworkName(wallet.network)
  if (exp === got) return true
  // Aliases comunes: Mainnet ↔ PUBLIC
  if (exp === "MAINNET" && got === "PUBLIC") return true
  // El passphrase también funciona como fuente de verdad
  const pass = wallet.networkPassphrase || ""
  if (exp === "TESTNET" && pass.includes("Test SDF")) return true
  if (exp === "FUTURENET" && pass.includes("Future")) return true
  if (exp === "MAINNET" && pass.includes("Public Global")) return true
  return false
}

export function useWalletStatus(): WalletStatus {
  const { address, isConnected, networkLabel, getWalletNetwork } =
    useStellarWalletKit()
  const [balances, setBalances] = useState<AccountBalances | null>(null)
  const [walletNetwork, setWalletNetwork] = useState<
    { network: string; networkPassphrase: string } | null
  >(null)
  const [loading, setLoading] = useState(false)
  const [accountNotFunded, setAccountNotFunded] = useState(false)
  const [nonce, setNonce] = useState(0)

  const refetch = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    if (!address) {
      setBalances(null)
      setWalletNetwork(null)
      setAccountNotFunded(false)
      return
    }
    let cancelled = false
    setLoading(true)
    Promise.all([getAccountBalances(address), getWalletNetwork()])
      .then(([b, net]) => {
        if (cancelled) return
        setBalances(b)
        setWalletNetwork(net)
        // Si la cuenta no está fundada, getAccountBalances devuelve xlm "0" y usdc null;
        // no podemos distinguir 100% sin pegarle a Horizon de nuevo, pero un xlm=0 y usdc=null
        // suele indicar cuenta no fundada (asumimos eso para mostrar mensaje útil).
        const xlmNum = Number(b.xlm)
        setAccountNotFunded(xlmNum === 0 && b.usdc === null)
      })
      .catch(() => {
        if (!cancelled) {
          setBalances({ xlm: "0", usdc: null })
          setAccountNotFunded(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [address, getWalletNetwork, nonce])

  useEffect(() => {
    const onFocus = () => refetch()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refetch])

  return useMemo<WalletStatus>(() => {
    const xlm = balances ? Number(balances.xlm) : 0
    const usdcStr = balances?.usdc ?? null
    const usdcBalance = usdcStr != null ? Number(usdcStr) : null
    const hasUsdcTrustline = usdcStr != null
    return {
      address,
      isConnected,
      expectedNetworkLabel: networkLabel,
      walletNetwork,
      isOnExpectedNetwork: networksMatch(networkLabel, walletNetwork),
      xlmBalance: Number.isFinite(xlm) ? xlm : 0,
      usdcBalance:
        usdcBalance != null && Number.isFinite(usdcBalance) ? usdcBalance : null,
      hasUsdcTrustline,
      accountNotFunded,
      loading,
      refetch,
    }
  }, [
    address,
    isConnected,
    networkLabel,
    walletNetwork,
    balances,
    accountNotFunded,
    loading,
    refetch,
  ])
}
