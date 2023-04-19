import {Argb} from "./Argb";

export class ColorUtils {
    static WHITE_POINT_D65 = [95.047, 100.0, 108.883]

    static whitePointD65() {
        return Object.assign([], this.WHITE_POINT_D65)
    }

    static alphaFromInt(argb: number) {
        return (argb >> 24) & 0xff
    }

    static redFromInt(argb: number): number {
        return (argb >> 16) & 0xff
    }

    static greenFromInt(argb: number): number {
        return (argb >> 8) & 0xff
    }

    static blueFromInt(argb: number): number {
        return argb & 0xff
    }

    static lstarFromInt(argb: number): number {
        return ColorUtils.labFromInt(argb)[0]
    }

    static hexFromInt(argb: number): string {
        let a = this.alphaFromInt(argb).toString(16).padStart(2, "0")
        let r = this.redFromInt(argb).toString(16).padStart(2, "0")
        let g = this.greenFromInt(argb).toString(16).padStart(2, "0")
        let b = this.blueFromInt(argb).toString(16).padStart(2, "0")

        let c = r + g + b + a

        return `#${c}`
    }

    static intFromHex(hex: string) {
        const hasAlpha = hex.length === 9

        const a = hasAlpha ? "0x" + hex[7] + hex[8] : "0xff"
        const r = "0x" + hex[1] + hex[2];
        const g = "0x" + hex[3] + hex[4];
        const b = "0x" + hex[5] + hex[6];

        return new Argb(+a, +r, +g, +b).toInt()
    }

    static xyzFromInt(argb: number): number[] {
        let r = ColorUtils.linearized(ColorUtils.redFromInt(argb) / 255) * 100
        let g = ColorUtils.linearized(ColorUtils.greenFromInt(argb) / 255) * 100
        let b = ColorUtils.linearized(ColorUtils.blueFromInt(argb) / 255) * 100
        let x = 0.41233894 * r + 0.35762064 * g + 0.18051042 * b
        let y = 0.2126 * r + 0.7152 * g + 0.0722 * b
        let z = 0.01932141 * r + 0.11916382 * g + 0.95034478 * b
        return [x, y, z]
    }

    static intFromRgb(r: number, g: number, b: number): number {
        return (255 << 24) | ((r) << 16) | ((g) << 8) | (b)
    }

    static intFromArgb(a: number, r: number, g: number, b: number): number {
        return (a << 24) | ((r) << 16) | ((g) << 8) | (b)
    }

    static labFromInt(argb: number): number[] {
        let e = 216.0 / 24389.0
        let kappa = 24389.0 / 27.0

        let xyz = ColorUtils.xyzFromInt(argb)

        let yNormalized = (xyz[1] / (ColorUtils.WHITE_POINT_D65)[1])
        let fy: number

        if (yNormalized > e) {
            fy = Math.cbrt(yNormalized)
        } else {
            fy = (kappa * yNormalized + 16) / 116
        }

        let xNormalized = (xyz[0] / (ColorUtils.WHITE_POINT_D65)[0])
        let fx: number

        if (xNormalized > e) {
            fx = Math.cbrt(xNormalized)
        } else {
            fx = (kappa * xNormalized + 16) / 116
        }

        let zNormalized = (xyz[2] / (ColorUtils.WHITE_POINT_D65)[2])
        let fz: number

        if (zNormalized > e) {
            fz = Math.cbrt(zNormalized)
        } else {
            fz = (kappa * zNormalized + 16) / 116
        }
        let l = 116.0 * fy - 16
        let a = 500.0 * (fx - fy)
        let b = 200.0 * (fy - fz)
        return [l, a, b]
    }

    static intFromLab(l: number, a: number, b: number): number {
        let e = 216.0 / 24389.0
        let kappa = 24389.0 / 27.0
        let ke = 8.0

        let fy = (l + 16.0) / 116.0
        let fx = a / 500.0 + fy
        let fz = fy - b / 200.0

        let fx3 = fx * fx * fx

        let xNormalized
        if (fx3 > e) xNormalized = fx3
        else xNormalized = (116.0 * fx - 16.0) / kappa

        let yNormalized
        if (l > ke)
            yNormalized = fy * fy * fy
        else yNormalized = l / kappa

        let fz3 = fz * fz * fz

        let zNormalized
        if (fz3 > e) zNormalized = fz3
        else zNormalized = (116.0 * fz - 16.0) / kappa

        let x = xNormalized * (ColorUtils.WHITE_POINT_D65)[0]
        let y = yNormalized * (ColorUtils.WHITE_POINT_D65)[1]
        let z = zNormalized * (ColorUtils.WHITE_POINT_D65)[2]

        return ColorUtils.intFromXyzComponents(x, y, z)
    }

    static intFromXyzComponents(x: number, y: number, z: number): number {
        var x = x
        var y = y
        var z = z

        x = x / 100
        y = y / 100
        z = z / 100

        let rL = x * 3.2406 + y * -1.5372 + z * -0.4986
        let gL = x * -0.9689 + y * 1.8758 + z * 0.0415
        let bL = x * 0.0557 + y * -0.204 + z * 1.057
        let r = ColorUtils.delinearized(rL)
        let g = ColorUtils.delinearized(gL)
        let b = ColorUtils.delinearized(bL)
        let rInt = Math.max(Math.min(255, Math.round(r * 255)), 0)
        let gInt = Math.max(Math.min(255, Math.round(g * 255)), 0)
        let bInt = Math.max(Math.min(255, Math.round(b * 255)), 0)
        return ColorUtils.intFromRgb(rInt, gInt, bInt)
    }

    static intFromXyz(xyz: number[]): number {
        return ColorUtils.intFromXyzComponents(xyz[0], xyz[1], xyz[2])
    }

    static intFromLstar(lstar: number): number {
        let fy = (lstar + 16.0) / 116.0

        let kappa = 24389 / 27

        let epsilon = 216 / 24389
        let cubeExceedEpsilon = fy * fy * fy > epsilon
        let lExceedsEpsilonKappa = lstar > 8.0

        let y
        if (lExceedsEpsilonKappa) y = fy * fy * fy
        else y = lstar / kappa

        let x
        if (cubeExceedEpsilon) x = fy * fy * fy
        else x = (116 * fy - 16) / kappa

        let z
        if (cubeExceedEpsilon) z = fy * fy * fy
        else z = (116 * fy - 16) / kappa

        let xyz = [
            x * (ColorUtils.WHITE_POINT_D65)[0],
            y * (ColorUtils.WHITE_POINT_D65)[1],
            z * (ColorUtils.WHITE_POINT_D65)[2]]

        return ColorUtils.intFromXyz(xyz)
    }

    static yFromLstar(lstar: number): number {
        let ke = 8.0

        if (lstar > ke) {
            return Math.pow((lstar + 16.0) / 116.0, 3.0) * 100
        } else {
            return lstar / (24389 / 27) * 100
        }
    }

    static linearized(rgb: number): number {
        if (rgb <= 0.04045) {
            return rgb / 12.92
        } else {
            return Math.pow(((rgb + 0.055) / 1.055), 2.4)
        }
    }

    static delinearized(rgb: number): number {
        if (rgb <= 0.0031308) {
            return rgb * 12.92
        } else {
            return 1.055 * Math.pow(rgb, (1.0 / 2.4)) - 0.055
        }
    }
}