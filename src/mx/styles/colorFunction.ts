import {Color} from "./types"

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

    private isArgb() {
        return "color" in this && Object.keys(this).some((v) => ["red", "green", "blue", "alpha",].includes(v))
    }

    private isHct() {
        return "color" in this && Object.keys(this).some((v) => ["hue", "chroma", "tone"].includes(v))
    }

    static resolve(colorFunction: ColorFunction) {
        const type = colorFunction.colorSpace

        if (colorFunction.isArgb()) {

        } else if (type === "hct") {

        }
    }
}