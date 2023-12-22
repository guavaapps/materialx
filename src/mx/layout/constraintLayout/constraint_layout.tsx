import {Id, Layout, LayoutParams, useOnLayoutHandler} from "../layout";
import {ReactElement, RefObject, useState} from "react";
import {ComponentProps} from "../../components/Props";
import {AttrMap} from "../../styles/style";
import {Rect} from "../../shapes/shapes";

export type ConstrainLayoutParams = {
    leftToLeftOf: string,
    leftToRightOf: string,
    rightToLeftOf: string,
    rightToRightOf: string,
    topToTopOf: string,
    topToBottomOf: string,
    bottomToTopOf: string,
    bottomToBottomOf: string
} & LayoutParams

function isLeftConstraint(constraint: string) {
    return constraint.startsWith("left")
}

function isRightConstraint(constraint: string) {
    return constraint.startsWith("right")
}

function isTopConstraint(constraint: string) {
    return constraint.startsWith("top")
}

function isBottomConstraint(constraint: string) {
    return constraint.startsWith("bottom")
}

function getConstraintLayoutParams(params: LayoutParams) {
    const constraintAttributes = [
        "leftToLeftOf",
        "leftToRightOf",
        "rightToLeftOf",
        "rightToRightOf",
        "topToTopOf",
        "topToBottomOf",
        "bottomToTopOf",
        "bottomToBottomOf",
    ]
    const attributes = Object.keys(params)

    const constraints = attributes.filter((it) => constraintAttributes.includes(it))

    let isConstrainedLeft = false
    let isConstrainedRight = false
    let isConstrainedTop = false
    let isConstrainedBottom = false

    const validConstraints = constraints.filter((it) => {
        const isLeftValid = isLeftConstraint(it) && !isConstrainedLeft
        const isRightValid = isRightConstraint(it) && !isConstrainedRight
        const isTopValid = isTopConstraint(it) && !isConstrainedTop
        const isBottomValid = isBottomConstraint(it) && !isConstrainedBottom

        if (isLeftValid) {
            isConstrainedLeft = true
        }
        if (isRightValid) {
            isConstrainedRight = true
        }
        if (isTopValid) {
            isConstrainedTop = true
        }
        if (isBottomValid) {
            isConstrainedBottom = true
        }

        return isLeftValid || isRightValid || isTopValid || isBottomValid
    })

    const validParams = validConstraints.map((it) => {
        const pair: AttrMap = {}
        pair[it] = params[it as keyof typeof params]

        return pair
    })

    return Object.assign({}, ...validParams) as ConstrainLayoutParams
}

export type ConstraintLayoutProps = {} & ComponentProps

/**
 TODO

 */

export function ConstraintLayout(props: ConstraintLayoutProps) {
    const ref = useOnLayoutHandler((bounds) => {
        console.log("CL", "onLayout", bounds)

        let elements = props.children as ReactElement[]
        elements = Array.isArray(elements) ? elements : [elements]

        console.log("elements", elements)

        elements.forEach((it, i) => {
            const id = it.props.id
            const layoutParams = it.props.layoutParams

            const objectBounds = ref?.current?.children?.item(i)?.getBoundingClientRect()
            const bounds: Rect = {
                width: objectBounds?.width || 0,
                height: objectBounds?.height || 0
            }
        })
    })

    return (<div ref={ref as RefObject<HTMLDivElement>}>
        {props.children}
    </div>)
}

export namespace ConstraintLayout {
    export class LayoutParams extends Layout.LayoutParams{
        static readonly PARENT = -2
        leftToLeft: number = LayoutParams.UNSET
        leftToRight: number = LayoutParams.UNSET

        rightToLeft: number = LayoutParams.UNSET
        rightToRight: number = LayoutParams.UNSET

        topToTop: number = LayoutParams.UNSET
        topToBottom = LayoutParams.UNSET

        bottomToTop = LayoutParams.UNSET
        bottomToBottom = LayoutParams.UNSET
        baseline: number = LayoutParams.UNSET

        constructor(source: Layout.LayoutParams) {
            super(source)

            // TODO
        }
    }
}

export type TestProps = {
    text: string
} & ComponentProps

export function LayoutTestComponent(props: TestProps) {
    return (<p>{props.text}</p>)
}