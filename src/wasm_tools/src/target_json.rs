use candid::{
    parser::types::FuncMode,
    types::{Field, Type},
    TypeEnv,
};

// The definition of tuple is language specific.
pub(crate) fn is_tuple(t: &Type) -> bool {
    match t {
        Type::Record(ref fs) => {
            if fs.is_empty() {
                return false;
            }
            for (i, field) in fs.iter().enumerate() {
                if field.id.get_id() != (i as u32) {
                    return false;
                }
            }
            true
        }
        _ => false,
    }
}

pub fn print_modes(mo: &Vec<FuncMode>) -> String {
    let mut str = String::new();
    str.push('[');

    let mut first = true;
    for p in mo {
        if !first {
            str.push(',');
        }
        first = false;

        str.push_str(&format!("\"{p:?}\""));
    }

    str.push(']');
    str
}

pub fn print_array(ty: &Vec<Type>) -> String {
    let mut str = String::new();

    str.push('[');

    let mut first = true;
    for p in ty {
        if !first {
            str.push(',');
        }
        first = false;

        str.push_str(&print_type(p));
    }

    str.push(']');

    str
}

pub fn print_type(ty: &Type) -> String {
    let mut str = String::new();

    match ty {
        Type::Null => str.push_str(&format!("{ty}")),
        Type::Bool
        | Type::Nat
        | Type::Int
        | Type::Nat8
        | Type::Nat16
        | Type::Nat32
        | Type::Nat64
        | Type::Int8
        | Type::Int16
        | Type::Int32
        | Type::Int64
        | Type::Float32
        | Type::Float64
        | Type::Text
        | Type::Principal => str.push_str(&format!("\"{ty}\"")),

        Type::Opt(s) => {
            str.push_str(&format!("{{ \"Opt\": {} }}", print_type(s)));
        }
        Type::Vec(s) => {
            str.push_str(&format!("{{ \"Vec\": {} }}", print_type(s)));
        }
        Type::Var(s) => {
            str.push_str(&format!("{{ \"Var\": \"{s}\" }}"));
        }
        Type::Record(r) => {
            if is_tuple(ty) {
                str.push_str("{ \"Tuple\":");
                // str.push_str(&print_array(r));
                str.push_str(&print_array(&r.iter().map(|f| f.ty.clone()).collect()));
                str.push('}');

                // str.push_str(&format!("{{ \"Tuple\": {} }}", print_fields(r)));
            } else {
                str.push_str(&format!("{{ \"Record\": {{ {} }} }}", print_fields(r)));
            }
        }
        Type::Variant(r) => {
            str.push_str(&format!("{{ \"Variant\": {{ {} }} }}", print_fields(r)));
        }
        Type::Service(s) => {
            str.push_str("{ \"Service\": {");
            let mut first = true;

            for p in s {
                if !first {
                    str.push(',');
                }
                first = false;
                str.push_str(&format!("\"{}\": {}", p.0, print_type(&p.1)));
            }

            str.push_str("}}");
        }
        Type::Func(f) => {
            str.push_str(&format!(
                "{{ \"Func\": {{ \"args\": {}, \"rets\": {}, \"modes\": {} }} }}",
                print_array(&f.args),
                print_array(&f.rets),
                print_modes(&f.modes)
            ));
        }
        Type::Empty | Type::Reserved | Type::Unknown => {}
        Type::Knot(f) => {
            str.push_str(&format!("{{ \"Knot\": {f} }}"));
        }
        Type::Class(_args, b) => {
            str.push_str("\"Init\": ");
            str.push_str(&print_array(_args));
            str.push_str(", \"Spec\": ");
            str.push_str(&print_type(b));

            // str.push_str(&format!("\"Not handled, {}\"", ty))
        } // _ => {
          //     str.push_str(&format!("\"Not handled, {}\"", ty))
          // }
    };

    str
}

pub fn print_fields(fields: &Vec<Field>) -> String {
    let mut str = String::new();
    let mut first = true;

    for f in fields {
        if !first {
            str.push(',');
        }
        first = false;

        str.push_str(&format!("\"{}\": {}", f.id, &print_type(&f.ty)));
    }

    str
}

pub fn compile(env: &TypeEnv, actor: &Option<Type>) -> String {
    let mut result = String::new();

    result.push_str("{ \"types\": {");
    let mut first = true;

    for i in env.0.iter() {
        if !first {
            result.push(',');
        }
        first = false;

        result.push_str(&format!("\"{}\": {}", i.0, &print_type(i.1)));

        // match i.1 {
        //     Type::Service(_) => {
        //         result.push_str( &format!("\"{}\": {{ {} }}", i.0, &print_type(i.1)));
        //     }
        //     _ => {
        //         result.push_str( &format!("\"{}\": {}", i.0, &print_type(i.1)));
        //     }
        // }
    }

    result.push_str("}, \"actor\": {");
    // result.push('}');

    match actor {
        None => {}
        Some(actor) => match actor {
            Type::Service(_) => {
                result.push_str(&format!("\"Spec\": {}", &print_type(actor)));
            }
            _ => {
                result.push_str(&print_type(actor));
            }
        },
    }

    result.push_str("}}");

    result
}
