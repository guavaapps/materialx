import {Component, ComponentUtils} from "../../components/Component";
import measure = ComponentUtils.measure;
import React, {ReactElement, ReactNode, useState} from "react";
import {Measurer} from "../Measurer";
import useMeasurer = Measurer.useMeasurer;
import {LayoutParams} from "../LayoutParams";
import WRAP_CONTENT = LayoutParams.WRAP_CONTENT;
import {Rect} from "../Layout";
import {AttributeSet} from "../../styles/Style";

export function CoordinatorLayout(params: ComponentUtils.ComponentParams) {
    const [width, setWidth] = useState(params.width ?? 0)
    const [height, setHeight] = useState(params.height ?? 0)

    const [measuredChildren, setMeasuredChildren] = useState(params.children)

    const ref = useMeasurer(
        params,
        params.children,
        children => {
            if (params.width === WRAP_CONTENT) {
                const wrapWidth = measureWrapWidth(children)
                setWidth(wrapWidth)
            }
            if (params.height === WRAP_CONTENT) {
                const wrapHeight = measureWrapHeight(children)
                setHeight(wrapHeight)
            }

            setMeasuredChildren(children)
        }
    )

    // const positionedChildren = React.Children.map(measuredChildren, child => {
    //     if (React.isValidElement(child)) {
    //
    //     }
    // })

    const object = createParamsObject(params)

    return (
        <Component x={params.x} y={params.y} width={params.width} height={params.height} ref={ref}>
            <div id={params.id} ref={ref as React.RefObject<HTMLDivElement>} style={object}>
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
    obj.width = params.width
    obj.height = params.height

    return obj
}

function measureWrapWidth(children: ReactNode) {
    let maxBound = 0

    for (let child of children as ReactElement[]) {
        const childParams = child.props as ComponentUtils.ComponentParams

        const x = childParams.x ?? 0
        const width = childParams.width ?? 0

        const bound = x + width

        if (bound > maxBound) {
            maxBound = bound
        }
    }

    return maxBound
}

function measureWrapHeight(children: ReactNode) {
    let maxBound = 0

    for (let child of children as ReactElement[]) {
        const childParams = child.props as ComponentUtils.ComponentParams

        const y = childParams.y ?? 0
        const height = childParams.height ?? 0

        const bound = y + height

        if (bound > maxBound) {
            maxBound = bound
        }
    }

    return maxBound
}