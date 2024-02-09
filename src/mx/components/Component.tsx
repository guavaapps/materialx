import {Layout, Rect, useOnLayoutHandler} from "../layout/Layout";
import React, {CSSProperties, forwardRef, ReactElement, ReactNode, RefObject, useState} from "react";
import {ConstraintLayout} from "../layout/constraintLayout/ConstraintLayout";
import {CoordinatorLayout} from "../layout/coordinator-layout/CoordinatorLayoutParams";
import {useTheme} from "../theme/Theme";
import {AttributeSet, Style} from "../styles/Style";
import {LayoutParams} from "../layout/LayoutParams";
import MATCH_PARENT = LayoutParams.MATCH_PARENT;
import WRAP_CONTENT = LayoutParams.WRAP_CONTENT;
import {Component as C} from "./ComponentParams";

export const Component = forwardRef(function Component(params: ComponentUtils.ComponentParams, ref) {
    const p = C.ComponentParams.withDefaults(params)

    const child = ComponentUtils.getChildren(params)[0]
    const component = ComponentUtils.create(child)

    const layoutParams = params as Layout.LayoutParams
    // const theme = useTheme()
    // const style = params.style

    // const componentStyle = style === undefined ? theme as Style : Style.extend(style, theme)

    const [bounds, setBounds] = useState({
        width: 0, height: 0
    } as Rect)

    const [isEnabled, setEnabled] = useState(p.isEnabled)

    let declaredWidth: number | string = params.width ?? 0
    let declaredHeight: number | string = params.height ?? 0

    console.log("declaredSize", declaredWidth, declaredHeight)

    if (params.width === MATCH_PARENT) {
        declaredWidth = "100%"
    }
    else if (params.width === WRAP_CONTENT) {
        declaredWidth = "auto"
    }

    if (params.height === MATCH_PARENT) {
        declaredHeight = "100%"
    }
    else if (params.height === WRAP_CONTENT) {
        declaredHeight = "auto"
    }

    // const ref = useOnLayoutHandler((bounds) => {
    //     const measuredWidth = bounds.width
    //     const measuredHeight = bounds.height
    //
    //     let width = 0
    //     let height = 0
    //
    //     if (layoutParams.width === WRAP_CONTENT) {
    //         if (measuredWidth > layoutParams.minWidth!) {
    //             if (measuredWidth < layoutParams.maxWidth!) {
    //                 width = measuredWidth
    //             } else {
    //                 width = layoutParams.maxWidth!
    //             }
    //         } else {
    //             width = layoutParams.minWidth!
    //         }
    //     } else {
    //         if (layoutParams.width! > layoutParams.minWidth!) {
    //             if (layoutParams.width! < layoutParams.maxWidth!) {
    //                 width = layoutParams.width!
    //             } else {
    //                 width = layoutParams.maxWidth!
    //             }
    //         } else {
    //             width = layoutParams.minWidth!
    //         }
    //     }
    //
    //     if (layoutParams.height === WRAP_CONTENT) {
    //         if (measuredHeight > layoutParams.minHeight!) {
    //             if (measuredHeight < layoutParams.maxHeight!) {
    //                 height = measuredHeight
    //             } else {
    //                 height = layoutParams.maxHeight!
    //             }
    //         } else {
    //             height = layoutParams.minHeight!
    //         }
    //     } else {
    //         if (layoutParams.height! > layoutParams.minHeight!) {
    //             if (layoutParams.height! < layoutParams.maxHeight!) {
    //                 height = layoutParams.height!
    //             } else {
    //                 height = layoutParams.maxHeight!
    //             }
    //         } else {
    //             height = layoutParams.minHeight!
    //         }
    //     }
    //
    //     setBounds({width: width, height: height})
    // })

    const object: AttributeSet = {
        ...ComponentContainerLayoutObject,
        // width: declaredWidth,
        // height: declaredHeight
    }

    if (declaredWidth >= 0 || true) {
        object.width = declaredWidth
    }
    if (declaredHeight >= 0 || true) {
        object.height = declaredHeight
    }

    object.left = params.x ?? 0
    object.top = params.y ?? 0
    object.background = "#ff00ff10"

    console.log("id", params.id)
    console.log("object", object)

    return ( // removed ref
        <div id={params.id} ref={ref as React.RefObject<HTMLDivElement>} style={object}>
            {component}
        </div>
    )

})

export namespace ComponentUtils {
    export function getChildren(params: ComponentUtils.ComponentParams): ReactElement[] {
        return Array.isArray(params.children) ? params.children as ReactElement[] : [params.children] as ReactElement[]
    }

    export function create(element: ReactElement) {
        return React.Children.map(element, (e, i) => {
            const params = e.props as ComponentUtils.ComponentParams
            const object = {...ComponentLayoutObject}

            if (params.width === MATCH_PARENT) {
                object.width = "100%"
            }
            if (params.height === MATCH_PARENT) {
                object.height = "100%"
            }

            return React.cloneElement(e, {
                style: {...object}
            })
        })
    }

    export function measure(params: Layout.LayoutParams) {
        const Measures = {
            left: params.x,
            top: params.y,
            width: params.width,
            height: params.height,

            marginLeft: params.marginLeft,
            marginTop: params.marginTop,
            marginRight: params.marginRight,
            marginBottom: params.marginBottom,
        }
    }

    export type ComponentParams = {
        id?: string,
        isEnabled?: boolean,
        children?: React.ReactNode,
        style?: Style,
    } & Layout.LayoutParams
        & ConstraintLayout.LayoutParams
        & CoordinatorLayout.CoordinatorLayoutParams

    export namespace ComponentParams {
        export function withDefaults(params: ComponentUtils.ComponentParams) {
            const p = Object.assign({}, params)

            p.isEnabled = p.isEnabled ?? true

            return p
        }
    }
}

const ComponentContainerLayoutObject: CSSProperties = {
    // all: "unset",
    display: "block",
    position: "absolute",
    // width: "auto",
    // height: "auto",
    backgroundColor: "red"
}

const ComponentLayoutObject = {
    // all: "unset",
    display: "block",
    width: "100%",
    height: "100%",
    position: "relative",
    backgroundColor: "#0000ff10"
}