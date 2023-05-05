import PointerEvent from "../ui/event/pointer_event";
import {Attr, Attrs} from "../styles/style";
import {Number} from "../styles/types";
import {Statesheet} from "../styles/statesheet";

export type WithPointerEvents = {
    onClick?: (e?: PointerEvent) => void;
    onPressed?: (e?: PointerEvent) => void;
    onReleased?: (e?: PointerEvent) => void;
    onHover?: (e?: PointerEvent) => void;
    onHoverEnd?: (e?: PointerEvent) => void;
}

export abstract class Sizeable {
    abstract width?: Number
    abstract height?: Number

    abstract minWidth?: Number
    abstract minHeight?: Number

    abstract maxWidth?: Number
    abstract maxHeight?: Number
}

export interface Shapeable {
    cornerSize?: Number
    cornerStyle?: Attr | "round" | "cut" | Statesheet
}