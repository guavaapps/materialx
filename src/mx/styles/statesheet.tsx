import {Attr, AttrMap} from "../style";
import {State} from "../state";

export abstract class Statesheet {
    [attr: string]: any

    enabled?: any
    disabled?: any
    pressed?: any
    hovered?: any
    focused?: any

    // ky

    static is(statesheet: Statesheet) {
        return typeof statesheet === "object" && Object.keys(statesheet).some((v) => ["enabled", "disabled", "pressed", "hovered", "focused"].includes(v))
    }

    static empty(withStates: string[] = []): Statesheet {
        let states = {
            enabled: {},
            disabled: {},
            pressed: {},
            hovered: {},
            focused: {}
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