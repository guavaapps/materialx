import {AttrMap} from "./style";

export abstract class Statesheet {
    [attr: string]: any

    enabled?: any
    disabled?: any
    pressed?: any
    hovered?: any
    focused?: any

    // ky

    static extractStates (style: AttrMap) {

    }

    static createComposite(statesheet: AttrMap): Statesheet {
        let stack = [{_: statesheet} as AttrMap]
        let v: AttrMap[] = []

        while (stack.length > 0) {
            let c = stack.pop() as AttrMap
            let cName = Object.keys(c)[0]
            let cBody = c[cName]

            if (!v.includes(c)) {
                v.push(c)

                for (let attr in cBody) {
                    let obj: AttrMap = {}

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

        // return Object
        //     // find props of given object
        //     .keys(statesheet)
        //     // return an object by iterating props
        //     .reduce((memo, prop) => Object.assign(
        //         // create a new object
        //         {},
        //         // include previously returned object
        //         memo,
        //         Object.prototype.toString.call(statesheet[prop]) === '[object Object]'
        //             // keep working if value is an object
        //             ? this.create2(statesheet[prop], roots.concat([prop]), sep)
        //             // include current prop and value and prefix prop with the roots
        //             : {[roots.concat([prop]).join(sep)]: statesheet[prop]}
        //     ), {})
    }

    static for (statesheet: Statesheet, ...states: string[]) {
        return statesheet[states.join("$")]
    }

    static create(...statesheets: [AttrMap]) {
        let baseState = statesheets.shift()

        statesheets.forEach((it) => {
            baseState = {
                ...baseState,
                ...it
            }
        })

        return baseState
    }

    static createFrom(state: string, statesheet: AttrMap) {
        const obj: AttrMap = {}

        obj[state] = statesheet[state]

        return obj
    }

    static is(statesheet: Statesheet) {
        return typeof statesheet === "object" && Object.keys(statesheet).some((v) => ["enabled", "disabled", "pressed", "hovered", "focused"].includes(v))
    }

    static empty(withStates: string[] = []): Statesheet {
        let states = {
            enabled: {},
            disabled: {},
            pressed: {},
            hovered: {},
            focused: {},
            // selected: {}
        }

        withStates.forEach((state) => {
            (states as AttrMap)[state] = {}
        })

        return states
    }

    static valueOf(val: any) {
        return {
            enabled: val,
            disabled: val,
            pressed: val,
            hovered: val,
            focused: val
        }
    }

    static wrap(statesheet: Statesheet) {
        const attrs: AttrMap = {}
        const states: AttrMap = {}

        Object.keys(statesheet).forEach((attr) => {
            const val = statesheet[attr]

            if (typeof val === "object") {
                states.attr = val
            } else {
                attrs.attr = val
            }
        })

        Object.keys(states).forEach((state) => {
            Object.assign(states[state], attrs)
        })

        return {...states}
    }
}