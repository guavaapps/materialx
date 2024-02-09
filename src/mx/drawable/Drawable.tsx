import {ComponentUtils} from "../components/Component";
import {Line, Shape} from "./Shape";
import {TextView} from "../components/textView/TextView";
import {AttributeSet} from "../styles/Style";
import React from "react";

export function Drawable (params: ComponentUtils.ComponentParams) {
    const children = ComponentUtils.getChildren(params)
}

export function ShapeDrawable (shape: Shape) {
    const path = Shape.createPath(shape)
    const shapeObject = ShapeObject.createShapeObject(shape)

    return (
        <path d={path} {...shapeObject}/>
    )
}

namespace ShapeObject {
    export function createShapeObject (shape: Shape) {
        const s = shape as AttributeSet
        const o: AttributeSet = {
            stroke: s.strokeColor ?? "#000000",
            strokeWidth: s.strokeWidth ?? 0,
            strokeLineCap: s.strokeCap ? getLineCap(s.strokeCap) : "butt",
            fill: s.fillColor ?? "#000000"
        }

        return o
    }

    function getLineCap (cap: Line.Cap) {
        if (cap === Line.Cap.Butt) {
            return "butt"
        }
        else if (cap === Line.Cap.Round) {
            return "round"
        }

        return "square"
    }
}