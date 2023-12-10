import {Id, LayoutParams, useOnLayoutHandler} from "./layout";
import {ReactElement, RefObject, useState} from "react";
import {ComponentProps} from "../components/Props";
import {AttrMap} from "../styles/style";
import {styled} from "../theme";
import {Rect} from "../shapes/shapes";

type Side = "left" | "top" | "right" | "bottom"

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

type ConstraintBox = {
    left: number | "unset",
    right: number | "unset",
    top: number | "unset",
    bottom: number | "unset"
}

type Constraint = {
    anchor: string,
    anchorSide: Side,

    node: string,
    nodeSide: Side
}

class ConstraintLayoutMeasurer {
    private bounds = new Map()

    private leftToLeftOf = new Map()
    private leftToRightOf = new Map()
    private rightToLeftOf = new Map()
    private rightToRightOf = new Map()
    private topToTopOf = new Map()
    private topToBottomOf = new Map()
    private bottomToTopOf = new Map()
    private bottomToBottomOf = new Map()

    addComponent(id: string, bounds: Rect, layoutParams: LayoutParams) {
        const constraints = getConstraintLayoutParams(layoutParams)

        this.bounds.set(id, bounds)

        this.leftToLeftOf.set(id, constraints.leftToLeftOf)
        this.leftToRightOf.set(id, constraints.leftToRightOf)
        this.rightToLeftOf.set(id, constraints.rightToLeftOf)
        this.rightToRightOf.set(id, constraints.rightToRightOf)
        this.topToTopOf.set(id, constraints.topToTopOf)
        this.topToBottomOf.set(id, constraints.topToBottomOf)
        this.bottomToTopOf.set(id, constraints.bottomToTopOf)
        this.bottomToBottomOf.set(id, constraints.bottomToBottomOf)
    }

    private validateConstraints() {
        this.leftToLeftOf.forEach((it) => {
            if (!this.leftToLeftOf.get(it)) {
                this.leftToLeftOf.delete(it)
            }
        })

        this.leftToRightOf.forEach((it) => {
            if (!this.leftToRightOf.get(it)) {
                this.leftToRightOf.delete(it)
            }
        })

        this.rightToLeftOf.forEach((it) => {
            if (!this.rightToLeftOf.get(it)) {
                this.rightToLeftOf.delete(it)
            }
        })

        this.rightToRightOf.forEach((it) => {
            if (!this.rightToRightOf.get(it)) {
                this.rightToRightOf.delete(it)
            }
        })

        this.topToTopOf.forEach((it) => {
            if (!this.topToTopOf.get(it)) {
                this.topToTopOf.delete(it)
            }
        })

        this.topToBottomOf.forEach((it) => {
            if (!this.topToBottomOf.get(it)) {
                this.topToBottomOf.delete(it)
            }
        })

        this.bottomToTopOf.forEach((it) => {
            if (!this.bottomToTopOf.get(it)) {
                this.bottomToTopOf.delete(it)
            }
        })

        this.bottomToBottomOf.forEach((it) => {
            if (!this.bottomToBottomOf.get(it)) {
                this.bottomToBottomOf.delete(it)
            }
        })
    }

    private createConstraints() {
        const sides = ["left", "right", "top", "bottom"]

        const constraintPoints: Constraint[] = []

        for (const s1 of sides) {
            for (const s2 of sides) {
                const f = s2.charAt(0).toUpperCase()
                const _s2 = `${f}${s2.substring(1)}`

                const type = `${s1}To${_s2}Of`

                if (!Object.keys(this).includes(type)) {
                    continue
                }

                const constraints = this[type as keyof typeof this] as Map<string, string>

                // console.log("cc", type, constraints)

                for (const c of constraints) {
                    const [node, anchor] = c

                    if (anchor === undefined) {
                        continue
                    }

                    const constraint: Constraint = {
                        anchor: anchor,
                        anchorSide: s2 as Side,
                        node: node,
                        nodeSide: s1 as Side
                    }

                    constraintPoints.push(constraint)
                }
            }
        }

        return constraintPoints
    }

    private createBoxes() {
        const boxes = new Map<string, ConstraintBox>()

        const ids = Object.keys(this.bounds)
        for (const id of ids) {
            boxes.set(id, {
                left: "unset",
                right: "unset",
                top: "unset",
                bottom: "unset"
            })
        }

        return boxes
    }

    private layout(w: number, h: number, c: Constraint[]) {
        const boxes = this.createBoxes()
        boxes.set("parent", {
            left: 0,
            top: 0,
            right: w,
            bottom: h
        })

        let parents = ["parent"]

        while (parents.length > 0) {
            for (const parent of parents) {
                parents.shift()

                const adjs = c.filter((it) => it.anchor === parent)
                for (const adj of adjs) {
                    if (adj.anchorSide === "left") {
                        const p = boxes.get(parent)!.left

                        if (adj.nodeSide === "left") {
                            boxes.get(adj.node)!.left = p
                        } else if (adj.nodeSide === "right") {
                            boxes.get(adj.node)!.right = p
                        }
                    } else if (adj.anchorSide === "right") {
                        const p = boxes.get(parent)!.right

                        if (adj.nodeSide === "left") {
                            boxes.get(adj.node)!.left = p
                        }
                        else if (adj.nodeSide === "right"){
                            boxes.get(adj.node)!.right = p
                        }
                    }
                }
            }
        }
    }

    measure(layoutWidth: number, layoutHeight: number) {
        this.validateConstraints()

        const constraints: Constraint[] = this.createConstraints()

        const ids = Object.keys(this.bounds)

        console.log("constraints", constraints)
    }
}

export function ConstraintLayout(props: ConstraintLayoutProps) {
    const measurer = new ConstraintLayoutMeasurer()

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

            measurer.addComponent(id, bounds, layoutParams)
        })

        measurer.measure(100, 50)
    })

    return (<div ref={ref as RefObject<HTMLDivElement>}>
        {props.children}
    </div>)
}

export type TestProps = {
    text: string
} & ComponentProps

export function LayoutTestComponent(props: TestProps) {
    return (<p>{props.text}</p>)
}