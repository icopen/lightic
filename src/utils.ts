import { AccountIdentifier, SubAccount } from '@dfinity/nns'
import { Principal } from '@dfinity/principal'

export function canisterIdIntoU64 (canisterId: Principal): bigint {
  const bytes = canisterId.toUint8Array().slice(0, 8)

  let num = 0n

  for (const byte of bytes) {
    num = num << 4n
    num += BigInt(byte)
  }

  return num
}

export function u64IntoCanisterId (num: bigint): Principal {
  const bytes = new Uint8Array(10)

  // todo: conversion of number to byte array

  bytes[7] = Number(num)
  bytes[8] = 1
  bytes[9] = 1

  return Principal.fromUint8Array(bytes)
}

// Convert a hex string to a byte array
export function hexToBytes (hex: string): number[] {
  const bytes: number[] = []
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16))
  }
  return bytes
}

export function getAccount (principal: Principal, no: number): AccountIdentifier {
  const subAccount = SubAccount.fromID(no)
  const accountIdentifier = AccountIdentifier.fromPrincipal({
    principal,
    subAccount
  })

  return accountIdentifier
}
