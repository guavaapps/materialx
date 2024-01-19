export class Log {
    static i(...args: any[]) {
        this.logTo(console.log, args)
    }

    static w(...args: any[]) {
        this.logTo(console.warn, args)
    }

    static d(...args: any[]) {
        this.logTo(console.debug, args)
    }

    static e(...args: any[]) {
        this.logTo(console.error, args)
    }

    private static logTo(stream: (...args: any[]) => void = console.log, ...args: any[]) {
        const staticCopies = args.map(it => {
            if (typeof it === "number"
            || typeof it === "boolean"
            || typeof it === "string") {
                return it
            }
            return JSON.parse(JSON.stringify(it))
        })

        console.log(staticCopies)
    }

    objects(tag: string, obj: object) {

    }
}