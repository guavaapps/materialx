import {createContext, useLayoutEffect, useRef, useState} from "react";
import {Rect} from "../shapes/shapes";
import {Component} from "../theme";
import ReactDOM from "react-dom/client";
import {Number} from "../components/Props";
import {AttrMap} from "../styles/style";

export enum Size {
    MATCH_PARENT = "match_parent",
    WRAP_CONTENT = "wrap_content"
}

export type Id = string | "parent"

export type LayoutParams = {}

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

export namespace Layout {
    export class LayoutParams {
        static readonly MATCH_PARENT = -1
        static readonly WRAP_CONTENT = -2
        static readonly UNSET = -3

        isRtl: boolean = false

        x: Number = 0
        y: Number = 0

        minWidth: number = 0
        minHeight: number = 0
        maxWidth: number = LayoutParams.UNSET
        maxHeight: number = LayoutParams.UNSET

        width: number = 0
        height: number = 0
        measuredWidth: number = 0
        measuredHeight: number = 0

        margin: Number = 0
        marginLeft: Number = 0
        marginTop: Number = 0
        marginBottom: Number = 0
        marginRight: Number = 0

        paddingTop: Number = 0
        paddingBottom: Number = 0
        paddingRight: number = 0
        paddingLeft: number= 0
        paddingStart: number= 0
        paddingEnd: number= 0

        constructor(source?: LayoutParams) {
            if (source) {
                // TODO
            }
        }
    }
}

export type LayoutWrapper = {
    name: string
}

const LayoutProvider = createContext({})