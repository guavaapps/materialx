import {Attr} from "./style";
import {ColorFunction} from "./colorFunction";
import {Color} from "./types";

export type ColorState = {
    backgroundColor?: Color
    textColor?: Attr | number | string | null | ColorFunction
    outlineColor?: Attr | number | string | null | ColorFunction
    overlayColor?: Attr | number | string | null | ColorFunction
    rippleColor?: Attr | number | string | null | ColorFunction
}

export interface ColorStateList {
    enabled?: ColorState
    disabled?: ColorState
    hovered?: ColorState
    pressed?: ColorState
    focused?: ColorState
}