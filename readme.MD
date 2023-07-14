# Project Description - Light Replica

Ethereum and other EVM chains benefit from frameworks such as truffle or hardhat. They enable easy and fast creation, testing and deployment of solutions to EVM based chains. Their strength lies in usage of JS scripts to do everything: setup local node, make tests, make deployments and more.
“Light Replica” is a project to startup creation of similar tool for the Internet Computer ecosystem. It will be composed from two elements:

Light Node - it is a local node designed for development (fast startup and cleanup), it will replicate behavior of the real node with additional logging and functions to help testing. It will be able to run and interact with any IC compatible wasm file.
Light Runner/Cli - a set of libraries written in JS (available in npm) that can be used in node.js environment to create and build projects, write tests, create deployments and arbitrary scripts that have access to project “context” right from the js code.

Both tools are aimed at developers. To help them efficiently develop, test and deploy canisters to the IC.


The replica mock is run directly in node.js environment (also works with all browsers that support WASM) and enables you to deploy and test and wasm file that is compatible with Internet Computer reference

It can also be used as a local development replica (started by dfx start) replacement

# How to start using

```
npm i lightic
```


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


# How to

## How to view and debug inter-canister calls
## How to debug canister traps

## How to deploy Ledger canister in one step

## How to setup NNS

## How to unit test your canisters




# Examples
## Load canister and run actions against it

```
    context = new TestContext();
    let canister = context.deploy("target/wasm32-unknown-unknown/release/evm_utils.wasm")
    let actor = context.getAgent(Principal.anonymous()).getActor(canister);

    let result = await actor.hello();
```


## Load ledger canister

This snipped will download latest deployed version of ledger canister and deploy it to light ic

```
    const mintingPrincipal = Principal.fromText(principal)
    const invokingPrincipal = Principal.fromText(principal)

    const canister = await LedgerHelper.defaults(context, mintingPrincipal, invokingPrincipal)


    const actor = context.getAgent(Principal.anonymous()).getActor(canister.ledger)

    const result = await actor.account_balance({ account: invokingAccount.toUint8Array() }) as any
```

For complete example see `test/ledger.spec.ts`

## DFX Replica Replacement

```
    npx lightic --p port
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