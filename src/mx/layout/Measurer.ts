import {Rect, useOnLayoutHandler} from "./Layout";
import React, {ReactElement, ReactFragment, ReactNode, useState} from "react";
import {ComponentUtils} from "../components/Component";
import {LayoutParams} from "./LayoutParams";
import {Numbers} from "../../guava-utils/Numbers";

export namespace Measurer {
    import MATCH_PARENT = LayoutParams.MATCH_PARENT;
    import WRAP_CONTENT = LayoutParams.WRAP_CONTENT;

    const LAYOUT = ["CoordinatorLayout", "LinearLayout", "ConstraintLayout"]

    export function useMeasurer(parentParams: ComponentUtils.ComponentParams, children: ReactNode,
                                onMeasure: (children: React.ReactElement<unknown, string
                                                    | React.JSXElementConstructor<any>>
                                                | number
                                                | string
                                                | undefined
                                                | null
                                                | ReactFragment,
                                            bounds: Rect[]) => void
    ) {
        const ref = useOnLayoutHandler(bounds => {
            const components: ReactElement[] = Array.isArray(children) ? children as ReactElement[] : [children] as ReactElement[]

            if (!ref.current) return

            const c = ref.current.children
            const childMeasuredBounds: Rect[] = []

            const componentParams: ComponentUtils.ComponentParams[] = []
            const componentBounds: Rect[] = []

            for (let child of c) {
                const measuredBounds = child.getBoundingClientRect()

                childMeasuredBounds.push({
                    width: measuredBounds.width,
                    height: measuredBounds.height
                })
            }

            for (let i = 0; i < components.length; i++) {
                const component = components[i].props as ComponentUtils.ComponentParams

                const minWidth = component.minWidth ?? 0
                const minHeight = component.minHeight ?? 0

                const maxWidth = component.maxWidth ?? Number.MAX_VALUE
                const maxHeight = component.maxHeight ?? Number.MAX_VALUE

                const declaredWidth = component.width ?? 0
                const declaredHeight = component.height ?? 0

                let width = declaredWidth
                let height = declaredHeight

                if (declaredWidth === MATCH_PARENT) {
                    width = Numbers.inRange(bounds.width, minWidth, maxWidth)
                } else if (declaredWidth === WRAP_CONTENT) {
                    width = Numbers.inRange(childMeasuredBounds[i].width, minWidth, maxWidth)
                }

                if (declaredHeight === MATCH_PARENT) {
                    height = Numbers.inRange(bounds.height, minHeight, maxHeight)
                } else if (declaredHeight === WRAP_CONTENT) {
                    height = Numbers.inRange(childMeasuredBounds[i].height, minHeight, maxHeight)
                }

                const measuredParams = {...component}
                measuredParams.width = width
                measuredParams.height = height

                componentParams.push(measuredParams)
                componentBounds.push({
                    width: width,
                    height: height
                })
            }

            const newChildren = React.Children
                .map(children, (child, i) => {
                    if (React.isValidElement(child)) {
                        return React.cloneElement(child, componentParams[i])
                    }
                    return child
                })

            onMeasure(newChildren, componentBounds)
        })

        return ref
    }
}