import fs from 'fs'
import debug from 'debug'
import { wasm_instrument } from './wasm_tools/pkg/wasm_tools'

// import { wasm_instrument } from '../../../candid_util/pkg/candid_util'

const log = debug('lightic:instrumentation')

export async function loadWasm (file: string): Promise<WebAssembly.Module> {
  const wasmBuffer = fs.readFileSync(file)

  log('Instrumenting WASM ' + file)
  const instrumented = wasm_instrument(wasmBuffer)
  log('Compiling WASM')
  // const instrumented = await instrument(wasmBuffer)
  const compiled = await WebAssembly.compile(instrumented)

  return compiled
}
