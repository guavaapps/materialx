import {InvalidShapeError, Oval, Path, Rect, Shape, ShapeUtils} from "./shapes";
import exp from "constants";
import React from "react";
import {AttrMap} from "../styles/style";

// define ShapeDrawable types
type ShapeDrawableAttrs = {
    fillColor?: string
    strokeColor?: string
    strokeWidth?: number
}

export type RectDrawable = {
    cornerRadius: number | number[],
    cornerType?: "round" | "cut"
} & Rect & ShapeDrawableAttrs

export type OvalDrawable = Oval & ShapeDrawableAttrs

export type PathDrawable = Path & ShapeDrawableAttrs

export type ShapeDrawable = RectDrawable | OvalDrawable | PathDrawable

// define ShapeDrawable wrapper
export type ShapeDrawableWrapper = {
    fillPath: string,
    strokePath?: string,
    size: Rect
} & ShapeDrawableAttrs

export class ShapeDrawableUtils {
    static createDrawable(shape: ShapeDrawable) {
        this.applyShapeDrawableDefaults(shape)

        if (ShapeUtils.isRect(shape)) {
            return this.createRectDrawable(shape as RectDrawable)
        } else if (ShapeUtils.isOval(shape)) {
            return this.createOvalDrawable(shape as OvalDrawable)
        } else if (ShapeUtils.isPath(shape)) {
            return this.createPathDrawable(shape as PathDrawable)
        }

        throw new InvalidShapeError(shape)
    }

    private static applyShapeDrawableDefaults (shape: ShapeDrawable) {
        shape.fillColor = shape.fillColor? shape.fillColor : "#00000000"
        shape.strokeColor = shape.strokeColor ? shape.strokeColor : "#00000000"
        shape.strokeWidth = shape.strokeWidth ? shape.strokeWidth : 0
    }

    private static createRectDrawable(rect: RectDrawable): ShapeDrawableWrapper {
        // define props
        const w = rect.width
        const h = rect.height

        // build paths
        const hasStroke = rect.strokeWidth! > 0

        const path = this.buildRectPath(rect)
        let fillPath = path
        let strokePath

        if (hasStroke) {
            const fillRect = this.createFillRectForStroke(rect)
            const strokeRect = this.createStrokeRect(rect)

            let innerStrokePath = this.buildRectPath(fillRect)
            innerStrokePath = this.offsetPathForStroke(innerStrokePath, rect.strokeWidth!)
            strokePath = this.buildRectPath(strokeRect)

            strokePath = `${strokePath} ${innerStrokePath}`
        }

        const wrapper: ShapeDrawableWrapper = {
            fillPath: fillPath,
            strokePath: strokePath,
            size: {width: w + rect.strokeWidth!, height: h + rect.strokeWidth!} as Rect,
            fillColor: rect.fillColor,
            strokeColor: rect.strokeColor,
            strokeWidth: rect.strokeWidth
        }

        return wrapper
    }

    private static buildRectPath (rect: RectDrawable) {
        const w = rect.width
        const h = rect.height

        let radius: number[]

        if (Array.isArray(rect.cornerRadius)) {
            if (rect.cornerRadius.length === 4) {
                radius = [rect.cornerRadius[0], rect.cornerRadius[0], rect.cornerRadius [1], rect.cornerRadius [1],
                    rect.cornerRadius[2], rect.cornerRadius[2], rect.cornerRadius[3], rect.cornerRadius[3]]

                console.log("corner radius is 4 long", radius)
            } else if (rect.cornerRadius.length !== 8) {
                throw new InvalidShapeError(rect, "Invalid property (cornerRadius).")
            }
        } else {
            radius = [rect.cornerRadius, rect.cornerRadius, rect.cornerRadius, rect.cornerRadius,
                rect.cornerRadius, rect.cornerRadius, rect.cornerRadius, rect.cornerRadius]
        }

        const r = radius!

        let path = `M0,${r[0]} A${r[0]},${r[1]},0,0,1,${r[1]},0 H${w - r[2]} A${r[2]},${r[3]},0,0,1,${w},${r[3]} V${h! - r[4]} A${r[4]},${r[5]},0,0,1,${w! - r[5]},${h!} H${r[6]} A${r[6]},${r[7]},0,0,1,0,${h! - r[7]} Z`

        if (rect.cornerType && rect.cornerType === "cut") {
            path = `M0,${r[0]} L${r[1]},0 H${w - r[2]} L${w},${r[3]} V${h! - r[4]} L${w! - r[5]},${h!} H${r[6]} L0,${h! - r[7]} Z`
        }

        return path
    }

    private static createOvalDrawable(oval: OvalDrawable): ShapeDrawableWrapper {
        const rx = oval.radiusX ? oval.radiusX : oval.radius
        const ry = oval.radiusY ? oval.radiusY : oval.radius

        if (!rx || !ry) {
            throw new InvalidShapeError(oval)
        }

        const w = 2 * rx
        const h = 2 * ry

        const path = this.buildOvalPath(oval)
        let fillPath = path
        let strokePath

        const hasStroke = oval.strokeWidth! > 0

        if (hasStroke) {
            const fillOval = this.createFillOvalForStroke(oval)
            const strokeOval = this.createStrokeOval(oval)

            let innerStrokePath = this.buildOvalPath(fillOval)
            innerStrokePath = this.offsetPathForStroke(innerStrokePath, oval.strokeWidth!)
            strokePath = this.buildOvalPath(strokeOval)

            strokePath = `${strokePath} ${innerStrokePath}`
        }

        const wrapper: ShapeDrawableWrapper = {
            fillPath: fillPath,
            strokePath: strokePath,
            size: {width: w + oval.strokeWidth!, height: h + oval.strokeWidth!} as Rect,
            fillColor: oval.fillColor,
            strokeColor: oval.strokeColor,
            strokeWidth: oval.strokeWidth
        }

        return wrapper
    }

    private static buildOvalPath (oval: OvalDrawable) {
        const rx = oval.radiusX ? oval.radiusX : oval.radius
        const ry = oval.radiusY ? oval.radiusY : oval.radius

        if (!rx || !ry) {
            throw new InvalidShapeError(oval)
        }

        const w = 2 * rx
        const h = 2 * ry

        let path = `M${0},${ry} a${rx},${ry},0,1,0,${w},${0} a${rx},${ry},0,1,0,${-w},${0} Z`
        path = `M${rx},${0} a${rx},${ry},0,1,0,${1},${0} Z`
        path = `M${rx - 1},${0} A${rx},${ry},0,1,0,${rx + 1},${0} Z`

        return path
    }

    private static createPathDrawable(path: PathDrawable): ShapeDrawableWrapper {
        const size = this.computePathSize(path.path)

        const wrapper: ShapeDrawableWrapper = {
            fillPath: path.path,
            size: size,
            fillColor: path.fillColor,
            strokeColor: path.strokeColor,
            strokeWidth: path.strokeWidth
        }

        return wrapper
    }

    private static offsetPathForStroke (path: string, strokeWidth: number) {
        const offset = strokeWidth / 2
        let offsetPath

        const OFFSET_POINTS: AttrMap = {
            "m": [0, 1],
            "l": [0, 1],
            "h": [0],
            "v": [0],
            "a": [5, 6],
        }

        // split path
        const pathPoints = path.split(" ")
        offsetPath = pathPoints.map((it) => {
            if (Object.keys(OFFSET_POINTS).includes(it[0].toLowerCase())) {
                const p = it.substring(1).split(",")

                OFFSET_POINTS[it[0].toLowerCase()].forEach((it: number) => {
                    const b = p[it]
                    const v = parseInt(b) + offset
                    const n = v + offset
                    p[it] = n.toString()
                })

                if (it[0].toLowerCase() === "m") {
                    console.log("offsetting", it.substring(1), p, `${it[0]}${p.join(",")}`, it[0])
                }

                return `${it[0]}${p.join(",")}`
            }

            return it
        }).join(" ")

        console.log("normal offset path", path)
        console.log("stroke offset path", offsetPath)

        return offsetPath
    }

    private static offsetPathForStroke2 (path: string, strokeWidth: number) {
        const offset = strokeWidth / 2
        let offsetPath = `${path}`

        const OFFSET_POINTS: AttrMap = {
            "m": [0, 1],
            "l": [0, 1],
            "h": [0],
            "v": [0],
            "a": [5, 6],
        }

        // split path
        let point = null
        let subindex = 0
        let keepReading = false
        let buffer = ""
        for (let i = 0; i < path.length; i ++) {
            const c = path[i]

            if (Object.keys(OFFSET_POINTS).includes(c.toLowerCase())) {
                point = c.toLowerCase()
                subindex = 0
            }
            if (point && c === ",") {
                if (keepReading) {
                    // flush buffer
                    keepReading = false

                    const bufferValue = parseInt(buffer)
                    const offsetValue = bufferValue + offset

                    const startIndex = i - subindex
                    const endIndex = i

                    const start = path.substring(0, startIndex)
                    const end = path.substring(endIndex)

                    offsetPath = `${start}${offsetValue.toString()}${end}`

                    buffer = ""

                    console.log("flushing buffer", buffer, bufferValue)
                }

                subindex ++
            }
            if (point && OFFSET_POINTS[point]?.includes(subindex)) {
                keepReading = true

                console.log("starting buffer", point)
            }
            if (keepReading) {
                buffer += c
                console.log("adding to buffer", point, c)
            }
        }

        console.log("normal offset path", offsetPath)
        console.log("stroke offset path", offsetPath)

        return offsetPath
    }

    private static createFillRectForStroke (rect: RectDrawable) {
        const fillRect = {
            ...rect,
        }

        fillRect.width = rect.width! - rect.strokeWidth!
        fillRect.height = rect.height! - rect.strokeWidth!
        // TODO adjust corners
        const widthFactor = fillRect.width / rect.width
        const heightFactor = fillRect.height / rect.height
        const factor = (widthFactor + heightFactor) / 2

        let r = Array.isArray(rect.cornerRadius) ? rect.cornerRadius : [rect.cornerRadius]
        r = r.map((it) => factor * it)
        fillRect.cornerRadius = r.length === 1 ? r[0] : r

        console.log("adjusted radius", factor, rect.cornerRadius, fillRect.cornerRadius)

        return fillRect
    }

    private static createStrokeRect (rect: RectDrawable) {
        const strokeRect = {
            ...rect,
        }

        strokeRect.width = rect.width! + rect.strokeWidth!
        strokeRect.height = rect.height! + rect.strokeWidth!
        // TODO adjust corners
        const widthFactor = strokeRect.width / rect.width
        const heightFactor = strokeRect.height / rect.height
        const factor = (widthFactor + heightFactor) / 2

        let r = Array.isArray(rect.cornerRadius) ? rect.cornerRadius : [rect.cornerRadius]
        r = r.map((it) => factor * it)
        strokeRect.cornerRadius = r.length === 1 ? r[0] : r

        console.log("adjusted radius", factor, rect.cornerRadius, strokeRect.cornerRadius)

        return strokeRect
    }

    private static createFillOvalForStroke (oval: OvalDrawable) {
        const fillOval = {
            ...oval,
        }

        const radiusX = oval.radiusX ? oval.radiusX : oval.radius
        const radiusY = oval.radiusY ? oval.radiusY : oval.radius

        const width = radiusX! * 2
        const height = radiusY! * 2

        fillOval.radiusX = (width - oval.strokeWidth!) / 2
        fillOval.radiusY = (height - oval.strokeWidth!) / 2

        return fillOval
    }

    private static createStrokeOval (oval: OvalDrawable) {
        const fillOval = {
            ...oval,
        }

        const radiusX = oval.radiusX ? oval.radiusX : oval.radius
        const radiusY = oval.radiusY ? oval.radiusY : oval.radius

        const width = radiusX! * 2
        const height = radiusY! * 2

        fillOval.radiusX = (width + oval.strokeWidth!) / 2
        fillOval.radiusY = (height + oval.strokeWidth!) / 2

        return fillOval
    }

    private static computePathSize(path: string) {
        const ns = 'http://www.w3.org/2000/svg'

        const holder = document.createDocumentFragment() as DocumentFragment
        const svgElement = document.createElementNS(ns, "svg")
        const svgPathElement = document.createElementNS(ns, "path") as SVGPathElement

        // initialize
        svgPathElement.setAttribute("d", path)

        // append
        svgElement.appendChild(svgPathElement)
        holder.appendChild(svgElement)

        const pathLength = svgPathElement.getTotalLength()

        let minX = -Infinity
        let maxX = Infinity
        let minY = -Infinity
        let maxY = Infinity

        for (let i = 0; i < pathLength; i++) {
            const point = svgPathElement.getPointAtLength(i)
            const x = point.x
            const y = point.y

            if (x < minX) {
                minX = x
            } else if (x > maxX) {
                maxX = x
            }

            if (y < minY) {
                minY = y
            } else if (y > maxY) {
                maxY = y
            }
        }

        const w = maxX - minX
        const h = maxY - minY

        return {width: w, height: h} as Rect
    }
}