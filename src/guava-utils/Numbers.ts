

export namespace Numbers {
    export function inRange (value: number, min: number, max: number) {
        return Math.max(value, Math.min(value, max))
    }
}