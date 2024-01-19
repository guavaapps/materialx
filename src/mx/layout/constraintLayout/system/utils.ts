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

    static fold<T>(array: T[], initialValue: any, combine: (prev: any, element: T) => any) {
        const arr = [...array]

        let value = initialValue

        for (let element of arr) {
            value = combine(value, element)
        }

        return value
    }
}

type FixedArrayType<T> = "number" | "boolean" | "string" | "object" | "any" | { new(): T }

export function NumberArray(length: number, fill: number = 0) {
    const arr: number[] = []

    for (let i = 0; i < length; i++) {
        arr.push(fill)
    }

    return arr
}

export function BooleanArray(length: number, fill: boolean = false) {
    const arr: boolean[] = []

    for (let i = 0; i < length; i++) {
        arr.push(fill)
    }

    return arr
}

export function ObjectArray<T>(length: number, fill: T | null = null) {
    const arr: (T | null)[] = []

    for (let i = 0; i < length; i++) {
        arr.push(fill)
    }

    return arr
}

export function StringArray(length: number, fill: string = "") {
    const arr: string[] = []

    for (let i = 0; i < length; i++) {
        arr.push(fill)
    }

    return arr
}

export namespace NumberArray {
    export function resizeHead(array: number[], newSize: number, fill: number = 0) {
        return GuavaArrays.resizeHead(array, newSize, fill)
    }

    export function resizeTail(array: number[], newSize: number, fill: number = 0) {
        return GuavaArrays.resizeTail(array, newSize, fill)
    }
}

export namespace BooleanArray {
    export function resizeHead(array: boolean[], newSize: number, fill: boolean = false) {
        return GuavaArrays.resizeHead(array, newSize, fill)
    }

    export function resizeTail(array: boolean[], newSize: number, fill: boolean = false) {
        return GuavaArrays.resizeTail(array, newSize, fill)
    }
}

export class GuavaArrays {
    static copy<T>(array: T[]) {
        return [...array]
    }

    static resizeHead<T>(array: T[], newSize: number, fill: T) {
        if (newSize < array.length) {
            return [...array.slice(-newSize)]
        } else if (newSize > array.length) {
            const copy = this.copy(array)

            for (let i = 0; i < newSize - array.length; i++) {
                copy.unshift(fill)
            }

            return copy
        }

        return this.copy(array)
    }

    static resizeTail<T>(array: T[], newSize: number, fill: T) {
        if (newSize < array.length) {
            return [...array.slice(newSize)]
        } else if (newSize > array.length) {
            const copy = this.copy(array)

            for (let i = 0; i < newSize - array.length; i++) {
                copy.push(fill)
            }

            return copy
        }

        return this.copy(array)
    }
}

function test() {
    const arr = [new M(), null]
}

export class FixedArray<T> extends Array<T> {
    private type: "number" | "boolean" | "string" | "object" | "any" | "type"
    private array: unknown[] = []

    constructor(type: FixedArrayType<T>, ...args: (number | any | T)[]) {
        super()

        if (typeof type === "function") {
            this.type = "type"
        } else {
            this.type = type
        }

        let length
        let arr

        if (args.length === 1 && typeof args[0] === "number") {
            length = args[0] as number

            console.log("[FIXED_ARRAY] type", this.type)
            arr = new Array(length)
        } else {
            length = args.length
            arr = [...args]
        }

        if (this.type === "object" || this.type === "any") {

        }

        switch (this.type) {
            case "number":
                this.array = arr as number[]

                break
            case "boolean":
                break
            case "string":
                break
            case "object":
                break
            case "any":
                break
        }

        // const arr = new Array<T>()
    }

    private asType() {

    }

    t() {
    }
}

class M {
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