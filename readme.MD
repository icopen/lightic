# Project Description - Light Replica

Ethereum and other EVM chains benefit from frameworks such as truffle or hardhat. They enable easy and fast creation, testing and deployment of solutions to EVM based chains. Their strength lies in usage of JS scripts to do everything: setup local node, make tests, make deployments and more.
“Light Replica” is a project to startup creation of similar tool for the Internet Computer ecosystem. It will be composed from two elements:

Light Node - it is a local node designed for development (fast startup and cleanup), it will replicate behavior of the real node with additional logging and functions to help testing. It will be able to run and interact with any IC compatible wasm file.
Light Runner/Cli - a set of libraries written in JS (available in npm) that can be used in node.js environment to create and build projects, write tests, create deployments and arbitrary scripts that have access to project “context” right from the js code.

Both tools are aimed at developers. To help them efficiently develop, test and deploy canisters to the IC.


The replica mock is run directly in node.js environment (also works with all browsers that support WASM) and enables you to deploy and test and wasm file that is compatible with Internet Computer reference

It can also be used as a local development replica (started by dfx start) replacement

# How to start using, examples

```
npm i lightic
```

First you need to choose the js testing framework of your preference, it could be: mocha, jest, vitest or any other.

For the mocha, you can check the examples in the folder tests

## Mocha tests setup

```
npm i     @types/mocha @types/node typescript mocha chai ts-node
```

And create .mochars.json with content

```JSON
// This config file contains Mocha's defaults.
// This same configuration could be provided in the `mocha` property of your
// project's `package.json`.
{
    "diff": true,
    "extension": ["js", "cjs", "mjs", "ts"],
    "package": "./package.json",
    "reporter": "spec",
    "slow": "75",
    "timeout": "2000",
    "ui": "bdd",
    "watch-files": ["lib/**/*.js", "test/**/*.ts"],
    "watch-ignore": ["lib/vendor"],
    "loader": "ts-node/esm"
  }
```

## Simple test

In order to actually test your canister, you need to add to your test file

```TS
import { TestContext, u64IntoPrincipalId } from 'lightic'

const context = new TestContext()
This will create a context to run tests, it is a harness that gives you a possibility to install and run canisters

const canister = await context.deploy('./dfx/local/canisters/example/example.wasm')
const caller = u64IntoPrincipalId(0n)
const actor = Actor.createActor(canister.getIdlBuilder(), {
  agent: context.getAgent(caller),
  canisterId: canister.get_id()
})

```

1. As you can see this works with a wasm file, so you need to first compile the project using dfx.
```
dfx canister build $CANISTER_NAME
```

In the future the test harness will also take care of compilation.

2. You also need to specify the identity principle (who is calling the canisters) and create an actor. There is a helper function `u64IntoPrincipalId` that creates a Principle based on supplied number, so you do not need to come up with fake principals. The created principal is not random.

3. Then you get an actor, which is the same type as regular dfinity actor. In this example the actual actor class from @dfinity package is used

4. In order to call canister:

```TS
const result = await actor.test_caller()
```

Replace `test_caller()` with a function from you canister



## How to deploy Ledger canister in one step

Lightic comes with builtin `LedgerHelper` that can download and deploy ledger canister. In order to start using ledger:

```
  const minter = u64IntoPrincipalId(0n);
  const owner = u64IntoPrincipalId(1n);
  const ledgerCanister = await LedgerHelper.defaults(context, minter, owner)
```

Now you can call ledger both from agent and from other deployed canisters. If possible this will deploy ledger with the same principal as it is found in IC `ryjl3-tyaaa-aaaaa-aaaba-cai`


Next call account_balance to check if the owner, has some ICP in its account

```
  const balance = await ledgerCanister.balanceOf(minter)
```

If you need an account number from your principal there is a helper function `getAccount` the will do just that


## How to unit test your canisters


You can find examples of lightic used for testing canisters here: [https://github.com/icopen/evm_utils_ic/blob/master/__tests__/_common.mjs]. More examples to come.

## HTTP Replica Endpoint
It is possible to launch lightic in a standalone mode and call it from DFX or any other script that can work with DFX or mainnet. In order to do so:

```
    npx lightic --p port
```

Where port is the desired TCP port on which the lightic should listen.

# Building

Most of the project was written in Type Script. 


## Candid Util

Util that can parse Candid compliant data and output it as a JSON formatted string

```
cd candid_util
wasm-pack build --target nodejs
```


## Specification test canister

Canister that uses some of the most common features of the IC, used for testing the mock replica

```
cd spec_test
cargo build --release --target wasm32-unknown-unknown
```


## Whole Package

```
yarn prePublish
```


# What is Implemented

## IC0 Implementation
Below is a list of IC0 functions exposed to WASM module on IC environment. Not all calls will be implemented as part of this project.

- [x] - msg_arg_data_size
- [x] - msg_arg_data_copy
- [x] - msg_caller_size
- [x] - msg_caller_copy
- [x] - msg_reject_code
- [x] - msg_reject_msg_size
- [x] - msg_reject_msg_copy
- [x] - msg_reply_data_append
- [x] - msg_reply
- [x] - msg_reject
- [ ] - msg_cycles_available
- [ ] - msg_cycles_available128
- [ ] - msg_cycles_refunded
- [ ] - msg_cycles_refunded128
- [x] - msg_cycles_accept
- [ ] - msg_cycles_accept128
- [x] - canister_self_size
- [x] - canister_self_copy
- [x] - canister_cycle_balance
- [ ] - canister_cycle_balance128
- [ ] - canister_status
- [ ] - canister_version
- [ ] - msg_method_name_size
- [ ] - msg_method_name_copy
- [ ] - accept_message
- [x] - call_new
- [ ] - call_on_cleanup
- [x] - call_data_append
- [x] - call_cycles_add
- [ ] - call_cycles_add128
- [x] - call_perform
- [x] - stable_size
- [x] - stable_grow
- [x] - stable_write
- [x] - stable_read
- [x] - stable64_size
- [ ] - stable64_grow
- [ ] - stable64_write
- [ ] - stable64_read
- [x] - certified_data_set
- [ ] - data_certificate_present
- [ ] - data_certificate_size
- [ ] - data_certificate_copy
- [x] - time
- [x] - global_timer_set
- [x] - performance_counter
- [x] - debug_print
- [x] - trap

## Not documented but still relevant
- [x] - mint_cycles

## Management canister functions
- [x] - create_canister
- [ ] - update_settings
- [x] - install_code
- [ ] - uninstall_code
- [ ] - canister_status
- [ ] - stop_canister
- [ ] - start_canisters
- [ ] - delete_canister
- [ ] - deposit_cycles
- [x] - raw_rand
- [ ] - ecdsa_public_key
- [ ] - sign_with_ecdsa
- [ ] - http_request
- [x] - provisional_create_canister_with_cycles
- [ ] - provisional_top_up_canister

# TODO
- [x] - Candid utils WASM-WASI module
- [x] - WASM Module Loading
- [x] - Assignment of Canister ID upon canister creation
- [x] - Support for canister provided Candid Specs
- [x] - Mocha/Jest integration
- [x] - Canister Memory Rollback
- [x] - Update call support
- [x] - Stable Memory support
- [x] - BLS Signatures
- [x] - HTTP Server Implementation
- [x] - npmjs package with helpers and runners


# Further work
- [ ] - Compatibility and cooperation with dfx
- [ ] - Backup of wasm memory (normal and stable) for faster development cycles
- [ ] - Log of all calls
- [ ] - Support for other environments: local/dfx, production
- [ ] - Cycles usage counting per every call
- [ ] - Mocking of messages (ingress, egress and xnet)
- [ ] - Support for canister upgrades (preupgrade and postupgrade)
- [ ] - Limit cycle usage on calls
- [ ] - Limit message size to subnet settings, allow for different subnet settings
- [ ] - Support for multiple subnets
- [ ] - Full compliance ic-ref-test [https://github.com/dfinity/ic-hs#ic-ref-test-an-acceptance-test-suite]
