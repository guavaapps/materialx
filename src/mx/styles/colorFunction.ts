import {Color} from "./types"
import {Argb} from "../ui/color/Argb";
import {ColorUtils} from "../ui/color/ColorUtils";
import {Hct} from "../ui/color/Hct";
import {Attrs} from "./style";

export abstract class ColorFunction {
    color: Color
    red?: Number
    green?: Number
    blue?: Number
    alpha?: Number

    hue?: Number
    chroma?: Number
    tone?: Number

    static is(obj: any) {
        return typeof obj === "object" && "color" in obj && Object.keys(obj).some((v) => ["red", "green", "blue", "alpha", "hue", "chroma", "tone"].includes(v))
    }

    protected get colorSpace() {
        const isArgb = this.red || this.green || this.blue
        const isHct = this.hue || this.chroma || this.tone

        if (isArgb && !isHct) return "argb"
        return "hct"
    }

    static isArgb(func: ColorFunction) {
        return "color" in func && Object.keys(func).some((v) => ["red", "green", "blue", "alpha",].includes(v))
    }

    static isHct(func: ColorFunction) {
        return "color" in func && Object.keys(func).some((v) => ["hue", "chroma", "tone"].includes(v))
    }

    static isValid (func: ColorFunction) {
        return !(this.isArgb(func) && this.isHct(func))
    }

    static resolve(colorFunction: ColorFunction) {
        if (!ColorFunction.isValid(colorFunction)) throw new Error("cfnv")

        const int = this.resolveColor(colorFunction.color)
        console.log("int", int)

        if (this.isArgb(colorFunction)) {
            const argb = Argb.fromInt(int || 0)
            console.log("argb", argb)

            let a = ColorFunction.resolveColor(colorFunction.alpha)
            argb.alpha = (a !== null) ? a! : argb.alpha

            let r = ColorFunction.resolveColor(colorFunction.red)
            argb.red = (r !== null) ? r! : argb.red

            let g = ColorFunction.resolveColor(colorFunction.green)
            argb.green = (g !== null) ? g! : argb.green

            let b = ColorFunction.resolveColor(colorFunction.blue)
            argb.blue = (b !== null) ? b! : argb.blue

            console.log("new argb", argb)

            return argb.toInt()

        } else if (this.isHct(colorFunction)) {
            const hct = Hct.fromInt(int || 0)

            let h = colorFunction.hue
            hct.hue = (h !== undefined) ? h! as number : hct.hue

            let c = colorFunction.chroma
            hct.chroma = (c !== undefined) ? c! as number : hct.chroma

            let t = colorFunction.tone
            hct.tone = (t !== undefined) ? t! as number : hct.tone

            console.log("new hct", hct)

            return hct.toInt()
        }
    }

    static resolveNumber (n: Number) {
        switch (typeof n) {
            case "number":
            case undefined:
            case null:
                return n
        }
    }

    static resolveColor (c: Color): number | null | undefined {
        switch (typeof c) {
            case "string":
                return ColorUtils.intFromHex(c)

            case "number":
                return c

            case "object":
                return ColorFunction.resolveColor(c)

            default:
                return null
        }
    }
}