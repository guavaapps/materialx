import {PointerEvent, KeyboardEvent, FocusEvent} from "./pointer_event";
import React from "react";

export type PointerEventCallback = {
    onClick?(e?: PointerEvent): boolean

    onHover?(e?: PointerEvent): boolean

    onHoverEnd?(e?: PointerEvent): boolean

    onPressed?(e?: PointerEvent): boolean

    onReleased?(e?: PointerEvent): boolean

    onMoved?(e?: PointerEvent): boolean
}

export type KeyboardEventCallback = {
    onKeyPressed?(e?: KeyboardEvent): boolean

    onKeyReleased?(e?: KeyboardEvent): boolean
}

export type FocusEventCallback = {
    onFocused?(e?: FocusEvent): boolean

    onUnfocused?(e?: FocusEvent): boolean
}