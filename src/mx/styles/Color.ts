import {Argb} from "../color/argb/Argb";
import {Hct} from "../color/hct/Hct";
import {Attr, AttributeSet} from "./Style";
import {ColorFunction, ColorSpace} from "./ColorFunction";

export type Color = number | string | Argb | Hct | ColorFunction | Attr
export type Number = number | Attr
export type String = string | Attr

export namespace Color {
    export function isResolvedColor(color: Color) {
        if (typeof color === "string") {
            return isHex(color);
        }

        return color instanceof Argb
            || color instanceof Hct
            || ColorFunction.isColorFunction(color)
            || typeof color === "number"
    }

    export function isColor(color: Color, attributes: AttributeSet) {
        if (isResolvedColor(color)) {
            return true
        }

        return AttributeSet.hasDefinedAttribute(color as string, attributes)
    }

    function isHex(s: string) {
        return s[0] === "#" && (s.length === 7 || s.length === 9)
    }

    function isAttribute(color: Color) {
        return !isResolvedColor(color)
    }

    export function resolve(color: Color, attributeSet: AttributeSet, colorSpace: ColorSpace = ColorSpace.HEX) {
        let resolved = isAttribute(color) ? AttributeSet.getAttribute(color as string, attributeSet) : color

        if (ColorFunction.isColorFunction(color)) {
            return ColorFunction.resolve(resolved, colorSpace)
        }

        switch (colorSpace) {
            case ColorSpace.INT:
                if (resolved instanceof Argb) {
                    return resolved.toInt()
                } else if (resolved instanceof Hct) {
                    return resolved.toInt()
                }
                else if (isHex(resolved)) {
                    return Argb.fromHex(resolved).toHex()
                }

                return resolved
            case ColorSpace.HEX:
                if (resolved instanceof Argb) {
                    return resolved.toHex()
                }
                else if (resolved instanceof Hct) {
                    return resolved.toHex()
                }
                else if (typeof resolved === "number") {
                    return Argb.fromInt(resolved).toHex()
                }

                return resolved

            case ColorSpace.ARGB:
                if (resolved instanceof Hct) {
                    return resolved.toHex()
                }
                else if (typeof resolved === "number") {
                    return Argb.fromInt(resolved)
                }
                else if (isHex(resolved)) {
                    return Argb.fromHex(resolved)
                }

                return resolved
            case ColorSpace.HCT:
                if (resolved instanceof Argb) {
                    return resolved.toHex()
                }
                else if (typeof resolved === "number") {
                    return Argb.fromInt(resolved).toHex()
                }
                else if (isHex(resolved)) {
                    return Hct.fromHex(resolved)
                }

                return resolved
        }
    }
}

export namespace Number {
    export function isNumber (number: Number, attributes: AttributeSet) {
        return isResolvedNumber(number) || AttributeSet.hasDefinedAttribute(number as string, attributes)
    }

    export function isResolvedNumber (number: Number) {
        return typeof number === "number"
    }

    export function isAttribute (number: Number) {
        return !isResolvedNumber(number)
    }

    export function resolve (number: Number, attributeSet: AttributeSet): number {
        return isAttribute(number) ? AttributeSet.getAttribute(number as string, attributeSet) : number
    }
}

export namespace String {
    export function isString (string: String, attributes: AttributeSet) {
        return isResolvedString(string) || AttributeSet.hasDefinedAttribute(string, attributes)
    }

    export function isResolvedString (string: String) {
        return typeof string === "string"
    }

    export function isAttribute (string: String) {
        return !isResolvedString(string)
    }

    export function resolve (string: String, attributeSet: AttributeSet): string {
        return isAttribute(string) ? AttributeSet.getAttribute(string as string, attributeSet) : string
    }
}