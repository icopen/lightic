import { type IDL } from '@dfinity/candid'

export class IdlResult {
  idl: IDL.ServiceClass
  init_args?: IDL.ConstructType[]

  constructor (idl: IDL.ServiceClass, initArgs?: IDL.ConstructType[]) {
    this.idl = idl
    this.init_args = initArgs
  }
}

class IdlBuilder {
  private readonly data: any
  private types: Record<string, IDL.ConstructType>

  private readonly fill: any[]

  constructor (data: any) {
    this.data = data
    this.types = {}
    this.fill = []
  }

  public build_idl (IDL: any): IdlResult {
    for (const name of Object.keys(this.data.types)) {
      this.get_type(IDL, name)
    }

    for (const item of this.fill) {
      item()
    }

    const idl = this.get_idl(IDL, this.data.actor.Spec) as IDL.ServiceClass

    let init: IDL.ConstructType[] | undefined
    if (this.data.actor.Init !== undefined) {
      init = this.get_idls(IDL, this.data.actor.Init)
    }

    return new IdlResult(idl, init)
  }

  get_service (IDL: any, data: any): IDL.ServiceClass {
    const func = {}

    for (const [name, type] of Object.entries(data)) {
      const idl = this.get_idl(IDL, type)
      func[name] = idl
    }

    const idl = IDL.Service(func)

    return idl
  }

  get_type (IDL: any, name: string): IDL.ConstructType | null {
    if (this.types[name] !== undefined) return this.types[name]

    // console.log("Decoding type:", name);

    if (this.data.types[name] !== undefined) {
      const type = this.data.types[name]
      const idl = this.get_idl(IDL, type)

      this.types[name] = idl

      return idl
    }

    return null
  }

  get_idls (IDL: any, data: any[]): IDL.ConstructType[] {
    const res: IDL.ConstructType[] = []

    for (const i of data) {
      res.push(this.get_idl(IDL, i))
    }

    return res
  }

  get_idl (IDL: any, data: any): IDL.ConstructType {
    let idl: any = null

    if (data === null) {
      idl = IDL.Null
    } else if (data.Record !== undefined) {
      idl = this.get_record(IDL, data.Record)
    } else if (data.Tuple !== undefined) {
      idl = this.get_tuple(IDL, data.Tuple)
    } else if (data.Func !== undefined) {
      const args = this.get_idls(IDL, data.Func.args)
      const rets = this.get_idls(IDL, data.Func.rets)
      const modes = data.Func.modes.map((x: string) => x.toLowerCase())

      idl = IDL.Func(args, rets, modes)
    } else if (data.Vec !== undefined) {
      idl = IDL.Vec(this.get_idl(IDL, data.Vec))
    } else if (data.Variant !== undefined) {
      idl = this.get_variant(IDL, data.Variant)
    } else if (data.Opt !== undefined) {
      idl = IDL.Opt(this.get_idl(IDL, data.Opt))
    } else if (data.Var !== undefined) {
      if (this.types[data.Var] !== undefined) {
        idl = this.types[data.Var]
      } else {
        const temp = IDL.Rec()
        idl = temp

        this.fill.push(() => {
          temp.fill(this.get_type(IDL, data.Var))
        })
      }

      // idl = this.get_type(data.Var);
    } else if (data.Service !== undefined) {
      idl = this.get_service(IDL, data.Service)
    } else if (typeof data === 'string' || data instanceof String) {
      switch (data) {
        case 'nat':
          idl = IDL.Nat
          break
        case 'nat8':
          idl = IDL.Nat8
          break
        case 'nat32':
          idl = IDL.Nat32
          break
        case 'nat64':
          idl = IDL.Nat64
          break
        case 'text':
          idl = IDL.Text
          break
        case 'principal':
          idl = IDL.Principal
          break
        case 'int':
          idl = IDL.Int
          break
        default:
          break
      }
    }

    return idl
  }

  get_variant (IDL: any, data: any): any {
    const variants = {}
    for (const [name, type] of Object.entries(data)) {
      const idl = this.get_idl(IDL, type)
      variants[name] = idl
    }

    return IDL.Variant(variants)
  }

  get_record (IDL: any, data: any): any {
    const item = {}

    for (const [field, ty] of Object.entries(data)) {
      const idl = this.get_idl(IDL, ty)

      item[field] = idl
    }

    return IDL.Record(item)
  }

  // IDL.Tuple(IDL.Text, Tokens),
  get_tuple (IDL: any, data: any): any {
    const items = this.get_idls(IDL, data)
    return IDL.Tuple(...items)
  }
}

export function buildIdl (IDL: any, jsonCandid: any): IdlResult {
  const builder = new IdlBuilder(jsonCandid)
  return builder.build_idl(IDL)
}
