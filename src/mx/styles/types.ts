import {Attr} from "../style";
import {ColorFunction} from "./colorFunction";
import {Statesheet} from "./statesheet";

export type Color = Number | ColorFunction | Statesheet | null | undefined
export type Number = Attr | Statesheet | number | string