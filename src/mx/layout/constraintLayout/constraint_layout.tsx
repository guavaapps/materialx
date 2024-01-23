import {Id, Layout, LayoutParams, useOnLayoutHandler} from "../layout";
import {ReactElement, RefObject, useState} from "react";
import {Component} from "../../components/Props";
import {AttrMap} from "../../styles/style";
import {Rect} from "../../shapes/shapes";
import {Ids} from "../../resources/id/Id";
const MATCH_PARENT = Layout.LayoutParams.MATCH_PARENT
const WRAP_CONTENT = Layout.LayoutParams.WRAP_CONTENT

export type ConstraintLayoutProps = {} & Component

/**
 TODO

 */

export function ConstraintLayout(props: ConstraintLayoutProps) {
    const ref = useOnLayoutHandler((bounds) => {
        console.log("CL", "onLayout", bounds)

        let elements = props.children as ReactElement[]
        elements = Array.isArray(elements) ? elements : [elements]

        console.log("elements", elements)

        const childrenLayoutParams = new Map<string, ConstraintLayout.LayoutParams>()

        elements.forEach((it, i) => {
            const id = it.props.id
            const layoutParams = it.props.layoutParams as ConstraintLayout.LayoutParams

            const objectBounds = ref?.current?.children?.item(i)?.getBoundingClientRect()
            const bounds: Rect = {
                width: objectBounds?.width || 0,
                height: objectBounds?.height || 0
            }

            // from layout
            let mWidth = bounds.width
            let mHeight = bounds.height

            // width
            if (layoutParams.width === MATCH_PARENT) {
                mWidth = bounds.width
            }
            else if (layoutParams.width === WRAP_CONTENT) {
                // TODO lock measurer
                // if a child is set to WRAP_CONTENT it needs to be measured
                // first before this layout can be
            }
            else {
                if (mWidth < layoutParams.minWidth) {
                    mWidth = layoutParams.minWidth
                } else if (mWidth > layoutParams.maxWidth) {
                    mWidth = layoutParams.maxWidth
                }

                if (mHeight < layoutParams.minHeight) {
                    mHeight = layoutParams.minHeight
                } else if (mHeight > layoutParams.maxHeight) {
                    mHeight = layoutParams.maxHeight
                }
            }

            // height
            if (layoutParams.height === MATCH_PARENT) {
                mHeight = bounds.height
            }
            else if (layoutParams.height === WRAP_CONTENT) {

            }
            else {
                if (mHeight < layoutParams.minHeight) {
                    mHeight = layoutParams.minHeight
                } else if (mHeight > layoutParams.maxHeight) {
                    mHeight = layoutParams.maxHeight
                }
            }

            // update layout params
            layoutParams.measuredWidth = mWidth
            layoutParams.measuredHeight = mHeight

            childrenLayoutParams.set(id, layoutParams)
        })
    })

    return (<div ref={ref as RefObject<HTMLDivElement>}>
        {props.children}
    </div>)


}

export namespace ConstraintLayout {
    export class LayoutParams extends Layout.LayoutParams {
        static readonly PARENT = -4
        leftToLeft: number | string = LayoutParams.UNSET
        leftToRight: number | string = LayoutParams.UNSET

        rightToLeft: number | string = LayoutParams.UNSET
        rightToRight: number | string = LayoutParams.UNSET

        topToTop: number | string = LayoutParams.UNSET
        topToBottom: number | string = LayoutParams.UNSET

        bottomToTop: number | string = LayoutParams.UNSET
        bottomToBottom: number | string = LayoutParams.UNSET
        baseline: number = LayoutParams.UNSET

        constructor(source?: Layout.LayoutParams) {
            super(source)

            // TODO
        }
    }

    // export class Measurer {
    //     private view: Component
    {/*    private children: Component[]*/}

    //     private system: ConstraintSystem
    //
    //     constructor(view: Component) {
    //         this.view = view
    //
    //         this.children = Layout.getChildren(view)
    //
    //         const idManager = new Ids()
    //
    //         const childrenLayoutParams = new Map<number, LayoutParams>()
    //         for (let child of this.children) {
    //             if (child.id) {
    //                 idManager.add(child.id)
    //             }
    //         }
    //
    //         const ids = idManager.generate()
    //
    //         for (let i = 0; i < this.children.length; i++) {
    //             const child = this.children[i]
    //
    //             if (child.id) {
    //                 childrenLayoutParams.set(ids[i], child.layoutParams! as ConstraintLayout.LayoutParams)
    //             }
    //         }
    //
    //         this.system = new ConstraintSystem(LayoutParams.PARENT, view.layoutParams! as ConstraintLayout.LayoutParams, childrenLayoutParams)
    //     }
    //
    //     measure() {
    //         const system = this.system
    //
    //         system.measure()
    //     }
    // }
}

export type TestProps = {
    text: string
} & Component

export function LayoutTestComponent(props: TestProps) {
    return (<p>{props.text}</p>)
}