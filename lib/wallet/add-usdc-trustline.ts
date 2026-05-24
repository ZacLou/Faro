"use client"

/**
 * Construye, firma y envía una operación ChangeTrust para añadir la trustline
 * USDC en la cuenta conectada. Permite habilitar el activo con un solo click
 * desde el wizard de onboarding, sin que el usuario tenga que ir a Freighter
 * (Manage Assets → Add Asset).
 */

import {
  Asset,
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk"

const USDC_ISSUER_TESTNET =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
// Emisor oficial de Circle en mainnet (referencia, por si se activa producción).
const USDC_ISSUER_MAINNET =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"

function getNetworkConfig(): {
  horizonUrl: string
  networkPassphrase: string
  issuer: string
} {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK
  if (network === "mainnet" || network === "pubnet") {
    return {
      horizonUrl: "https://horizon.stellar.org",
      networkPassphrase: Networks.PUBLIC,
      issuer: USDC_ISSUER_MAINNET,
    }
  }
  if (network === "futurenet") {
    return {
      horizonUrl: "https://horizon-futurenet.stellar.org",
      networkPassphrase: Networks.FUTURENET,
      issuer: USDC_ISSUER_TESTNET,
    }
  }
  return {
    horizonUrl: "https://horizon-testnet.stellar.org",
    networkPassphrase: Networks.TESTNET,
    issuer: USDC_ISSUER_TESTNET,
  }
}

export async function addUsdcTrustline(
  address: string,
  signTransaction: (unsignedXdr: string) => Promise<{ signedTxXdr: string }>
): Promise<{ hash: string }> {
  const { horizonUrl, networkPassphrase, issuer } = getNetworkConfig()
  const server = new Horizon.Server(horizonUrl)
  const account = await server.loadAccount(address)
  const usdc = new Asset("USDC", issuer)
  const tx = new TransactionBuilder(account, {
    fee: "1000",
    networkPassphrase,
  })
    .addOperation(Operation.changeTrust({ asset: usdc }))
    .setTimeout(120)
    .build()

  const { signedTxXdr } = await signTransaction(tx.toXDR())
  const signedTx = TransactionBuilder.fromXDR(signedTxXdr, networkPassphrase)
  const result = await server.submitTransaction(signedTx)
  return { hash: result.hash }
}
