export default 0

// import {FocusEvent, KeyboardEvent, PointerEvent} from "../ui/event/pointer_event";
// import {Attr, Attrs} from "../styles/Style";
// import {Statesheet1} from "../styles/Statesheet";
// import React from "react";
// import {LayoutParams} from "../layout/Layout";
//
// export abstract class Sizeable {
//     abstract width?: Number
//     abstract height?: Number
//
//     abstract minWidth?: Number
//     abstract minHeight?: Number
//
//     abstract maxWidth?: Number
//     abstract maxHeight?: Number
// }
//
// export interface Shapeable {
//     cornerSize?: Number
//     cornerStyle?: Attr | "round" | "cut" | Statesheet1
// }
//
// export type Size = number | "MATCH_PARENT" | "WRAP_CONTENT" | "MATCH_CONSTRAINT"
//
// export type Component = {
//     id?: string,
//     children?: React.ReactNode
//
//     x?: number
//     y?: number
//     width?: number,
//     height?: number,
//     layoutParams?: LayoutParams
// }
//
// export type Clickable = {
//     onClick?: (e?: PointerEvent) => boolean;
//     onPressed?: (e?: PointerEvent) => boolean;
//     onReleased?: (e?: PointerEvent) => boolean;
//     onHover?: (e?: PointerEvent) => boolean;
//     onHoverEnd?: (e?: PointerEvent) => boolean;
//     onMoved?: (e?: PointerEvent) => boolean;
// }
//
// export type WithKeyboardEvents = {
//     onKeyPressed?: (e?: KeyboardEvent) => boolean;
//     onKeyReleased?: (e?: KeyboardEvent) => boolean;
// }
//
// export type Focusable = {
//     onFocused?: (e?: FocusEvent) => boolean;
//     onUnfocused?: (e?: Focusable) => boolean;
// }
//
// export type Styleable = {
//
// }
//
// export type Number = number | string