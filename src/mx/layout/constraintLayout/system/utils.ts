import {isBooleanObject} from "util/types";
import {Simulate} from "react-dom/test-utils";
import copy = Simulate.copy;

export class Arrays {
    static copy<T>(array: T[], newSize: number, fill: T | null = null) {
        if (newSize <= array.length) {
            return [...array].slice(newSize) as T []
        }

        let r: (T | null)[] = []

        for (let i = 0; i < newSize; i++) {
            if (i < array.length) {
                r.push(array[i])
            } else {
                r.push(fill)
            }
        }

        console.log("[COPY] copied", r)

        return r
    }

    static copyNumbers(array: number[], newSize: number) {
        return this.copy(array, newSize, 0) as number[]
    }

    static remove<T>(array: T[], value: T | T[]) {
        let v = Array.isArray(value) ? value : [value]

        array.filter((it) => !v.includes(it))
    }

    static ofNumbers(length: number = 0, fill: number = 0) {
        return new Array<number>(length).fill(fill)
    }

    static ofType<T>(length: number = 0, fill: T | null | ((i: number) => T | null) = null) {
        if (typeof fill === "function") {
            return new Array<T | null>(length).map((_, index) => (fill as ((i: number) => T | null))(index))
        }

        let r = new Array<T | null>(length).fill(fill)

        return r
    }

    private test() {

        let arr = [0, 1]
        Arrays.copy(arr, 0, null)
    }
}

export class MathUtils {
    static toRadians(deg: number) {
        return deg * (Math.PI / 180)
    }
}

export function Deref<T extends object>(ref: WeakRef<T>) {
    const obj = ref.deref()

    return obj === undefined ? null : obj
}

export class Interfaces {
    static instanceOfHelper(obj: any) {
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