class Procedure {
    private name: string

    private startTime: number = -1
    private endTime: number = -1

    private vars: Map<string, any> = new Map<string, any>()

    private logs: string[] = []
    private logTimestamps: number[] = []

    constructor(name: string) {
        this.name = name
    }

    start() {
        this.startTime = Date.now()
    }

    log(...args: string[]) {
        const log = this.formatLog(args)
        this.logs.push(log)
        this.logTimestamps.push(Date.now())
    }

    end() {
        this.endTime = Date.now()
    }

    set(name: string, value: any) {
        this.vars.set(name, value)
    }

    changeBy(name: string, by: number) {
        const variable = this.vars.get(name)

        if (variable && typeof variable === "number") {
            const newVar = variable + by

            this.set(name, newVar)
        }
    }

    inc(name: string, by: number = 1) {
        this.changeBy(name, by)
    }

    dec(name: string, by: number = 1) {
        this.changeBy(name, -by)
    }


    toString (showTag = true, showTimestamps = false, showDurations = false, showVars = true, showLogs = true) {
        const all = this.format(showTag, showTimestamps, showDurations)

        if (showVars) {

        }
    }

    private formatLog(log: string[], separator: string = ", ") {
        if (log.length > 1) {
            let args = log.slice(1).join(separator)
            let s = `${log[0]}: ${args}`

            return s
        } else if (log.length === 0) {
            return log[0]
        }

        return "$$empty$$"
    }

    private format(showTag: boolean = true, showTimestamps: boolean = false, showDurations: boolean = false) {
        // format vars
        const formattedVars: string[] = []

        const varNames = Array.from(this.vars.keys())

        varNames.forEach((it, i) => {
            const value = this.vars.get(it)

            let s = ""

            if (showTag) {
                s += `[${this.name}] `
            }

            s += `${it}: ${value}`

            formattedVars.push(s)
        })

        // format logs
        const formattedLogs: string[] = []

        this.logs.forEach((it, i) => {
            let s = ""

            if (showTag) {
                s += `[${this.name}] `
            }

            s += it

            if (showTimestamps) {
                s += ` ${this.logTimestamps[i]} `
            }

            if (showDurations) {
                const prev = i === 0 ? this.startTime : this.logTimestamps[i - 1]
                const d = this.logTimestamps[i] - prev

                s += `+${d}ms`
            }

            formattedLogs.push(s)
        })

        return [formattedVars, formattedLogs]
    }
}

export class Metrics {
    static tag: string = "[METRICS]"
    static loggableCounts: Map<string, any> = new Map()
    static funcTraces: Map<string, [string, any][]> = new Map()

    static setTag(tag: string) {
        this.tag = `${tag}`
    }

    static inc(tag: string, by: number = 1) {
        if (this.loggableCounts.has(tag)) {
            const p = this.loggableCounts.get(tag)

            this.loggableCounts.set(tag, p + by)
        } else {
            this.loggableCounts.set(tag, by)
        }
    }

    static dec(tag: string, by: number = 1) {
        if (this.loggableCounts.has(tag)) {
            const p = this.loggableCounts.get(tag)

            this.loggableCounts.set(tag, p - by)
        } else {
            this.loggableCounts.set(tag, -1)
        }
    }

    static start(name: string) {
        this.funcTraces.set(name, [["__start", Date.now()]])
    }

    static addToTrace(name: string, tag: string, log: any) {
        const traces = this.funcTraces.get(name)!

        traces.push([tag, log])
        this.funcTraces.set(name, traces)
    }

    static end(name: string) {
        this.addToTrace(name, "__end", Date.now())
    }

    static logCounts() {
        console.log(`${this.tag} COUNTS:`)

        const tags = Array.from(this.loggableCounts.keys())

        tags.forEach(it => console.log(`${this.tag}   -${it}: ${this.loggableCounts.get(it)}`))
    }

    static logTraces(...names: string[]) {
        console.log(`${this.tag} TRACES:`)

        for (let name of names) {
            const trace = this.funcTraces.get(name)!

            const start = trace[0]
            const end = trace[trace.length - 1]

            console.log(`${this.tag}    FUNCTION_START {${name}} -- time: ${start[1]}`)

            for (let i = 0; i < trace.length; i++) {
                if (i !== 0 && i !== trace.length - 1) {
                    const log = trace[i]

                    console.log(`${this.tag}        -${log[0]}: ${log[1]}`)
                }
            }

            console.log(`${this.tag}    FUNCTION_END {${name}} -- time: ${end[1]}`)
        }
    }

    static logAllTraces() {
        console.log("[METRICS] traces", this.funcTraces)

        const traces = this.funcTraces.keys()

        this.logTraces(...traces)
    }

    static logAll() {
        this.logCounts()
        this.logAllTraces()
    }
}