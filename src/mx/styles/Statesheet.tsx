import {AttributeSet} from "./Style";

export type Statesheet = {
    [attr: string]: any

    enabled?: any
    disabled?: any
    pressed?: any
    hovered?: any
    focused?: any
}

export namespace Statesheet {
    export function normalize(statesheet: Statesheet) {
        let stack = [{_: statesheet} as AttributeSet]
        let v: AttributeSet[] = []

        while (stack.length > 0) {
            let c = stack.pop() as AttributeSet
            let cName = Object.keys(c)[0]
            let cBody = c[cName]

            if (!v.includes(c)) {
                v.push(c)

                for (let attr in cBody) {
                    let obj: AttributeSet = {}

                    if (typeof cBody[attr] === "object") {
                        obj[`${cName === "_" ? "" : `${cName}$`}${attr}`] = cBody [attr]
                        stack.push(obj)

                        delete cBody[attr]
                    }
                }
            }
        }

        const i = v.findIndex((it) => Object.keys(it)[0] === "_")
        delete v[i]

        return Object.assign({}, ...v)
    }

    export function isNormalized() {

    }
}