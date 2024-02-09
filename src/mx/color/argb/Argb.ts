import {ColorUtils} from "../hct/ColorUtils";
import {Hct} from "../hct/Hct";

export class Argb {
    constructor(
        private a: number,
        private r: number,
        private g: number,
        private b: number
    ) {}

    get alpha () {
        return this.a
    }

    get red() {
        return this.r
    }

    get green () {
        return this.g
    }

    get blue () {
        return this.b
    }

    set alpha (a) {
        this.a = a
    }

    set red (r) {
        this.r = r
    }

    set green (g) {
        this.g = g
    }

    set blue (b) {
        this.b = b
    }

    toInt () {
        return ColorUtils.intFromArgb(this.a, this.r, this.g, this.b)
    }

    toHct () {
        return Hct.fromInt(this.toInt())
    }

    toHex (alpha = true) {
        const hex = (this.toInt() &0xffffff)
            .toString(16)

        if (alpha) {
            const a = Argb.getAlpha(this.toInt()).toString(16)

            return `#${a}${hex}`
        }

        return `#${hex}`
    }

    toString () {
        return `Argb(alpha=${this.alpha} red=${this.red} green=${this.green} blue=${this.blue})`
    }

    static fromInt(int: number) {
        return new Argb(
            this.getAlpha(int),
            this.getRed(int),
            this.getGreen(int),
            this.getBlue(int)
        )
    }

    static fromHct (hct: Hct) {
        return Argb.fromInt(hct.toInt())
    }

    static fromHex (hex: string) {
        const hasAlpha = hex.length === 9

        const int = parseInt(hex.slice(1), 16)

        const color = hasAlpha ? (int >> 8) &0xffffff : int
        const alpha = hasAlpha ? int &0xff : 255

        const argbInt = color | (alpha << 24)

        return Argb.fromInt(argbInt)
    }

    static argbToInt (a: number, r: number, g: number, b: number) {
        return (a << 24) | (r << 16) | (g << 8) | b
    }

    static getAlpha (int: number) {
        return (int >> 24) &0xff
    }

    static getRed (int: number) {
        return (int >> 16) &0xff
    }

    static getGreen (int: number) {
        return (int >> 8) &0xff
    }

    static getBlue (int: number) {
        return int &0xff
    }

    private static validateArgb (a: number, r: number, g: number, b: number) {
        return a > 0 && a < 255
            && r > 0 && r < 255
            && g > 0 && g < 255
            && b > 0 && b < 255
    }
}