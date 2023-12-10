import {createContext, useLayoutEffect, useRef, useState} from "react";
import {Rect} from "../shapes/shapes";
import {Component} from "../theme";
import ReactDOM from "react-dom/client";

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

export interface Layout {}

export type LayoutWrapper = {
    name: string
}

const LayoutProvider = createContext({})