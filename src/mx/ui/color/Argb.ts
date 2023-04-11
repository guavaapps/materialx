import {ColorUtils} from "./ColorUtils";

export class Argb {
    constructor(
        private a: number,
        private r: number,
        private g: number,
        private b: number
    ) {

    }

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

    static fromInt(argb: number) {
        return new Argb(
            ColorUtils.alphaFromInt(argb),
            ColorUtils.redFromInt(argb),
            ColorUtils.greenFromInt(argb),
            ColorUtils.blueFromInt(argb)
        )
    }
}