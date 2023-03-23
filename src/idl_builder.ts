import { IDL } from "@dfinity/candid";

class IdlBuilder {
    private data: any;
    private types: Record<string, IDL.ConstructType>

    private fill: any[];

    constructor(data: any) {
        this.data = data;
        this.types = {};
        this.fill = [];
    }

    public build_idl() {
        for (let name of Object.keys(this.data.types)) {
            this.get_type(IDL, name);
        }

        for (let item of this.fill) {
            item();
        }

        let idl = this.get_service(IDL, this.data.actor.Service);

        return idl;
    }

    get_service(IDL:any, data: any): IDL.ConstructType {
        let func = {};

        for (let [name, type] of Object.entries(data)) {
            let idl = this.get_idl(IDL, type);
            func[name] = idl;
        }

        let idl = IDL.Service(func);

        return idl;
    }

    get_type(IDL:any, name: string): IDL.ConstructType {
        if (this.types[name] !== undefined) return this.types[name];

        // console.log("Decoding type:", name);

        if (this.data.types[name] !== undefined) {
            let type = this.data.types[name];
            let idl = this.get_idl(IDL, type);

            this.types[name] = idl;

            return idl;
        }

        return null;
    }

    get_idls(IDL: any, data: any[]): any[] {
        let res = [];

        for (let i of data) {
            res.push(this.get_idl(IDL, i));
        }

        return res;
    }

    get_idl(IDL: any, data: any): any {
        let idl = null;
    
        if (data === null) {
            idl = IDL.Null;
        } else if (data.Record !== undefined) {
            idl = this.get_record(IDL, data.Record);
        } else if (data.Func !== undefined) {
            let args = this.get_idls(IDL, data.Func.args);
            let rets = this.get_idls(IDL, data.Func.rets);
            let modes = data.Func.modes;

            idl = IDL.Func(args, rets, modes);
        } else if (data.Vec !== undefined) {
            idl = IDL.Vec(this.get_idl(IDL, data.Vec));
        } else if (data.Variant !== undefined) {
            idl = this.get_variant(IDL, data.Variant);
        } else if (data.Opt !== undefined) {
            idl = IDL.Opt(this.get_idl(IDL, data.Opt));
        } else if (data.Var !== undefined) {
            if (this.types[data.Var] !== undefined) {
                idl = this.types[data.Var];
            } else {
                let temp = IDL.Rec();
                idl = temp;

                this.fill.push(
                    () => {
                        temp.fill(this.get_type(IDL, data.Var));
                    }
                )
            }

            // idl = this.get_type(data.Var);
        } else if (typeof data === 'string' || data instanceof String) {
    
            switch (data) {
                case 'nat': idl = IDL.Nat;
                    break;
                case 'nat8': idl = IDL.Nat8;
                    break;
                case 'nat32': idl = IDL.Nat32;
                    break;
                case 'nat64': idl = IDL.Nat64;
                    break;
                case 'text': idl = IDL.Text;
                    break;
                case 'principal': idl = IDL.Principal;
                    break;
                default:
                    debugger;
            }
        } else {
            debugger;
        }
    
    
    
        return idl;
    }
    
    get_variant(IDL: any, data: any): any {
        let variants = {};
        for (let [name, type] of Object.entries(data)) {
            let idl = this.get_idl(IDL, type);
            variants[name] = idl;
        }
    
        return IDL.Variant(variants);
    }
    
    get_record(IDL: any, data: any): any {
        let item = {};
    
        for (let [field, ty] of Object.entries(data)) {
            let idl = this.get_idl(IDL, ty);
    
            item[field] = idl;
        }
    
        return IDL.Record(item);
    }
}

export function build_idl(json_candid: any): IDL.ConstructType<any> {
    let builder = new IdlBuilder(json_candid);
    return builder.build_idl();
}
