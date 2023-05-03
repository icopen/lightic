
use wasm_bindgen::prelude::*;

use miracl_core_bls12381::*;

// #[wasm_bindgen]
// pub fn bls_init() -> isize {
//     bls12381::bls::init()
// }

// #[wasm_bindgen]
// pub fn bls_get_key_pair() {
//     // let mut raw: [u8; 100] = [0; 100];

//     // let mut rng = RAND::new();
//     // rng.clean();
//     // for i in 0..100 {
//     //     raw[i] = i as u8
//     // }

//     // rng.seed(100, &raw);


//     const BFS: usize = bls12381::bls::BFS;
//     const BGS: usize = bls12381::bls::BGS;

//     const G1S: usize = BFS + 1; /* Group 1 Size  - compressed */
//     const G2S: usize = 2 * BFS +1 ; /* Group 2 Size  - compressed */

//     let mut s: [u8; BGS] = [0; BGS];
//     let mut w: [u8; G2S] = [0; G2S];
//     // let mut sig: [u8; G1S] = [0; G1S];
//     let mut ikm: [u8; 32] = [0; 32];

//     // for i in 0..32 {
//     //     //ikm[i] = (i+1) as u8;
//     //     ikm[i]=rng.getbyte();
//     // }

//     bls12381::bls::key_pair_generate(&ikm, &mut s, &mut w);
// }

#[wasm_bindgen]
pub fn bls_sign(m: &[u8], s: &[u8]) -> Vec<u8> {
    let mut sig: [u8; 48] = [0; 48];

    bls12381::bls::core_sign(& mut sig, m, s);
    
    sig.to_vec()
}   

// #[wasm_bindgen]
// pub fn bls_verify(sig: &[u8], m: &[u8], s: &[u8]) -> isize {
//     bls12381::bls::core_verify(sig, m, s)
// }

#[cfg(test)]
mod tests {
    use miracl_core_bls12381::bls12381;

    #[test]
    fn bls_verify() {
        use hex_literal::hex;
        use bls12381::bls::{core_verify, init, BLS_FAIL, BLS_OK};
        let pk = hex!("a7623a93cdb56c4d23d99c14216afaab3dfd6d4f9eb3db23d038280b6d5cb2caaee2a19dd92c9df7001dede23bf036bc0f33982dfb41e8fa9b8e96b5dc3e83d55ca4dd146c7eb2e8b6859cb5a5db815db86810b8d12cee1588b5dbf34a4dc9a5");
        let sig = hex!("b89e13a212c830586eaa9ad53946cd968718ebecc27eda849d9232673dcd4f440e8b5df39bf14a88048c15e16cbcaabe");
        assert_eq!(init(), BLS_OK);
        assert_eq!(core_verify(&sig, b"hello".as_ref(), &pk), BLS_OK);
        assert_eq!(core_verify(&sig, b"hallo".as_ref(), &pk), BLS_FAIL);
    }
}

