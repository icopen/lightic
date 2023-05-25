import { fromHex } from '@dfinity/agent'
import { concat } from '@dfinity/candid'

import { bls_sign, bls_init, bls_get_key_pair } from './wasm_tools/pkg/wasm_tools.js'

export const DER_PREFIX = fromHex(
    '308182301d060d2b0601040182dc7c0503010201060c2b0601040182dc7c05030201036100'
)

export class Bls {
    derPublicKey: Buffer

    // ctx: any
    // private key
    S: Uint8Array
    // public key
    publicKey: Uint8Array

    async init() {
        //miracl embedded in wasm
        bls_init()

        const keys = bls_get_key_pair()

        this.S = keys.slice(0,48)
        // this.W = keys.slice(48)

        this.publicKey = keys.slice(48)

        const tmp = new Uint8Array(DER_PREFIX.byteLength + 96)
        tmp.set(Buffer.from(DER_PREFIX), 0)
        tmp.set(this.publicKey, DER_PREFIX.byteLength)

        this.derPublicKey = Buffer.from(tmp)

        // await this.generateKey()
    }

    // async generateKey() {
    //     // //miracl/core
    //     this.ctx = new CTX("BLS12381");
    //     this.ctx.ECP.ALLOW_ALT_COMPRESS = true

    //     const RAW: number[] = []
    //     const rng = new this.ctx.RAND();

    //     rng.clean();
    //     for (let i = 0; i < 100; i++) RAW[i] = i;

    //     rng.seed(100, RAW);

    //     const IKM: any[] = [];
    //     for (let i = 0; i < 32; i++)
    //         //IKM[i]=i+1;
    //         IKM[i] = rng.getByte();

    //     if (this.ctx.BLS.init() !== 0) {
    //         throw new Error('Cannot initialize BLS')
    //     }

    //     this.W = []
    //     this.S = []

    //     const res = this.ctx.BLS.KeyPairGenerate(IKM, this.S, this.W);
    //     if (res != 0) {
    //         console.log("Failed to Generate Keys");
    //         return;
    //     }

    //     console.log("Private key : 0x" + this.ctx.BLS.bytestostring(this.S));
    //     console.log("Public  key : 0x" + this.ctx.BLS.bytestostring(this.W));

    //     this.publicKey = new Uint8Array(this.W)

    //     const tmp = new Uint8Array(DER_PREFIX.byteLength + 96)
    //     tmp.set(Buffer.from(DER_PREFIX), 0)
    //     tmp.set(this.W, DER_PREFIX.byteLength)

    //     this.derPublicKey = Buffer.from(tmp)
    // }


    domain_sep(s: string): ArrayBuffer {
        const len = new Uint8Array([s.length]);
        const str = new TextEncoder().encode(s);
        return concat(len, str);
    }

    async sign(msg: ArrayBuffer): Promise<ArrayBuffer> {
        const message = new Uint8Array(msg)
        // const SIG: any[]=[];

        // const sigResult = this.ctx.BLS.core_sign(SIG, message, this.S)
        // const sig = new Uint8Array(SIG)

        const sig = bls_sign(message, this.S)

        return sig
    }
}