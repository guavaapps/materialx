import {Cam16} from "./Cam16";
import {ColorUtils} from "./ColorUtils";
import {MathUtils} from "./MathUtils";

export class ViewingConditions {
    constructor(
        public n: number,
        public aw: number,
        public nbb: number,
        public ncb: number,
        public c: number,
        public nc: number,
        public rgbD: number[],
        public fl: number,
        public flRoot: number,
        public z: number
    ) {
    }

    static get DEFAULT () {
        return ViewingConditions.make(
            ColorUtils.whitePointD65(),
            (200.0 / Math.PI * ColorUtils.yFromLstar(50.0) / 100),
            50.0,
            2.0,
            false
        )
    }

    static make(
        whitePoint: number[],
        adaptingLuminance: number,
        backgroundLstar: number,
        surround: number,
        discountingIlluminant: boolean
    ) {
        let matrix = Cam16.XYZ_TO_CAM16RGB

        let rW =
            whitePoint[0] * matrix[0][0] + whitePoint[1] * matrix[0][1] + whitePoint[2] * matrix[0][2]
        let gW =
            whitePoint[0] * matrix[1][0] + whitePoint[1] * matrix[1][1] + whitePoint[2] * matrix[1][2]
        let bW =
            whitePoint[0] * matrix[2][0] + whitePoint[1] * matrix[2][1] + whitePoint[2] * matrix[2][2]

        let f = 0.8 + surround / 10.0

        let c
        if (f >= 0.9) c = MathUtils.lerp(0.59, 0.69, (f - 0.9) * 10.0)
        else c = MathUtils.lerp(0.525, 0.59, (f - 0.8) * 10.0)

        let d
        if (discountingIlluminant) d = 1.0
        else d = f * (1.0 - 1.0 / 3.6 * Math.exp(((-adaptingLuminance - 42.0) / 92.0)))

        if (d > 1.0) d = 1.0
        else if (d < 0.0) d = 0.0
        else d = d

        let rgbD = [
            d * (100.0 / rW) + 1.0 - d,
            d * (100.0 / gW) + 1.0 - d,
            d * (100.0 / bW) + 1.0 - d
        ]

        let k = 1.0 / (5.0 * adaptingLuminance + 1.0)
        let k4 = k * k * k * k
        let k4F = 1.0 - k4

        let fl = k4 * adaptingLuminance + 0.1 * k4F * k4F * Math.cbrt(5.0 * adaptingLuminance)

        let n = ColorUtils.yFromLstar(backgroundLstar) / whitePoint[1]
        let z = 1.48 + Math.sqrt(n)
        let nbb = 0.725 / Math.pow(n, 0.2)

        let rgbAFactors = [Math.pow(fl * rgbD[0] * rW / 100.0, 0.42),
            Math.pow(fl * rgbD[1] * gW / 100.0, 0.42),
            Math.pow(fl * rgbD[2] * bW / 100.0, 0.42)]

        let rgbA = [
            400.0 * rgbAFactors[0] / (rgbAFactors[0] + 27.13),
            400.0 * rgbAFactors[1] / (rgbAFactors[1] + 27.13),
            400.0 * rgbAFactors[2] / (rgbAFactors[2] + 27.13)
        ]

        let aw = (2.0 * rgbA[0] + rgbA[1] + 0.05 * rgbA[2]) * nbb

        return new ViewingConditions(n,
            aw,
            nbb,
            nbb,
            c,
            f,
            rgbD,
            fl,
            Math.pow(fl, 0.25),
            z)
    }
}