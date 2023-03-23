import { Principal } from "@dfinity/principal";

export function canister_id_into_u64(canister_id: Principal): BigInt {
    let bytes = canister_id.toUint8Array().slice(0, 8);

    let num = 0n;

    for (let byte of bytes) {
        num = num << 4n;
        num += BigInt(byte);
    }

    return num;
}

export function u64_into_canister_id(num: BigInt): Principal {
    let bytes = new Uint8Array(10);

    //todo: conversion of number to byte array

    bytes[7] = Number(num);
    bytes[8] = 1;
    bytes[9] = 1;

    return Principal.fromUint8Array(bytes);
}

// Convert a hex string to a byte array
export function hexToBytes(hex) {
    let bytes = [];
    for (let c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}