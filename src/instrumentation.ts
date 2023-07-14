import fs from 'fs'
import debug from 'debug'
import { wasm_instrument } from './wasm_tools/pkg/wasm_tools'
import { sha256 } from 'js-sha256';
import { WasmModule } from './canister';

const log = debug('lightic:instrumentation')

//Really simple cache, uses wasm module length as identifier
// const moduleCache: Record<number, WebAssembly.Module>  = {}
const moduleCache: Record<string, WasmModule>  = {}

function getCodeHash(code: Buffer) {
  const hash = sha256(code)
  return hash
}

export async function loadWasmFromFile (file: string): Promise<WasmModule> {
  const wasmBuffer = fs.readFileSync(file)
  return await loadWasm(wasmBuffer)
}

export async function loadWasm(wasmBuffer: Buffer): Promise<WasmModule> {
  const hash = getCodeHash(wasmBuffer)

  if (moduleCache[hash] !== undefined) {
    return moduleCache[hash]
  }

  log('Instrumenting WASM ')
  const instrumented = wasm_instrument(wasmBuffer)
  log('Compiling WASM')
  const compiled = await WebAssembly.compile(instrumented)

  const item: WasmModule = {  module: compiled, hash: hash }
  moduleCache[hash] = item

  return item
}