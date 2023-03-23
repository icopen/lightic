export enum CallType {
    Init = "I",
    PreUpgrade = "G",
    Update = "U",
    Query = "Q",
    ReplyCallback = "Ry",
    RejectCallback = "Rt",
    Cleanup = "C",
    Start = "s",
    InspectMessage = "F",
    SystemTask = "T"
}

export class CallContext {
    type: CallType;

    
}