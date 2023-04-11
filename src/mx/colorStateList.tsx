import {ColorFunction} from "./components/button/button";
import {Attr} from "./style";

export type ColorState = {
    backgroundColor?: Attr | number | string | null | ColorFunction
    textColor?: Attr | number | string | null | ColorFunction
    outlineColor?: Attr | number | string | null | ColorFunction
    overlayColor?: Attr | number | string | null | ColorFunction
}

export interface ColorStateList {
    enabled?: ColorState
    disabled?: ColorState
    hovered?: ColorState
    pressed?: ColorState
    focused?: ColorState
}