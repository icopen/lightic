import { blsVerify, fromHex, toHex } from '@dfinity/agent'
import { concat } from '@dfinity/candid'

import { CTX } from '../miracl/javascript/index.js'
import { bls_sign } from './wasm_tools/pkg/wasm_tools.js'
import { bls_init } from './wasm_tools/pkg/wasm_tools.js'

export const DER_PREFIX = fromHex(
    '308182301d060d2b0601040182dc7c0503010201060c2b0601040182dc7c05030201036100'
)

export class Bls {
    // sec: bls.SecretKey
    // pub: bls.PublicKey

    // publicKey: Uint8Array
    derPublicKey: Buffer

    ctx: any
    // private key
    S: any
    // public key
    W: any[]

    publicKey: Uint8Array

    async init() {
        //miracl embedded in wasm
        bls_init()

        //miracl/core
        this.ctx = new CTX("BLS12381");
        this.ctx.ECP.ALLOW_ALT_COMPRESS = true
        const RAW: number[] = []

        const rng = new this.ctx.RAND();

        rng.clean();
        for (let i = 0; i < 100; i++) RAW[i] = i;

        rng.seed(100, RAW);

        const IKM: any[] = [];
        for (let i = 0; i < 32; i++)
            //IKM[i]=i+1;
            IKM[i] = rng.getByte();

        if (this.ctx.BLS.init() !== 0) {
            throw new Error('Cannot initialize BLS')
        }

        this.W = []
        this.S = []

        const res = this.ctx.BLS.KeyPairGenerate(IKM, this.S, this.W);
        if (res != 0) {
            console.log("Failed to Generate Keys");
            return;
        }

        console.log("Private key : 0x" + this.ctx.BLS.bytestostring(this.S));
        console.log("Public  key : 0x" + this.ctx.BLS.bytestostring(this.W));

        this.publicKey = new Uint8Array(this.W)
        // //bls-wasm
        // await bls.init(bls.BLS12_381)

        // this.sec = new bls.SecretKey()
        // this.sec.setByCSPRNG()


        // this.sec = bls.deserializeHexStrToSecretKey('b47bc23b17713c2f5eca2682c9a20abb2ba3a565682cd3d1277f4b828c7ce04f')

        // this.sec.dump('secretKey ')

        // this.pub = this.sec.getPublicKey()
        // this.pub.dump('publicKey ')

        // this.publicKey = this.pub.serialize()

        const tmp = new Uint8Array(DER_PREFIX.byteLength + 96)
        tmp.set(Buffer.from(DER_PREFIX), 0)
        tmp.set(this.W, DER_PREFIX.byteLength)

        this.derPublicKey = Buffer.from(tmp)
    }


    domain_sep(s: string): ArrayBuffer {
        const len = new Uint8Array([s.length]);
        const str = new TextEncoder().encode(s);
        return concat(len, str);
    }

    // sign(msg: ArrayBuffer): ArrayBuffer {
    //     return this.sec.sign(msg)
    // }

    async sign(msg: ArrayBuffer): Promise<ArrayBuffer> {
        const message = new Uint8Array(msg)
        const SIG: any[]=[];

        // this.ctx.BLS.core_sign(SIG,message, this.S);
        // console.log("Signature : 0x"+this.ctx.BLS.bytestostring(SIG) );
    
        // let res=this.ctx.BLS.core_verify(SIG,message,this.W);
    
        // if (res==0)
        //     console.log("Signature is OK" );
        // else
        //     console.log("Signature is *NOT* OK"  );

        // let verify2 = await blsVerify(this.W, new Uint8Array(SIG), message)
        // console.log("verified 2 " + verify2)


        // return new Uint8Array(SIG)

        // let pkHex = 'a7623a93cdb56c4d23d99c14216afaab3dfd6d4f9eb3db23d038280b6d5cb2caaee2a19dd92c9df7001dede23bf036bc0f33982dfb41e8fa9b8e96b5dc3e83d55ca4dd146c7eb2e8b6859cb5a5db815db86810b8d12cee1588b5dbf34a4dc9a5'
        // let sigHex = 'b89e13a212c830586eaa9ad53946cd968718ebecc27eda849d9232673dcd4f440e8b5df39bf14a88048c15e16cbcaabe'

        // let pk = new Uint8Array(fromHex(pkHex))
        // let sig = new Uint8Array(fromHex(sigHex))
        // message = new TextEncoder().encode('hello')

        // console.log('pk '+pk.length)
        // console.log('sig '+sig.length)

        // let sig = this.sec.sign(message)
        // sig.dump('signature ')

        // let priv = this.sec.serialize()
        // let privateKey = this.ctx.BLS.stringtobytes(toHex(this.sec.serialize()))

        // let sig = bls_sign(message, this.S)


        // console.log('signature '+toHex(new Uint8Array(SIG)))
        // let pk = this.W

        const sigResult = this.ctx.BLS.core_sign(SIG, message, this.S)
        const sig = new Uint8Array(SIG)

        // let verify1 = this.ctx.BLS.core_verify(sig, message, pk)
        // console.log("verified 1 " + verify1)

        // let verify = this.pub.verify(sig, message)
        // console.log("verified 1 " + verify)

        // let verify2 = await blsVerify(pk, sig, message)

        // let verify2 = await blsVerify(this.pub.serialize(), new Uint8Array(SIG), message)
        // console.log("verified 2 " + verify2)

        // return sig.serialize()

        return sig
    }
}