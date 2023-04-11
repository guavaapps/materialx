import {ViewingConditions} from "./ViewingConditions";
import {ColorUtils} from "./ColorUtils";
import {Console} from "inspector";

export class Cam16 {
    public constructor(
        public hue: number,
        public chroma: number,
        public j: number, public q: number, public m: number, public s: number,
        public jStar: number, public aStar: number, public bStar: number,
    ) {
    }

    get int() {
        return this.viewed(ViewingConditions.DEFAULT)
    }

    distance(other: Cam16) {
        let dJ = this.jStar - other.jStar
        let dA = this.aStar - other.aStar
        let dB = this.bStar - other.bStar

        let dEPrime = Math.sqrt((dJ * dJ + dA * dA + dB * dB))
        let dE = 1.41 * Math.pow(dEPrime, 0.63)

        return dE
    }

    viewed(viewingConditions: ViewingConditions) {
        let alpha
        if (this.chroma == 0.0 || this.j == 0.0) alpha = 0.0
        else alpha = this.chroma / Math.sqrt(this.j / 100.0)

        let t = Math.pow(alpha / Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73), 1.0 / 0.9)

        let hRad = this.hue * Math.PI / 180.0
        let eHue = 0.25 * (Math.cos(hRad + 2.0) + 3.8)
        let ac = viewingConditions.aw * Math.pow(this.j / 100.0, 1.0 / viewingConditions.c / viewingConditions.z)

        let p1 = eHue * (50000.0 / 13.0) * viewingConditions.nc * viewingConditions.ncb
        let p2 = ac / viewingConditions.nbb

        let hSin = Math.sin(hRad)
        let hCos = Math.cos(hRad)

        let gamma = 23.0 * (p2 + 0.305) * t / (23.0 * p1 + 11.0 * t * hCos + 108.0 * t * hSin)
        let a = gamma * hCos
        let b = gamma * hSin

        let rA = (460.0 * p2 + 451.0 * a + 288.0 * b) / 1403.0
        let gA = (460.0 * p2 - 891.0 * a - 261.0 * b) / 1403.0
        let bA = (460.0 * p2 - 220.0 * a - 6300.0 * b) / 1403.0

        let rCBase = Math.max(0.0, 27.13 * Math.abs(rA) / (400.0 - Math.abs(rA)))
        // @ts-ignore
        let rC = (Math.sign(rA) * (100.0 / viewingConditions.fl) * Math.pow(rCBase, 1.0 / 0.42))

        let gCBase = Math.max(0.0, 27.13 * Math.abs(gA) / (400.0 - Math.abs(gA)))
        let gC = (Math.sign(gA) * (100.0 / viewingConditions.fl) * Math.pow(gCBase, 1.0 / 0.42))
        let bCBase = Math.max(0.0, 27.13 * Math.abs(bA) / (400.0 - Math.abs(bA)))

        let bC = (Math.sign(bA) * (100.0 / viewingConditions.fl) * Math.pow(bCBase, 1.0 / 0.42))
        let rF = rC / viewingConditions.rgbD[0]
        let gF = gC / viewingConditions.rgbD[1]
        let bF = bC / viewingConditions.rgbD[2]

        let matrix = Cam16.CAM16RGB_TO_XYZ

        let x = rF * matrix[0][0] + gF * matrix[0][1] + bF * matrix[0][2]
        let y = rF * matrix[1][0] + gF * matrix[1][1] + bF * matrix[1][2]
        let z = rF * matrix[2][0] + gF * matrix[2][1] + bF * matrix[2][2]

        return ColorUtils.intFromXyzComponents(x, y, z)
    }

    static XYZ_TO_CAM16RGB = [
        [0.401288, 0.650173, -0.051461],
        [-0.250268, 1.204414, 0.045854],
        [-0.002079, 0.048952, 0.953127]
    ]

    static CAM16RGB_TO_XYZ = [
        [1.8620678, -1.0112547, 0.14918678],
        [0.38752654, 0.62144744, -0.00897398],
        [-0.01584150, -0.03412294, 1.0499644]
    ]

    static fromInt(argb: number) {
        return Cam16.fromIntInViewingConditions(argb, ViewingConditions.DEFAULT)
    }

    static fromIntInViewingConditions(argb: number, viewingConditions: ViewingConditions) {
        // let red = argb & 0x00ff0000 >> 16
        // let green = argb & 0x0000ff00 >> 8
        // let blue = argb & 0x000000ff

        let red = ColorUtils.redFromInt(argb)
        let green = ColorUtils.greenFromInt(argb)
        let blue = ColorUtils.blueFromInt(argb)

        // console.log(red + " " + green + " " + blue)

        let redL = ColorUtils.linearized(red / 255) * 100
        let greenL = ColorUtils.linearized(green / 255) * 100
        let blueL = ColorUtils.linearized(blue / 255) * 100

        let x = 0.41233895 * redL + 0.35762064 * greenL + 0.18051042 * blueL
        let y = 0.2126 * redL + 0.7152 * greenL + 0.0722 * blueL
        let z = 0.01932141 * redL + 0.11916382 * greenL + 0.95034478 * blueL

        let matrix = Cam16.XYZ_TO_CAM16RGB

        let rT = x * matrix[0][0] + y * matrix[0][1] + z * matrix[0][2]
        let gT = x * matrix[1][0] + y * matrix[1][1] + z * matrix[1][2]
        let bT = x * matrix[2][0] + y * matrix[2][1] + z * matrix[2][2]

        let rD = viewingConditions.rgbD[0] * rT
        let gD = viewingConditions.rgbD[1] * gT
        let bD = viewingConditions.rgbD[2] * bT

        let rAF = Math.pow(viewingConditions.fl * Math.abs(rD) / 100.0, 0.42)
        let gAF = Math.pow(viewingConditions.fl * Math.abs(gD) / 100.0, 0.42)
        let bAF = Math.pow(viewingConditions.fl * Math.abs(bD) / 100.0, 0.42)

        let rA = Math.sign(rD) * 400.0 * rAF / (rAF + 27.13)
        let gA = Math.sign(gD) * 400.0 * gAF / (gAF + 27.13)
        let bA = Math.sign(bD) * 400.0 * bAF / (bAF + 27.13)

        let a = (11.0 * rA + -12.0 * gA + bA) / 11.0
        let b = (rA + gA - 2.0 * bA) / 9.0

        let u = (20.0 * rA + 20.0 * gA + 21.0 * bA) / 20.0
        let p2 = (40.0 * rA + 20.0 * gA + bA) / 20.0

        let atan2 = Math.atan2(b, a)
        let atanDegrees = atan2 * 180.0 / Math.PI

        let hue
        if (atanDegrees < 0) hue = atanDegrees + 360.0
        else if (atanDegrees >= 360) hue = atanDegrees - 360.0
        else hue = atanDegrees

        let hueRadians = hue * Math.PI / 180.0
        let ac: number = p2 * viewingConditions.nbb
        let j = (100.0 * Math.pow((ac / viewingConditions.aw), (viewingConditions.c * viewingConditions.z)))
        let q: number = ((4.0 / viewingConditions.c) * Math.sqrt((j / 100.0)) * (viewingConditions.aw + 4.0) * viewingConditions.flRoot)

        let huePrime
        if (hue < 20.14) huePrime = hue + 360
        else huePrime = hue
        let eHue = 0.25 * (Math.cos(toRadians(huePrime) + 2.0) + 3.8)

        let p1: number = 50000.0 / 13.0 * eHue * viewingConditions.nc * viewingConditions.ncb

        let t = p1 * Math.hypot(a, b) / (u + 0.305)

        let alpha = Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73)
            * Math.pow(t, 0.9)
        let c = alpha * Math.sqrt(j / 100.0)
        let m: number = c * viewingConditions.flRoot
        let s = (50.0 * Math.sqrt((alpha * viewingConditions.c / (viewingConditions.aw + 4.0))))
        let jstar = (1.0 + 100.0 * 0.007) * j / (1.0 + 0.007 * j)
        let mstar = 1.0 / 0.0228 * Math.log1p((0.0228 * m))
        let astar = mstar * Math.cos(hueRadians)
        let bstar = mstar * Math.sin(hueRadians)
        return new Cam16(hue, c, j, q, m, s, jstar, astar, bstar)
    }

    static fromJch(j: number, c: number, h: number): Cam16 {
        return Cam16.fromJchInViewingConditions(j, c, h, ViewingConditions.DEFAULT)
    }

    static fromJchInViewingConditions(j: number, c: number, h: number, viewingConditions: ViewingConditions) {
        let q = ((4.0 / viewingConditions.c) * Math.sqrt(j / 100.0) * (viewingConditions.aw + 4.0) * viewingConditions.flRoot)
        let m = c * viewingConditions.flRoot
        let alpha = c / Math.sqrt(j / 100.0)
        let s = (50.0 * Math.sqrt((alpha * viewingConditions.c / (viewingConditions.aw + 4.0))))
        let hueRadians = h * Math.PI / 180.0
        let jstar = (1.0 + 100.0 * 0.007) * j / (1.0 + 0.007 * j)
        let mstar = 1.0 / 0.0228 * Math.log1p(0.0228 * m)
        let astar = mstar * Math.cos(hueRadians)
        let bstar = mstar * Math.sin(hueRadians)
        return new Cam16(h, c, j, q, m, s, jstar, astar, bstar)
    }

    static fromUcs(jstar: number, astar: number, bstar: number): Cam16 {
        return Cam16.fromUcsInViewingConditions(jstar, astar, bstar, ViewingConditions.DEFAULT)
    }

    static fromUcsInViewingConditions(jstar: number, astar: number, bstar: number, viewingConditions: ViewingConditions): Cam16 {
        let m = Math.hypot(astar, bstar)
        let m2 = Math.expm1(m * 0.0228) / 0.0228

        let c = m2 / viewingConditions.flRoot

        let h = Math.atan2(bstar, astar) * (180.0 / Math.PI)
        if (h < 0.0) {
            h += 360.0

        }
        let j = jstar / (1 - (jstar - 100) * 0.007)

        return Cam16.fromJchInViewingConditions(j, c, h, viewingConditions)
    }
}

function toRadians(angdeg: number) {
    return angdeg * (Math.PI / 180.0)
}