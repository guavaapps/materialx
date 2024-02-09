import {TextView} from "../components/textView/TextView";

abstract class Stroke {
    abstract strokeColor?: number
    abstract strokeWidth?: number

    abstract dashWidth?: number
    abstract dashGap?: number
    abstract dashIntervals?: number[]
    abstract dashPhase?: number

    abstract stokeCap?: Line.Cap
}

export abstract class Line extends Stroke{
    abstract width: number
    abstract height: number
}

export abstract class Path extends Stroke{
    abstract path: string
}

export abstract class Rect extends Stroke{
    abstract width: number
    abstract height: number

    abstract cornerRadius?: number | number[]
    abstract cornerStyle?: Rect.CornerStyle[]

    abstract fillColor?: number
}

export abstract class Oval extends Stroke{
    abstract width: number
    abstract height: number

    abstract fillColor?: number
}

export type Shape = Line | Rect | Oval | Path

export namespace Line {
    export enum Cap {
        Butt,
        Round,
        Square
    }
    export enum Dash {
        ALIGN_CENTER,
        ALIGN_START,
        ALIGN_END
    }
}

export namespace Rect {
    export enum CornerStyle {
        ROUND,
        CUT
    }
}

export namespace Line {
    export function createLinePath(line: Line) {
        const w = line.width
        const h = line.height

        const hy = Math.sqrt(w * w + h * h)
        const sin = h / hy
        const cos = w / hy

        let {
            dashWidth,
            dashGap,
            dashIntervals,
            dashPhase
        } = line

        if (dashWidth && dashGap) {
            let dash = dashWidth + dashGap
            let fCount = hy / dash
            let count = Math.floor(fCount)

            let p: string[] = []

            for (let i = 0; i < count; i++) {
                let startOffset = i * dash
                let endOffset = i * dashWidth

                let sX = cos * startOffset
                let sY = sin * startOffset
                let eX = cos * endOffset
                let eY = sin * endOffset

                p.push(`M${sX},${sY} L${eX},${eY}`)
            }

            // TODO add residual dash

            return p.join(" ")
        }
        else if (dashIntervals && dashPhase) {
            // TODO impl
            return ""
        }

        return `M0,0 L${w},${h}`
    }
}

export namespace Rect {
    export function createRectPath (rect: Rect) {
        // if all corner radii are 0 create a sharp rect
        if (isSharpRect(rect)) {
            const p = `M0, 0 H${rect.width} V${rect.height} H0 Z`

            return p
        }

        // format create 8-long array of radii
        let radii = Array.isArray(rect.cornerRadius) ? rect.cornerRadius : [rect.cornerRadius!]
        if (radii.length === 1) {
            const radius = radii[0]
            radii = new Array<number>(8)
            radii = radii.map(it => radius)
        }
        else if (radii.length === 4) {
            const copy = [...radii]
            radii = new Array<number>(8)
            copy.forEach((it, i) => {
                radii[2 * i] = it
                radii[2 * i + 1] = it
            })
        }
        else if (radii.length !== 8) {
            // error
        }

        let r = radii

        let p = `${cTopLeft(rect.cornerStyle![0], radii, rect.width, rect.height)} H${rect.width - r[2]} ${cTopRight(rect.cornerStyle![1], radii, rect.width, rect.height)} V${rect.height! - r[4]} ${cBottomRight(rect.cornerStyle![2], radii, rect.width, rect.height)} H${r[6]} ${cBottomLeft(rect.cornerStyle![3], radii, rect.width, rect.height)} Z`
        // p = `M0,${r[0]} A${r[0]},${r[1]},0,0,1,${r[1]},0 H${w - r[2]} A${r[2]},${r[3]},0,0,1,${w},${r[3]} V${h! - r[4]} A${r[4]},${r[5]},0,0,1,${w! - r[5]},${h!} H${r[6]} A${r[6]},${r[7]},0,0,1,0,${h! - r[7]} Z`

        return p
    }

    function isSharpRect (rect: Rect) {
        const radii = Array.isArray(rect.cornerRadius) ? rect.cornerRadius : [rect.cornerRadius!]

        return !radii.some(it => it !== 0)
    }

    function rectNoCorners (w: number, h: number) {

    }

    function cTopLeft (cornerStyle: Rect.CornerStyle, r: number[], w: number, h: number) {
        if (cornerStyle === Rect.CornerStyle.ROUND) {
            return `M0,${r[0]} A${r[0]},${r[1]},0,0,1,${r[1]},0`
        }

        return `M0,${r[0]} L${r[1]},0`
    }

    function cTopRight (cornerStyle: Rect.CornerStyle, r: number[], w: number, h: number) {
        if (cornerStyle === Rect.CornerStyle.ROUND) {
            return `A${r[2]},${r[3]},0,0,1,${w},${r[3]}`
        }

        return `L${w},${r[3]}`
    }

    function cBottomRight (cornerStyle: Rect.CornerStyle, r: number[], w: number, h: number) {
        if (cornerStyle === Rect.CornerStyle.ROUND) {
            return `A${r[4]},${r[5]},0,0,1,${w! - r[5]},${h!}`
        }

        return `L${w - r[5]},${h}`
    }

    function cBottomLeft (cornerStyle: Rect.CornerStyle, r: number[], w: number, h: number) {
        if (cornerStyle === Rect.CornerStyle.ROUND) {
            return `A${r[6]},${r[7]},0,0,1,0,${h! - r[7]}`
        }

        return `L0,${h - r[7]}`
    }

}

export namespace Oval {
    export function createOvalPath (oval: Oval) {
        const rx = oval.width / 2
        const ry = oval.height / 2

        let p = `M${rx - 1},${0} A${rx},${ry},0,1,0,${rx + 1},${0} Z`

        return p
    }

}

export namespace Shape {
    export function createPath (shape: Shape) {
        if (shape instanceof Line) {
            return Line.createLinePath(shape)
        }
        else if (shape instanceof Rect) {
            return Rect.createRectPath(shape)
        }
        else if (shape instanceof Oval) {
            return Oval.createOvalPath(shape)
        }

        return shape.path
    }
}