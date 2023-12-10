export type Rect = {
    width: number,
    height: number
}

export type Oval = {
    radius?: number
    radiusX?: number
    radiusY?: number
}

export type Path = {
    path: string
}

export type Shape = Rect | Oval | Path

export class ShapeUtils {
    static isRect (shape: Shape) {
        const shapeProps = Object.keys(shape)

        return shapeProps.includes("width") && shapeProps.includes("height")
    }

    static isOval (shape: Shape) {
        const shapeProps = Object.keys(shape)

        return shapeProps.includes("radius") || shapeProps.includes("radiusX") || shapeProps.includes("radiusY")
    }

    static isPath (shape: Shape) {
        const shapeProps = Object.keys(shape)

        return shapeProps.includes("path")
    }
}

export class InvalidShapeError extends Error {
    constructor(shape: any, msg?: string) {
        const message = `${shape} is not a valid shape. ${msg}`

        super(message);
    }
}