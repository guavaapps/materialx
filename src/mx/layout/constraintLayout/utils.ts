import {Simulate} from "react-dom/test-utils";
import copy = Simulate.copy;
import {Helper} from "./Helper";

export class Arrays {
    static copy<T> (array: T[], newSize: number, fill: any = null) {
        if (newSize <= array.length) {
            return [...array].slice(newSize)
        }

        return new Array<T | typeof fill>(newSize).map((_, i) => i < array.length ? array[i] : fill)
    }

    static remove<T> (array: T[], value: T | T[]) {
        let v= Array.isArray(value) ? value : [value]

        array.filter((it) => !v.includes (it))
    }

    private test () {

        let arr = [0, 1]
        Arrays.copy(arr, 0, null)
    }
}

export class MathUtils {
    static toRadians (deg: number) {
        return deg * (Math.PI / 180)
    }
}

export function Deref<T extends object> (ref: WeakRef<T>) {
    const obj = ref.deref()

    return obj === undefined ? null : obj
}

export class Interfaces {
    static instanceOfHelper (obj: any) {
        const helperAttrs = ["updateConstraints", "add", "removeAllIds"]
        const attrs = Object.keys(obj)

        for (let attr of helperAttrs) {
            if (!attr.includes(attr)) {
                return false
            }
        }

        return true
    }
}