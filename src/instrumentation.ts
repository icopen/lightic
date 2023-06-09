import fs from 'fs'
import debug from 'debug'
import { wasm_instrument } from './wasm_tools/pkg/wasm_tools'

const log = debug('lightic:instrumentation')

//Really simple cache, uses wasm module length as identifier
const moduleCache: Record<number, WebAssembly.Module>  = {}

export async function loadWasmFromFile (file: string): Promise<WebAssembly.Module> {
  const wasmBuffer = fs.readFileSync(file)

  log('Instrumenting WASM ' + file)
  const instrumented = wasm_instrument(wasmBuffer)
  log('Compiling WASM')
  const compiled = await WebAssembly.compile(instrumented)

  return compiled
}

export async function loadWasm(wasmBuffer: Buffer): Promise<WebAssembly.Module> {
  if (moduleCache[wasmBuffer.length] !== undefined) {
    return moduleCache[wasmBuffer.length]
  }

  log('Instrumenting WASM ')
  const instrumented = wasm_instrument(wasmBuffer)
  log('Compiling WASM')
  const compiled = await WebAssembly.compile(instrumented)

  moduleCache[wasmBuffer.length] = compiled

  return compiled
}