import {Argb} from "../color/argb/Argb";
import {Hct} from "../color/hct/Hct";

export type ColorValue = number | string | Argb | Hct

class ColorObject {
    constructor(
        private color: ColorValue
    ) {
    }

    // argb
    alpha(newAlpha: number) {
        let c = this.asArgb()

        c.alpha = newAlpha

        return this
    }

    red(newRed: number) {
        let c = this.asArgb()

        c.alpha = newRed

        return this
    }

    green(newGreen: number) {
        let c = this.asArgb()

        c.alpha = newGreen

        return this
    }

    blue(newBlue: number) {
        let c = this.asArgb()

        c.alpha = newBlue

        return this
    }

    // hct

    hue (newHue: number) {
        let c = this.asHct()

        c.hue = newHue

        return this
    }

    chroma (newChroma: number) {
        let c = this.asHct()

        c.chroma = newChroma

        return this
    }

    tone (newTone: number) {
        let c = this.asHct()

        c.tone = newTone

        return this
    }

    asInt () {
        if (this.color instanceof Argb) {
            this.color = this.color.toInt()
        } else if (this.color instanceof Hct) {
            this.color = this.color.toInt()
        } else if (typeof this.color === "number") {
            // do nothing
        }

        this.color = Argb.fromHex(this.color as string).toInt()

        return this.color as number
    }

    asHex () {
        if (this.color instanceof Argb) {
            this.color = this.color.toHex()
        } else if (this.color instanceof Hct) {
            this.color = this.color.toHex()
        } else if (typeof this.color === "number") {
            this.color = Argb.fromInt(this.color).toHex()
        }



        return this.color as string
    }

    asArgb() {
        if (this.color instanceof Argb) {
            // do nothing
        } else if (this.color instanceof Hct) {
            this.color = this.color.toArgb()
        } else if (typeof this.color === "number") {
            this.color = Argb.fromInt(this.color)
        }

        this.color = Argb.fromHex(this.color as string)

        return this.color as Argb
    }

    asHct() {
        if (this.color instanceof Argb) {
            this.color = this.color.toHct()
        } else if (this.color instanceof Hct) {
            // do nothing
        } else if (typeof this.color === "number") {
            this.color = Hct.fromInt(this.color)
        }

        this.color = Hct.fromHex(this.color as string)

        return this.color as Hct
    }
}

export type ColorFunction = {
    color: ColorValue,

    alpha?: number,
    red?: number,
    green?: number,
    blue?: number,

    hue?: number,
    chroma?: number,
    tone?: number
}

export enum ColorSpace {
    INT,
    HEX,
    ARGB,
    HCT
}

export namespace ColorFunction {
    export function resolve (colorFunction: ColorFunction, colorFormat: ColorSpace = ColorSpace.HEX) {
        return _resolve(colorFunction, colorFormat)
    }

    export function asInt (colorFunction: ColorFunction) {
        return resolve(colorFunction, ColorSpace.INT)
    }

    export function asHex (colorFunction: ColorFunction) {
        return resolve(colorFunction, ColorSpace.HEX)
    }

    export function asArgb (colorFunction: ColorFunction) {
        return resolve(colorFunction, ColorSpace.ARGB)
    }

    export function asHct (colorFunction: ColorFunction) {
        return resolve(colorFunction, ColorSpace.HCT)
    }

    export function isColorFunction (object: any) {
        const colorFunctionProperties = [
            "color",

            "alpha",
            "red",
            "green",
            "blue",

            "hue",
            "chroma",
            "tone",
        ]

        const properties = Object.keys(object)

        if (!properties.includes("color")) {
            return false
        }

        for (let p of properties) {
            if (!colorFunctionProperties.includes(p)) {
                return false
            }
        }

        return true
    }

    function _resolve (colorFunction: ColorFunction, colorFormat: ColorSpace) {
        const colorObject = new ColorObject(colorFunction.color)

        const changedProperties = Object.keys(colorFunction)

        for (let p of changedProperties) {
            switch (p) {
                case "alpha":
                    colorObject.alpha(colorFunction.alpha!)

                    break
                case "red":
                    colorObject.red(colorFunction.red!)

                    break
                case "green":
                    colorObject.green(colorFunction.green!)

                    break
                case "blue":
                    colorObject.blue(colorFunction.blue!)

                    break

                case "hue":
                    colorObject.hue(colorFunction.hue!)

                    break
                case "chroma":
                    colorObject.chroma(colorFunction.chroma!)

                    break
                case "tone":
                    colorObject.tone(colorFunction.tone!)

                    break
            }
        }

        switch (colorFormat) {
            case ColorSpace.INT:
                return colorObject.asInt()

            case ColorSpace.HEX:
                return colorObject.asHex()
            case ColorSpace.ARGB:
                return colorObject.asArgb()

            case ColorSpace.HCT:
                return colorObject.asHct()
        }
    }
}