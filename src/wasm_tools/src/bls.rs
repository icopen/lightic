use wasm_bindgen::prelude::*;

use miracl_core_bls12381::*;

#[wasm_bindgen]
pub fn bls_get_key_pair() -> Result<Vec<u8>, String> {
    const BFS: usize = bls12381::bls::BFS;
    const BGS: usize = bls12381::bls::BGS;

    const G1S: usize = BFS; /* Group 1 Size  - compressed */
    const G2S: usize = 2 * BFS; /* Group 2 Size  - compressed */

    let mut r: [u8; BGS + G2S] = [0; BGS + G2S];

    let (s, w) = r[..].split_at_mut(BGS);
    let mut ikm: [u8; 32] = [0; 32];

    getrandom::getrandom(&mut ikm).map_err(|e| format!("{e}"))?;

    bls12381::bls::key_pair_generate(&ikm, s, w);

    Ok(r.to_vec())
}

#[wasm_bindgen]
pub fn bls_sign(m: &[u8], s: &[u8]) -> Vec<u8> {
    let mut sig: [u8; 48] = [0; 48];

    bls12381::bls::core_sign(&mut sig, m, s);

    sig.to_vec()
}

#[cfg(test)]
mod tests {
    use std::error::Error;

    use super::*;
    use miracl_core_bls12381::bls12381;

    #[test]
    fn bls_verify() {
        use bls12381::bls::{core_verify, init, BLS_FAIL, BLS_OK};
        use hex_literal::hex;
        let pk = hex!("a7623a93cdb56c4d23d99c14216afaab3dfd6d4f9eb3db23d038280b6d5cb2caaee2a19dd92c9df7001dede23bf036bc0f33982dfb41e8fa9b8e96b5dc3e83d55ca4dd146c7eb2e8b6859cb5a5db815db86810b8d12cee1588b5dbf34a4dc9a5");
        let sig = hex!("b89e13a212c830586eaa9ad53946cd968718ebecc27eda849d9232673dcd4f440e8b5df39bf14a88048c15e16cbcaabe");
        assert_eq!(init(), BLS_OK);
        assert_eq!(core_verify(&sig, b"hello".as_ref(), &pk), BLS_OK);
        assert_eq!(core_verify(&sig, b"hallo".as_ref(), &pk), BLS_FAIL);
    }

    #[test]
    fn generate_keys() -> Result<(), Box<dyn Error>> {
        use bls12381::bls::{core_verify, init, BLS_OK};
        assert_eq!(init(), BLS_OK);

        let keys = bls_get_key_pair()?;

        let private = &keys[..48];
        let public = &keys[48..];

        let sig = bls_sign(b"hello".as_ref(), private);

        assert_eq!(core_verify(&sig, b"hello".as_ref(), public), BLS_OK);

        Ok(())
    }
}
