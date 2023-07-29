import { assert } from "chai";
import { u64IntoCanisterId, u64IntoPrincipalId } from "../src/utils";

describe('utils', function () {
    it('u64IntoPrincipalId' , async function () {
        const prin = u64IntoPrincipalId(1n);
        const printText = prin.toText();

        console.log(printText);

        assert.equal(printText, "qzox2-lqbaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aae");
        assert.equal(u64IntoPrincipalId(0n).toText(), "4vnki-cqaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-aae");
    });

    it('u64IntoCanisterId' , async function () {
        const prin = u64IntoCanisterId(0n);
        const printText = prin.toText();

        assert.equal(printText, "rwlgt-iiaaa-aaaaa-aaaaa-cai");
    }); 
});