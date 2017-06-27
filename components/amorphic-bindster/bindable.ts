type Constructable<BC> = new (...args: any[]) => BC;


export function Bindable<BC extends Constructable<{}>>(Base: BC) {

    return class extends Base {

        bindster : any;

        // New names
        bindsterClearErrors(data?) : void {};
        bindsterIsError (propRef : any) : boolean {return false};
        bindsterHasErrors (data) : boolean {return false};
        bindsterIsPending (propRef : any) {return false};
        bindsterValidate (data? : any) {return false};
        bindsterRender (data? : any) : void {};
        bindsterSetError (objRef : any, propRef : any, error: any) : void {};
        bindsterGetErrorMessage (message) : string {return ""};
        bindsterClearError (objRef : any, propRef : any) : void {};
        bindsterRefresh (defer : any) : void {};
        bindsterAlert (msg) : void {};
        bindsterAttr (selector : any, attr : any, value: any) {};
        bindsterRule (rule : any, value: any) : void {};
        bindsterGetRules () : any {};
        bindsterSet(tags : any, value: any) {};
        bindsterBindSet (bind : any, value : any) : void {};
        bindsterBindGet (bind : any) : any {};
        bindsterGetTags (bindRef : any) : any {};
        bindsterSetIncludeURLSuffix (suffix: any) : void {};
        bindsterArrive (route : any) : void {};

        // Legacy
        value : any;
        clearErrors(data?) : void {};
        isError (propRef : any) : boolean {return false};
        hasErrors (data) : boolean {return false};
        isPending (propRef : any) {return false};
        validate (data? : any) {return false};
        render (data? : any) : void {};
        setError (objRef : any, propRef : any, error: any) : void {};
        getErrorMessage (message) : string {return ""};
        clearError (objRef : any, propRef : any) : void {};
        refresh (defer : any) : void {};
        alert (msg) : void {};
        attr (selector : any, attr : any, value: any) {};
        rule (rule : any, value: any) : void {};
        getRules () : any {};
        set(tags : any, value: any) {};
        bindSet (bind : any, value : any) : void {};
        bindGet (bind : any) : any {};
        getTags (bindRef : any) : any {};
        setIncludeURLSuffix (suffix: any) : void {};
        arrive (route : any) : void {};

    };
}
