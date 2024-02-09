import {Component, ComponentUtils} from "../../components/Component";
import measure = ComponentUtils.measure;
import React, {ReactElement, ReactNode, useState} from "react";
import {Measurer} from "../Measurer";
import useMeasurer = Measurer.useMeasurer;
import {LayoutParams} from "../LayoutParams";
import WRAP_CONTENT = LayoutParams.WRAP_CONTENT;
import {Rect} from "../Layout";
import {AttributeSet} from "../../styles/Style";
import {pseudoRandomBytes} from "node:crypto";
import MATCH_PARENT = LayoutParams.MATCH_PARENT;

export function CoordinatorLayout(params: ComponentUtils.ComponentParams) {
    const [width, setWidth] = useState(params.width ?? 0)
    const [height, setHeight] = useState(params.height ?? 0)

    const [measuredChildren, setMeasuredChildren] = useState(params.children)

    const ref = useMeasurer(
        params,
        params.children,
        (children, bounds) => {
            if (params.width === WRAP_CONTENT) {
                console.log("wrap", params.id, canWrapWidth(children))

                if (!canWrapWidth(children)) {
                    setWidth(MATCH_PARENT)
                }
                else {
                    const wrapWidth = measureWrapWidth(children, bounds)
                    setWidth(wrapWidth)
                }
            }
            if (params.height === WRAP_CONTENT) {
                if (canWrapHeight(children)) {
                    setHeight(MATCH_PARENT)
                }
                else {
                    const wrapHeight = measureWrapHeight(children, bounds)
                    setHeight(wrapHeight)
                }
            }

            // setMeasuredChildren(children)
        }
    )

    const object = createParamsObject(params)

    return (//ref={ref as React.RefObject<HTMLDivElement>} style={object} on div
        <Component id={params.id} x={params.x} y={params.y} width={width} height={height} ref={ref}>
            <div>
                {measuredChildren}
            </div>
        </Component>
    )
}

function createParamsObject(params: ComponentUtils.ComponentParams) {
    const obj: AttributeSet = {}

    obj.display = "block"
    obj.background = "#ff00ff80"
    obj.position = "absolute"
    // obj.width = params.width
    // obj.height = params.height

    return obj
}

function canWrapWidth(children: ReactNode) {
    return React.Children.toArray(children).find(it =>
        React.isValidElement(it) && it.props.width !== MATCH_PARENT) === undefined
}

function canWrapHeight(children: ReactNode) {
    return React.Children.toArray(children).find(it =>
        React.isValidElement(it) && it.props.height !== MATCH_PARENT) === undefined
}

function measureWrapWidth(children: ReactNode, bounds: Rect[]) {
    let maxBound = 0

    const c = children as ReactElement[]
    const count = c.length
    for (let i = 0; i < count; i++) {
        const child = c[i]
        const childParams = child.props as ComponentUtils.ComponentParams
        const b = bounds[i]

        const x = childParams.x ?? 0
        const width = b.width//childParams.width ?? 0

        const bound = x + width

        if (bound > maxBound) {
            maxBound = bound
        }
    }

    return maxBound
}

function measureWrapHeight(children: ReactNode, bounds: Rect[]) {
    let maxBound = 0

    const c = children as ReactElement[]
    const count = c.length
    for (let i = 0; i < count; i++) {
        const child = c[i]
        const childParams = child.props as ComponentUtils.ComponentParams
        const b = bounds[i]

        const y = childParams.y ?? 0
        const height = b.height//childParams.height ?? 0

        const bound = y + height

        if (bound > maxBound) {
            maxBound = bound
        }
    }

    return maxBound
}