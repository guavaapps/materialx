import {AttrMap, Rect2} from "../styles/style";
import app from "../../App";
import {Simulate} from "react-dom/test-utils";
import progress = Simulate.progress;

type Point = { x: number, y: number }
type PointMap = { s: number, e: number }
const ns = 'http://www.w3.org/2000/svg'

// interpolators
export type Interpolator = (from: number, to: number, progress: number) => number
export const LinearInterpolator: Interpolator = (from, to, progress) => {
    const d = to - from
    const v = from + progress * d

    return v
}

export abstract class Transition {
    abstract from: any
    abstract to: any
    abstract duration: number
    delay?: number = 0
    repeat?: number = 1
    direction?: "forward" | "reverse" | "alternate" = "forward"
    persistOnEnd?: boolean = false
    persistOnCancel?: boolean = false
    interpolator?: Interpolator = LinearInterpolator
}

export abstract class FixedPointPathTransition extends Transition {
    abstract from: string
    abstract to: string
}

class FixedPointPathTransitionHandler {
    static POINTS = [
        "M", "m",
        "L", "l",
        "H", "h",
        "V", "v",
        "C", "c",
        "S", "s",
        "Q", "q",
        "T", "t",
        "A", "a",
    ]

    static isPoint(p: string) {
        return this.POINTS.includes(p)
    }

    static createPointList(path: string) {
        let pointArray: { point: string, values: number[] }[] = []
        let currentPoint = ""
        let valueBuffer = ""

        for (let i = 0; i < path.length; i++) {
            let f = path.charAt(i)

            if (this.isPoint(f)) {
                if (valueBuffer.length > 0) {
                    let fValues = valueBuffer.split(",").filter((it) => it !== "").map((it) => parseInt(it))

                    valueBuffer = ""

                    const map = {point: currentPoint, values: fValues}
                    pointArray.push(map)
                }

                currentPoint = f
            } else if (f.toLowerCase() === "z") {

            } else {
                valueBuffer += f
            }

            if (i === path.length - 1) {
                let fValues = valueBuffer.split(",").filter((it) => it !== "").map((it) => parseInt(it))

                const map = {point: currentPoint, values: fValues}
                pointArray.push(map)
            }
        }

        return pointArray
    }

    static createPointMap(from: string, to: string) {
        // let fPointArray: { point: string, values: number[]}[] = []
        // let tPointArray: { point: string, values: number[]}[] = []
        //
        // let pointArray: { point: string, from: number[], to: number[] }[] = []
        //
        // let currentPoint = ""
        // let fValueBuffer = ""
        // let tValueBuffer = ""
        //
        // for (let i = 0; i < from.length; i++) {
        //     let f = from.charAt(i)
        //
        //     if (this.isPoint(f)) {
        //         if (fValueBuffer.length > 0) {
        //             let fValues = fValueBuffer.split(",").filter((it) => it !== "").map((it) => parseInt(it))
        //
        //             fValueBuffer = ""
        //
        //             const map = {point: currentPoint, values: fValues}
        //             fPointArray.push(map)
        //         }
        //
        //         currentPoint = f
        //     } else if (f.toLowerCase() === "z") {
        //
        //     } else {
        //         fValueBuffer += f
        //     }
        //
        //     if (i === from.length - 1) {
        //         f = "M"
        //     }
        // }
        //
        // currentPoint = ""
        //
        // for (let i = 0; i < to.length; i++) {
        //     let t = to.charAt(i)
        //
        //     if (this.isPoint(t)) {
        //         if (tValueBuffer.length > 0) {
        //             let tValues = tValueBuffer.split(",").filter((it) => it !== "").map((it) => parseInt(it))
        //
        //             tValueBuffer = ""
        //
        //             const map = {point: currentPoint, values: tValues}
        //             tPointArray.push(map)
        //         }
        //
        //         currentPoint = t
        //     } else if (t.toLowerCase() === "z") {
        //
        //     } else {
        //         tValueBuffer += t
        //     }
        // }
        //
        // console.log("paths", from, to)
        // console.log("fPoints", fPointArray)
        // console.log("tPoints", tPointArray)

        const fPointArray = this.createPointList(from)
        const tPointArray = this.createPointList(to)

        let pointArray: { point: string, from: number[], to: number[] }[] = []

        for (let i = 0; i < fPointArray.length; i++) {
            const map = {point: fPointArray[i].point, from: fPointArray[i].values, to: tPointArray[i].values}
            pointArray.push(map)
        }

        return pointArray
    }

    static build(transition: FixedPointPathTransition) {
        const {from, to, duration, delay, interpolator} = transition

        const pointMap = this.createPointMap(from, to)

        console.log("paths", from, to)
        console.log("pointMap", pointMap)

        let logged = false

        const stepFunc = (progress: number) => {
            let tween = ""

            for (let i = 0; i < pointMap.length; i++) {
                const point = pointMap[i]

                const p = point.point

                tween += p

                for (let j = 0; j < point.from.length; j++) {
                    const s = point.from[j]
                    const e = point.to[j]

                    const v = interpolator!(s, e, progress)

                    if (Number.isNaN(v) && !logged) {
                        logged = true
                        console.log("p", point, s, e, j, `atPointMap=${i}`)
                    }

                    tween += v

                    if (j < point.from.length - 1) {
                        tween += ","
                    }
                }

                if (i < pointMap.length - 1) {
                    tween += " "
                }
            }

            return `${tween} Z`
        }

        return stepFunc
    }

    static build2(transition: FixedPointPathTransition) {

    }
}

export type Rect = {
    width: number,
    height: number
}

export class OrbPath {
    private _path: string;
    private _pointPath: string = ""
    private _pointList: { x: number, y: number } [] = []

    private _size: Rect = {width: 0, height: 0}

    get path () {
        return this._path
    }

    get pointPath () {
        return this._pointPath
    }

    get pointList () {
        return this._pointList
    }

    private svgPath: SVGPathElement

    get length () {
        return this.svgPath.getTotalLength()
    }

    constructor(path: string) {
        this._path = path;

        const tempPath = OrbPath.createTempPath(path)
        this.svgPath = tempPath
    }

    private computePathSize (svgPath: SVGPathElement) {
        const pathLength = svgPath.getTotalLength()

        let minX = -Infinity
        let maxX = Infinity
        let minY = -Infinity
        let maxY = Infinity

        for (let i = 0; i < pathLength; i++) {
            const point = svgPath.getPointAtLength(i)
            const x = point.x
            const y = point.y

            if (x < minX) {
                minX = x
            }
            else if (x > maxX) {
                maxX = x
            }

            if (y < minY) {
                minY = y
            }
            else if (y > maxY) {
                maxY = y
            }
        }

        const w = maxX - minX
        const h = maxY - minY

        return {width: w, height: h} as Rect
    }

    normalize (resolution?: number) {
        const pathLength = this.svgPath.getTotalLength()
        resolution = resolution ? resolution : pathLength

        const step = pathLength / resolution

        // create points
        for (let i = 0; i < pathLength; i += step) {
            // build point list
            const point = this.svgPath.getPointAtLength(i)

            this._pointList.push({
                x: point.x,
                y: point.y
            })

            // build point path
            if (i === 0) {
                this._pointPath += `M${point.x},${point.y}`
            } else {
                this._pointPath += `L${point.x},${point.y}`
            }
        }

        this._pointPath += `Z`

        this._size = this.computePathSize(this.svgPath)
    }

    private static createTempPath(path: string) {
        // create holders
        const holder = document.createDocumentFragment() as DocumentFragment
        const svgElement = document.createElementNS(ns, "svg")
        const svgPathElement = document.createElementNS(ns, "path") as SVGPathElement

        // initialize
        svgPathElement.setAttribute("d", path)

        // append
        svgElement.appendChild(svgPathElement)
        holder.appendChild(svgElement)

        return svgPathElement
    }
}

class PathMorphHandler {
    private startPath: string;
    private endPath: string;

    constructor(startPath: string, endPath: string) {
        this.startPath = startPath;
        this.endPath = endPath;
    }

    createTweens(count: number = 100) {
        const [normalizedStartPath, normalizedEndPath] = this.normalizePaths([this.startPath, this.endPath])
        const pathLength = normalizedStartPath.length

        const map = Array.from({length: pathLength}).map((_, i) => {
            const obj: AttrMap = {}
            obj[i] = i

            return obj
        })

        const tweens = []

        const now = new Date().getTime()
        console.log("starting tween computation")
        for (let t = 0; t < count; t++) {
            let tween = ""

            for (let i = 0; i < pathLength; i++) {
                const startIndex = i
                const endIndex = i

                const startPoint = normalizedStartPath.pointList[startIndex]
                const endPoint = normalizedEndPath.pointList[endIndex]

                const dx = endPoint.x - startPoint.x
                const dy = endPoint.y - startPoint.y
                const h = Math.sqrt(dx * dx + dy * dy)

                const sin = dy / h
                const cos = dx / h

                const tx = cos * t
                const ty = sin * t

                if (i === 0) {
                    tween += `M${tx},${ty}`
                }
                else {
                    tween += `L${tx},${ty}`
                }
            }

            tween += `Z`
            tweens.push(tween)
        }

        return tweens
    }

    private normalizePaths(paths: string | string[]) {
        // format paths arg
        paths = Array.isArray(paths) ? paths : [paths]

        // find optimal resolution
        let resolution = 0
        const orbPaths = paths.map((it) => {
            const orbPath = new OrbPath(it)

            if (orbPath.length > resolution) {
                resolution = orbPath.length
            }

            return orbPath
        })

        orbPaths.forEach((it) => it.normalize(resolution))

        return orbPaths
    }
}

export class OrbTransition {
    private _startPath: string
    private _endPath: string
    private _tweens: string[] = []

    get startPath () {
        return this._startPath
    }

    get endPath () {
        return this._endPath
    }
    get tweens () {
        return this._tweens
    }

    constructor(startPath: string, endPath: string) {
        this._startPath = startPath
        this._endPath = endPath

        const transitionHandler = new PathMorphHandler(startPath, endPath)
        this._tweens.concat([startPath])
        this._tweens.concat(transitionHandler.createTweens())
        this._tweens.concat([endPath])
    }
}

export class TransitionObject {
    static TAG = "mx-transition-object-id"

    constructor(element: HTMLElement, transitionId: string, transition: Transition) {
        // generate transition id
    }
}

export type RunningTransition = {
    element: HTMLElement,
    transition: Transition
}

export class TransitionHandler {
    private runningTransitions: {[transitionId: string]: TransitionObject} = {}

    animate (element: HTMLElement, property: string, transition: Transition) {
        const transitionId = this.createTransitionId()
        const transitionObject = new TransitionObject(element, transitionId, transition)
    }

    private createTransitionId () {
        const runningIds = Object.keys(this.runningTransitions)

        let id = ""

        do {
            id = new Date().getTime().toString()
        } while (runningIds.includes(id))

        return id
    }
}

export function isFixedPointPathTransition(transition: Transition) {
    const startPath = transition.from
    const endPath = transition.to

    const startPoints = []
    const endPoints = []

    for (let i = 0; i < startPath.length; i++) {
        const p = startPath.charAt(i)

        if (FixedPointPathTransitionHandler.isPoint(p)) {
            startPoints.push(p)
        }
    }

    for (let i = 0; i < endPath.length; i++) {
        const p = endPath.charAt(i)

        if (FixedPointPathTransitionHandler.isPoint(p)) {
            endPoints.push(p)
        }
    }

    for (let i = 0; i < startPoints.length; i++) {
        const s = startPoints[i]
        const e = endPoints[i]

        if (s !== e) {
            return false
        }
    }

    return true
}

export function buildPathTransition(transition: Transition) {
    const normalized = Object.assign({}, transition)
    normalized.from = normalized.from.replace(" ", "")
    normalized.to = normalized.to.replace(" ", "")

    if (isFixedPointPathTransition(transition)) {
        console.log("is fixed point")
        const stepFunc = FixedPointPathTransitionHandler.build(normalized)

        return stepFunc
    }
}

export function buildTransition(transition: Transition) {
    if (typeof transition.from === "string") {
        console.log("is path trans")
        // path trans
        return buildPathTransition(transition)
    }
}

export abstract class TransitionCallback {
    onStart() {
    }

    onUpdate(progress: number, value: any) {
    }

    onEnd(cancelled: boolean) {
    }
}

type GetAnimationState = () => AnimationState
type SetAnimationState = (animationState: AnimationState) => void
type AnimationState = [progress: number, runtime: number]

export class TransitionHandler2 {
    protected _started = false
    protected _cancelled = false
    protected _paused = false
    protected _ended = false
    protected _isRunning = false
    private transition: Transition;
    private getAnimationState: GetAnimationState
    private setAnimationState: SetAnimationState
    private animationState: AnimationState = [0, 0]

    get started() {
        return this._started
    }

    get cancelled() {
        return this._cancelled
    }

    get paused() {
        return this._paused
    }

    get ended() {
        return this._ended
    }

    get isRunning() {
        return this._isRunning
    }

    constructor(transition: Transition, getAnimationState: GetAnimationState, setAnimationState: SetAnimationState) {
        this.transition = transition;
        this.getAnimationState = getAnimationState
        this.setAnimationState = setAnimationState
    }

    start() {
        this._started = true
        this._isRunning = true

        this.setAnimationState([0, 0])
    }

    pause() {
        this._paused = true
        this._isRunning = false

        this.animationState = this.getAnimationState()

        const [p, r] = this.animationState

        console.log("paused", p, r)
    }

    resume() {
        this._paused = false
        this._isRunning = true

        this.setAnimationState(this.animationState)
    }

    cancel() {
        this._isRunning = false
        this._cancelled = true
        this._ended = true

        if (!this.transition.persistOnCancel) {
            this.setAnimationState([0, 0])
        }
    }

    end() {
        this._isRunning = false
        this._ended = true

        if (!this.transition.persistOnEnd) {
            this.setAnimationState([0, 0])
        } else {
            this.setAnimationState([1, this.transition.duration])
        }
    }

    setProgress(progress: number) {
        const runtime = progress * this.transition.duration

        this.setAnimationState([progress, runtime])
    }

    setRuntime(runtime: number) {
        const progress = runtime / this.transition.duration

        this.setAnimationState([progress, runtime])
    }
}

export type TransitionTarget = {
    element: Element,
    props: string[]
}

export function withDefaults(transition: Transition): Transition {
    const defaultParams: Transition = {
        from: "",
        to: "",
        duration: 0,
        delay: 0,
        repeat: 1,
        direction: "forward",
        persistOnEnd: false,
        persistOnCancel: false,
        interpolator: LinearInterpolator
    }

    return {
        ...defaultParams,
        ...transition
    }
}

class ProgressInterpolator {
    private reversed: boolean = false

    get(progress: number) {
        if (this.reversed) {
            return 1 - progress
        }

        return progress
    }

    reverse() {
        this.reversed = !this.reversed
    }
}

export function transition(transition: Transition, targets?: TransitionTarget[], callback?: TransitionCallback) {
    transition = withDefaults(transition)

    let startTime = 0
    const duration = transition.duration + transition.delay!
    const transitionFunc = buildTransition(transition)!

    let started = false

    let runtime = 0
    let progress = 0

    let savedRuntime = 0

    const progressInterpolator = new ProgressInterpolator()
    let count = 0

    if (transition.direction === "reverse") {
        progressInterpolator.reverse()
    }

    const transitionHandler = new TransitionHandler2(
        transition,
        () => {
            return [progress, runtime]
        },
        ([_, runtime]) => {
            console.log("resume", _, runtime)

            startTime = 0
            savedRuntime = runtime

            window.requestAnimationFrame(step)
        })

    function step(timestamp: number) {
        if (!startTime) startTime = timestamp - savedRuntime

        runtime = timestamp - startTime

        progress = runtime / duration

        if (!started) {
            started = true

            callback?.onStart()
        }

        const v = transitionFunc(progressInterpolator.get(progress))

        if (targets) {
            for (let target of targets) {
                for (let prop of target.props) {
                    target.element.setAttributeNS(null, prop, v)
                }
            }
        }

        callback?.onUpdate(progress, v)

        if (progress < 1) {
            count++

            if (transitionHandler.isRunning) {
                window.requestAnimationFrame(step)
            } else if (count < transition!.repeat!) {
                if (transition!.direction! === "alternate") {
                    progressInterpolator.reverse()
                }

                transitionHandler.start()
            }
        } else {
            callback?.onEnd(transitionHandler.cancelled)
        }
    }

    // window.requestAnimationFrame(step)

    return transitionHandler
}

export function morb(target: SVGElement, to: string) {
    const fromPathElem = getPathElem(target)
    const toPathElem = createTargetSvgElem(target, to)

    const [fromPoints, toPoints] = extractPoints(fromPathElem, toPathElem)
    const tweens = computeTweens(fromPoints, toPoints)
    tweens.push(to)

    let startTime = 0
    const duration = 2000

    console.log("tweenLength", tweens.length)

    function step(timestamp: number) {
        if (!startTime) startTime = timestamp

        const progress = (timestamp - startTime) / duration

        // const i = progress * pathElem.getTotalLength()
        // const p = pathElem.getPointAtLength(i)

        // console.log("points", p)
        const i = Math.floor(progress * (tweens.length - 1))
        const tween = tweens[i]

        applyPath(fromPathElem, tween)

        if (progress < 1) {
            window.requestAnimationFrame(step)
        }
    }

    window.requestAnimationFrame(step)
}

function applyPath(elem: SVGPathElement, path: string) {
    elem.setAttributeNS(null, "d", path)
}

function extractPoints(fromPathElem: SVGPathElement, toPathElement: SVGPathElement) {
    const fromLength = fromPathElem.getTotalLength()
    const toLength = toPathElement.getTotalLength()

    let from = []
    let to = []

    console.log(fromLength)

    for (let i = 0; i < fromLength; i++) {
        const p = fromPathElem.getPointAtLength(i)
        from.push({x: p.x, y: p.y})
    }

    for (let i = 0; i < toLength; i++) {
        const p = toPathElement.getPointAtLength(i)
        to.push({x: p.x, y: p.y})
    }

    return [from, to]
}

function normalizePoints(fromPoints: Point[], toPoints: Point[]) {
    let startPoints: Point[]
    let endPoints: Point[]

    if (fromPoints.length > toPoints.length) {
        const d = fromPoints.length - toPoints.length

        startPoints = Array.from(fromPoints)
        endPoints = fillPoints(toPoints, d)
    } else if (fromPoints.length < toPoints.length) {
        const d = toPoints.length - fromPoints.length

        startPoints = fillPoints(fromPoints, d)
        endPoints = Array.from(toPoints)
    } else {
        startPoints = Array.from(fromPoints)
        endPoints = Array.from(toPoints)
    }

    return [startPoints, endPoints]
}

type PointMapFunction = (s: Point[], e: Point[]) => PointMap[]

function computeTweens(fromPoints: Point[], toPoints: Point[], pointMapFn: PointMapFunction = otoPointMap) {
    const [startPoints, endPoints] = normalizePoints(fromPoints, toPoints)

    const pointMap = pointMapFn(startPoints, endPoints)

    const ds = calculateMappedDistances(startPoints, endPoints, pointMap)//calculateDistances(startPoints, endPoints)
    const stepCount = Math.round(calculateMaxDistance(ds))

    console.log("tweens", stepCount, pointMap, ds)

    let tweens: string[] = []

    for (let i = 0; i < stepCount; i++) {
        const tweenPoints: Point[] = []

        for (let j = 0; j < pointMap.length; j++) {
            const si = pointMap[j].s
            const ei = pointMap[j].e

            const s = startPoints[si]
            const e = endPoints[ei]

            const dx = e.x - s.x
            const dy = e.y - s.y
            const d = ds [j]

            const cos = d !== 0 ? dx / d : 0
            const sin = d !== 0 ? dy / d : 0

            const l = d * (i / stepCount)

            const x = s.x + cos * l
            const y = s.y + sin * l

            tweenPoints.push({x: Math.round(x), y: Math.round(y)})
        }

        const tween = computeLinearPath(tweenPoints)
        tweens.push(tween)
    }

    tweens.splice(0, 1)

    return tweens
}

function calculateDistances(from: Point[], to: Point[]) {
    const l = from.length

    const ds = []

    for (let i = 0; i < l; i++) {
        const f = from[i]
        const t = to[i]
        const dx = t.x - f.x
        const dy = t.y - f.y

        const d = Math.sqrt(dx * dx + dy * dy)

        ds.push(d)
    }

    return ds
}

function calculateMappedDistances(startPoints: Point[], endPoints: Point[], pointMap: PointMap[]) {
    const l = pointMap.length

    const ds = []

    for (let i = 0; i < l; i++) {
        const s = pointMap[i].s
        const e = pointMap[i].e

        const f = startPoints[s]
        const t = endPoints[e]
        const dx = t.x - f.x
        const dy = t.y - f.y

        const d = Math.sqrt(dx * dx + dy * dy)

        ds.push(d)
    }

    return ds
}

function calculateMaxDistance(ds: number[]) {
    let max = 0

    ds.forEach((it) => {
        if (Math.abs(it) > max) {
            max = it
        }
    })

    return max
}

function otoPointMap(startPoints: Point[], endPoints: Point[]) {
    const map = startPoints.map((it, i) => {
        return {s: i, e: i} as PointMap
    })

    return map
}

function linearPointMap(startPoints: Point[], endPoints: Point[]) {
    const map: PointMap[] = []
    const used: number[] = []

    let db = []

    for (let i = 0; i < startPoints.length; i++) {
        const sx = startPoints[i].x
        const sy = startPoints[i].y

        let min = Infinity

        for (let j = 0; j < endPoints.length; j++) {
            if (used.includes(j)) {
                continue
            }

            const ex = endPoints[i].x
            const ey = endPoints[i].y

            const dx = ex - sx
            const dy = ey - sy

            const d = Math.sqrt(dx * dx + dy * dy)

            if (Math.abs(d) < min) {
                min = j
            }
        }

        used.push(min)
        map.push({s: i, e: min})

        db.push({
            s: startPoints[i],
            e: startPoints[min]
        })
    }

    console.log("map", map, startPoints, endPoints)

    return map
}

function oaaLmsePointMap(startPoints: Point[], endPoints: Point[]) {
    const shiftedStartPoints = Array.from(startPoints)
    const shiftedEndPoints = Array.from(endPoints)

    const [sx, sy, sw, sh] = getBounds(startPoints)
    const [ex, ey, ew, eh] = getBounds(endPoints)

    let dx = (ew - sw) / 2
    let dy = (eh - sh) / 2

    if (dx > 0) { // end > start
        dx = dx - sx
        shiftPoints(shiftedStartPoints, dx, 0)
    } else if (dx < 0) {
        dx = -dx - ex
        shiftPoints(shiftedEndPoints, dx, 0)
    }

    if (dy > 0) {
        dy = dy - sy
        shiftPoints(shiftedStartPoints, 0, dy)
    } else if (dx < 0) {
        dy = -dy - ey
        shiftPoints(shiftedEndPoints, 0, dy)
    }

    const linearMap = linearPointMap(shiftedStartPoints, shiftedEndPoints)

    return linearMap
}

function oaaLmsePointMap2(startPoints: Point[], endPoints: Point[]) {
    const [sx, sy, sw, sh] = getBounds(startPoints)
    const [ex, ey, ew, eh] = getBounds(endPoints)

    const shiftedStartPoints = shiftPoints(startPoints, -(sx + sw / 2), -(sy + sh / 2))

    const shiftedEndPoints = shiftPoints(endPoints, -(ex + ew / 2), -(ey + eh / 2))

    const pS = computeLinearPath(shiftedStartPoints)
    const pE = computeLinearPath(shiftedEndPoints)

    console.log("ps", pS, shiftedStartPoints)
    console.log("pe", pE, shiftedEndPoints)

    const linearMap = linearPointMap(shiftedStartPoints, shiftedEndPoints)

    return linearMap
}

function shiftPoints(points: Point[], dx: number, dy: number) {
    const p = Array.from(points)

    const shifted = p.map((it) => {
        const newPoint = {x: it.x + dx, y: it.y + dy}

        return newPoint
    })

    return shifted
}

function getBounds(points: Point[]) {
    let minX = Infinity
    let minY = Infinity
    let maxX = 0
    let maxY = 0

    points.forEach((it) => {
        const x = it.x
        const y = it.y

        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
    })

    const w = maxX - minX
    const h = maxY - minY

    return [minX, minY, w, h]
}

function computeLinearPath(points: Point[]) {
    const pathStart = `M${points[0].x},${points[0].y}`

    const partialPath = points.map((it) => `L${it.x},${it.y}`).join(" ")

    return `${pathStart} ${partialPath} Z`
}

function fillPoints(points: Point[], count: number) {
    const length = points.length
    const filled = Array.from(points)

    const fillRate = length / count

    console.log("fill", count, fillRate)

    for (let i = 0; i < count; i++) {
        const index = Math.round(i * fillRate)

        filled.splice(index, 0, filled[index])
    }

    return filled
}

function getPathElem(from: SVGElement) {
    return Array.from(from.children) [0] as SVGPathElement
}

function createTargetSvgElem(applyOn: SVGElement, path: string) {
    const onPath = getPathElem(applyOn)

    const temp = document.createDocumentFragment()
    const svgElem = document.createElementNS(ns, "svg")
    const pathElem = document.createElementNS(ns, "path")

    transferAttrs(applyOn, svgElem)
    transferAttrs(onPath, pathElem, "d")

    pathElem.setAttribute("d", path)

    svgElem.appendChild(pathElem)
    temp.appendChild(svgElem)

    console.log("temp", temp)

    const p = temp.firstChild?.firstChild as SVGPathElement
    const l = p.getTotalLength()

    console.log("l", l)

    return pathElem
}

function transferAttrs(from: Element, to: Element, skip?: string | string[]) {
    if (skip) skip = Array.isArray(skip) ? skip : [skip]

    const attrs = from.getAttributeNames()

    console.log("attrs", attrs)

    attrs.forEach((it) => {
        const v = from.getAttribute(it)

        if (v && !skip?.includes(it)) to.setAttribute(it, v)
    })
}