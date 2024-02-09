import {createContext, ReactElement, ReactNode, useLayoutEffect, useRef, useState} from "react";
import {ComponentUtils} from "../components/Component";

export type Id = string | "parent"

export type Rect = {
    width: number,
    height: number
}

export function useOnLayoutHandler(callback: (bounds: Rect) => any) {
    const ref = useRef<HTMLElement>(null)
    const [r, updateRef] = useState(ref.current)

    useLayoutEffect(() => {
        const bounds: Rect = {
            width: ref.current?.clientWidth || 100,
            height: ref.current?.offsetHeight || 50,
        }

        updateRef(ref.current)

        callback(bounds)
    }, [r])

    return ref
}

export class Layout {
    static getChildren (view: ComponentUtils.ComponentParams) {
        let children = view.children as ReactElement[]
        children = Array.isArray(children) ? children : [children]
        let c = children.map(it => it.props as ComponentUtils.ComponentParams)

        return c
    }
}

export namespace Layout {
    export class LayoutParams {
        static readonly MATCH_PARENT = -1
        static readonly WRAP_CONTENT = -2
        static readonly UNSET = -3

        isRtl?: boolean = false

        x?: number = 0
        y?: number = 0

        minWidth?: number = 0
        minHeight?: number = 0
        maxWidth?: number = LayoutParams.UNSET
        maxHeight?: number = LayoutParams.UNSET

        width?: number = 0
        height?: number = 0
        measuredWidth?: number = 0
        measuredHeight?: number = 0

        margin?: number = 0
        marginLeft?: number = 0
        marginTop?: number = 0
        marginBottom?: number = 0
        marginRight?: number = 0

        paddingTop?: number = 0
        paddingBottom?: number = 0
        paddingRight?: number = 0
        paddingLeft?: number= 0
        paddingStart?: number= 0
        paddingEnd?: number= 0

        constructor(source?: LayoutParams) {
            if (source) {
                // TODO
            }
        }
    }
}

export class LayoutManager {
    private ids = new Map<string, any> ()
    constructor() {
    }

    create (children: ReactNode) {
        const components = children as ReactElement[]

        for (let component of components) {
            const params = component.props as ComponentUtils.ComponentParams

        }
    }
}

export type LayoutWrapper = {
    name: string
}

const LayoutProvider = createContext({})