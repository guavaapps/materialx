export default 0

// import {Rect, Shape} from "../mx/shapes/shapes";
// import {AttrMap} from "../mx/styles/Style";
// import {Interpolator, LinearInterpolator} from "../mx/transitions/interpolators";
// import {TransitionWrapper} from "../mx/transitions/transition";
// import {transition, TransitionHandler2} from "../mx/components/orb";
//
// const ns = 'http://www.w3.org/2000/svg'
//
// export class OrbPath {
//     private _path: string;
//     private _pointPath: string = ""
//     private _pointList: { x: number, y: number } [] = []
//
//     private _size: Rect = {width: 0, height: 0}
//
//     get path() {
//         return this._path
//     }
//
//     get pointPath() {
//         return this._pointPath
//     }
//
//     get pointList() {
//         return this._pointList
//     }
//
//     private svgPath: SVGPathElement
//
//     get length() {
//         return this.svgPath.getTotalLength()
//     }
//
//     constructor(path: string) {
//         this._path = path;
//
//         const tempPath = OrbPath.createTempPath(path)
//         this.svgPath = tempPath
//     }
//
//     private static computePathSize(svgPath: SVGPathElement) {
//         const pathLength = svgPath.getTotalLength()
//
//         let minX = -Infinity
//         let maxX = Infinity
//         let minY = -Infinity
//         let maxY = Infinity
//
//         for (let i = 0; i < pathLength; i++) {
//             const point = svgPath.getPointAtLength(i)
//             const x = point.x
//             const y = point.y
//
//             if (x < minX) {
//                 minX = x
//             } else if (x > maxX) {
//                 maxX = x
//             }
//
//             if (y < minY) {
//                 minY = y
//             } else if (y > maxY) {
//                 maxY = y
//             }
//         }
//
//         const w = maxX - minX
//         const h = maxY - minY
//
//         return {width: w, height: h} as Rect
//     }
//
//     normalize(resolution?: number) {
//         const pathLength = this.svgPath.getTotalLength()
//         resolution = resolution ? resolution : pathLength
//
//         const step = pathLength / resolution
//
//         // create points
//         for (let i = 0; i < pathLength; i += step) {
//             // build point list
//             const point = this.svgPath.getPointAtLength(i)
//
//             this._pointList.push({
//                 x: point.x,
//                 y: point.y
//             })
//
//             // build point path
//             if (i === 0) {
//                 this._pointPath += `M${point.x},${point.y}`
//             } else {
//                 this._pointPath += `L${point.x},${point.y}`
//             }
//         }
//
//         this._pointPath += `Z`
//
//         this._size = OrbPath.computePathSize(this.svgPath)
//     }
//
//     private static createTempPath(path: string) {
//         // create holders
//         const holder = document.createDocumentFragment() as DocumentFragment
//         const svgElement = document.createElementNS(ns, "svg")
//         const svgPathElement = document.createElementNS(ns, "path") as SVGPathElement
//
//         // initialize
//         svgPathElement.setAttribute("d", path)
//
//         // append
//         svgElement.appendChild(svgPathElement)
//         holder.appendChild(svgElement)
//
//         return svgPathElement
//     }
// }
//
// interface TransitionHandler {
//     steps: any[]
//     interpolator: Interpolator
//     createTween(progress: number): any
//
//     createAllTweens(count: number): any[]
// }
//
// class PathMorphHandler implements TransitionHandler {
//     steps: string[]
//     interpolator: Interpolator
//
//     private normalizedPaths: OrbPath[]
//     private pathPointMaps: number[][]
//     private pathLength: number
//
//     // cached values
//     private travelLines: number[] = []
//     private travelLineBounds: number[][]
//
//     constructor(steps: string[], interpolator: Interpolator) {
//         this.steps = steps
//         this.interpolator = interpolator
//
//         // normalize paths
//         const normalizedPaths = this.normalizePaths(steps)
//         const pathLength = normalizedPaths[0].length
//
//         const map = this.mapPathPoints(normalizedPaths)
//
//         this.normalizedPaths = normalizedPaths
//         this.pathPointMaps = map
//         this.pathLength = pathLength
//
//         // compute travel lines
//         const travelLineBounds: number[][] = []
//
//         for (let i = 0; i < this.pathLength; i++) {
//             const travelLine: AttrMap = {}
//
//             const start = normalizedPaths [i]
//             const end = normalizedPaths [i + 1]
//
//             let t = 0
//
//             travelLineBounds.push([])
//
//             for (let j = 0; j < normalizedPaths.length - 1; j++) {
//                 const startPath = normalizedPaths[j]
//                 const endPath = normalizedPaths[j + 1]
//
//                 const startPoint = startPath.pointList[i]
//                 const endPoint = endPath.pointList[this.pathPointMaps[j][i]]
//
//                 const dx = endPoint.x - startPoint.x
//                 const dy = endPoint.y - startPoint.y
//                 const d = Math.sqrt(dx * dx + dy * dy)
//
//                 t += d
//
//                 travelLineBounds[i][j] = t
//
//                 // array [pathLength] [normalizedPath.length - 1] = t <== upper limit
//             }
//
//             this.travelLines.push(t) // total travel line length for path point i
//         }
//
//         this.travelLineBounds = travelLineBounds
//     }
//
//     createTween(progress: number) {
//         let tween = ""
//
//         for (let i = 0; i < this.pathLength; i++) {
//             const startIndex = i
//             const endIndex = i
//
//             // interpolate
//             const interpolatedProgress = this.interpolator(progress)
//
//             // get path bounds
//             const travelLineLength = this.travelLines[i]
//             let startPathIndex: number
//             let upperBound: number
//             let upperProgressBound
//
//             for (let j = 0; j < this.travelLineBounds[i].length; j++) {
//                 upperBound = this.travelLineBounds[i][j]
//                 upperProgressBound = upperBound / travelLineLength
//
//                 if (progress <= upperProgressBound) {
//                     startPathIndex = j
//                 } else {
//                     break
//                 }
//             }
//
//             const lowerBound = this.travelLineBounds[i][startPathIndex! - 1]
//             const h = upperBound! - lowerBound
//
//             const t = interpolatedProgress * h
//
//             const startPath = this.normalizedPaths[startPathIndex!]
//             const endPath = this.normalizedPaths[startPathIndex! + 1]
//
//             const startPoint = startPath.pointList[i]
//             const endPoint = endPath.pointList[i]
//
//             const dx = endPoint.x - startPoint.x
//             const dy = endPoint.y - startPoint.y
//
//             const sin = dy / h
//             const cos = dx / h
//
//             const tx = cos * t + lowerBound
//             const ty = sin * t + lowerBound
//
//             if (i === 0) {
//                 tween += `M${tx},${ty}`
//             } else {
//                 tween += `L${tx},${ty}`
//             }
//         }
//
//         tween += `Z`
//
//         return tween
//     }
//
//     createAllTweens(count = 100) {
//         const step = 1 / count
//
//         const tweens = []
//
//         for (let i = 0; i < 1; i += step) {
//             const tween = this.createTween(i)
//             tweens.push(tween)
//         }
//
//         return tweens
//     }
//
//     private mapPathPoints(normalizedPaths: OrbPath[]): number[][] {
//         const map = []
//
//         for (let i = 0; i < normalizedPaths.length - 1; i++) {
//             map.push([])
//
//             for (let j = 0; j < normalizedPaths[i].length; j++) {
//                 map [i] = j
//             }
//         }
//
//         return map as number[][]
//     }
//
//     private normalizePaths(paths: string | string[]) {
//         // format paths arg
//         paths = Array.isArray(paths) ? paths : [paths]
//
//         // find optimal resolution
//         let resolution = 0
//         const orbPaths = paths.map((it) => {
//             const orbPath = new OrbPath(it)
//
//             if (orbPath.length > resolution) {
//                 resolution = orbPath.length
//             }
//
//             return orbPath
//         })
//
//         orbPaths.forEach((it) => it.normalize(resolution))
//
//         return orbPaths
//     }
// }
//
// export class NumberTransitionHandler implements TransitionHandler {
//     interpolator: Interpolator;
//     steps: number[];
//
//     private travelLength: number
//     private travelBounds: number[]
//     private upperTravelBounds: number[]
//
//     private travelPoints: number[] = []
//
//     constructor(steps: number[], interpolator: Interpolator) {
//         this.steps = steps
//         this.interpolator = interpolator
//
//         let t = 0
//         let b = []
//         let u = []
//         let p = 0
//
//         this.travelPoints.push(0)
//
//         for (let i = 0; i < steps.length - 1; i ++) {
//             const d = steps[i + 1] - steps [i]
//             t += Math.abs(d)
//             p += d
//
//             b.push(d)
//             u.push(t)
//             this.travelPoints.push(p)
//         }
//
//         this.travelLength = t
//         this.travelBounds = b
//         this.upperTravelBounds = u
//     }
//
//     createAllTweens(count: number): any[] {
//         return []
//     }
//
//     createTween(progress: number): any {
//         const partialTravel = progress * this.travelLength
//         let stepIndex: number = 0
//
//         for (let i = 0; i < this.steps.length; i ++) {
//             if (partialTravel <= this.upperTravelBounds[i]) {
//                 stepIndex = i
//             }
//             else {
//                 break
//             }
//         }
//
//         const d = this.travelBounds[stepIndex]
//         const i = this.interpolator(progress)
//         const p = i * d
//         const t = this.travelPoints[stepIndex] + p
//
//         console.log("log", d, i, p, t)
//
//         return t
//     }
//
// }
//
// class ObjectTransitionHandler implements TransitionHandler {
//     steps: object[]
//     interpolator: Interpolator
//
//     private transitionHandlers: {attr: string, transitionHandler: TransitionHandler}[] = []
//
//     constructor(steps: object[], interpolator: Interpolator) {
//         this.steps = steps
//         this.interpolator = interpolator
//
//         const animatableAttrs = ObjectTransitionHandler.getAnimatableAttrs(steps)
//
//         if (Object.keys(animatableAttrs).length === 0) {
//             throw new InvalidTransitionError()
//         }
//
//         Object.keys(animatableAttrs).forEach((it) => {
//             const steps = animatableAttrs[it]
//             const transitionHandler = new NumberTransitionHandler(steps, interpolator)
//
//             this.transitionHandlers.push({attr: it, transitionHandler: transitionHandler})
//         })
//     }
//
//     createAllTweens(count: number): Shape[] {
//         return [];
//     }
//
//     createTween(progress: number): any {
//         const tween = this.transitionHandlers.map((it) => {
//             const obj: AttrMap = {}
//             obj[it.attr] = it.transitionHandler.createTween(progress)
//         })
//
//         let obj = Object.assign({}, ...tween)
//
//         return obj
//     }
//
//     private static getAnimatableAttrs (steps: object[]) {
//         const animatableAttrs: AttrMap = {}
//
//         const attrNames: string[] = []
//         const attrCount: number[] = []
//         const attrChanging: boolean[] = []
//         const attrValues: any[][] = []
//
//         steps.forEach((it: AttrMap) => {
//             const attrs = Object.keys(it)
//
//             attrs.forEach((attr) => {
//                 if (!attrNames.includes(attr)) {
//                     attrNames.push(attr)
//                     attrCount.push(0)
//                     attrChanging.push(false)
//                     attrValues.push([it[attr]])
//                 }
//                 else {
//                     const i = attrNames.indexOf(attr)
//                     attrCount[i] += 1
//
//                     if (attrValues[i][attrValues[i].length - 1] !== it[attr]) {
//                         attrChanging[i] = true
//                     }
//
//                     attrValues[i].push(it[attr])
//                 }
//             })
//         })
//
//         for(let i = 0; i < attrNames.length; i ++) {
//             const count = attrCount[i]
//             const changing = attrChanging[i]
//
//             if (changing && count === steps.length) {
//                 animatableAttrs[attrNames[i]] = attrValues[i]
//             }
//         }
//
//         return animatableAttrs
//     }
// }
//
// export class OrbTransition implements TransitionWrapper {
//     private _steps: string[]
//     private _interpolator: Interpolator;
//     private _tweens: string[] = []
//
//     get steps() {
//         return this._steps
//     }
//
//     get tweens() {
//         return this._tweens
//     }
//
//     private _transitionHandler: TransitionHandler
//
//     constructor(steps: string[], interpolator: Interpolator) {
//         this._steps = steps
//         this._interpolator = interpolator;
//
//         const transitionHandler = new PathMorphHandler(this.steps, this._interpolator)
//         this._transitionHandler = transitionHandler
//     }
//
//     at(progress: number) {
//         const tween = this._transitionHandler.createTween(progress)
//
//         return tween
//     }
//
//     buildAll(count: number) {
//         // this._tweens.concat([this._startPath])
//         this._tweens.concat(this._transitionHandler.createAllTweens(100))
//         // this._tweens.concat([this._endPath])
//
//         return this._tweens
//     }
// }
//
// export class OrbNumberTransition implements TransitionWrapper {
//     private transitionHandler: NumberTransitionHandler
//
//     constructor(steps: number[], interpolator: Interpolator = LinearInterpolator) {
//         this.transitionHandler = new NumberTransitionHandler(steps, interpolator)
//     }
//     at(progress: number): any {
//         return this.transitionHandler.createTween(progress)
//     }
//
//     buildAll(count: number): any[] {
//         return [];
//     }
//
// }
//
// export class OrbObjectTransition implements TransitionWrapper {
//     private steps: object[]
//     private interpolator: Interpolator
//
//     private transitionHandler: ObjectTransitionHandler
//
//     constructor(steps: object[], interpolator: Interpolator = LinearInterpolator) {
//         this.steps = steps
//         this.interpolator = interpolator
//
//         this.transitionHandler = new ObjectTransitionHandler(steps, interpolator)
//     }
//
//     at(progress: number): any {
//         return this.transitionHandler.createTween(progress)
//     }
//
//     buildAll(count: number): any[] {
//         return [];
//     }
//
// }
//
// export class InvalidTransitionError extends Error {
//     constructor(message?: string) {
//         super(message);
//     }
// }