
import {Cam16} from "./Cam16";
import {ColorUtils} from "./ColorUtils";
import {ViewingConditions} from "./ViewingConditions";
import {MathUtils} from "./MathUtils";
import {Argb} from "../argb/Argb";

export class Hct {
    private h: number = 0
    private c: number = 0
    private t: number = 0

    get hue() {
        return this.h
    }

    get chroma() {
        return this.c
    }

    get tone() {
        return this.t
    }

    set hue(newHue) {
        this.setInternalState(Hct.gamutMap(MathUtils.sanitizeDegrees(newHue), this.c, this.t))
    }

    set chroma(newChroma) {
        this.setInternalState(Hct.gamutMap(this.h, newChroma, this.t))
    }

    set tone(newTone) {
        this.setInternalState(Hct.gamutMap(this.h, this.c, newTone))
    }

    static fromInt(argb: number) {
        let cam = Cam16.fromInt(argb)

        let hct = new Hct()
        hct.h = cam.hue
        hct.c = cam.chroma
        hct.t = ColorUtils.lstarFromInt(argb)

        return hct
    }

    static fromArgb (argb: Argb) {
        return Hct.fromInt(argb.toInt())
    }

    static fromHex (hex: string) {
        const hasAlpha = hex.length === 9

        const int = parseInt(hex.slice(1), 16)

        const color = hasAlpha ? (int >> 8) &0xffffff : int
        const alpha = hasAlpha ? int &0xff : 255

        const argbInt = color | (alpha << 24)

        return Hct.fromInt(argbInt)
    }

    toInt() {
        return Hct.gamutMap(this.h, this.c, this.t)
    }

    toArgb () {
        return Argb.fromInt(this.toInt())
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

    private setInternalState(argb: number) {
        let cam = Cam16.fromInt(argb)
        let tone = ColorUtils.lstarFromInt(argb)
        this.h = cam.hue
        this.c = cam.chroma
        this.t = tone
    }

    // static

    static CHROMA_SEARCH_ENDPOINT = 0.4
    static DE_MAX = 1.0
    static DL_MAX = 0.2
    static DE_MAX_ERROR = 0.000000001
    static LIGHTNESS_SEARCH_ENDPOINT = 0.01

    static gamutMap(hue: number, chroma: number, tone: number) {
        return Hct.gamutMapInViewingConditions(hue, chroma, tone, ViewingConditions.DEFAULT)
    }

    static gamutMapInViewingConditions(h: number, chroma: number, tone: number, viewingConditions: ViewingConditions) {
        if (chroma < 1.0 || Math.round(tone) <= 0.0 || Math.round(tone) >= 100.0) {
            return ColorUtils.intFromLstar(tone)
        }

        let hue = MathUtils.sanitizeDegrees(h)
        let high = chroma
        let mid = chroma
        let low = 0.0
        let isFirstLoop = true
        let answer: Cam16 | null = null

        while (Math.abs(low - high) >= Hct.CHROMA_SEARCH_ENDPOINT) {
            let possibleAnswer = Hct.findCamByJ(hue, mid, tone)
            if (isFirstLoop) {
                if (possibleAnswer != null) {
                    return possibleAnswer.viewed(viewingConditions)
                } else {
                    isFirstLoop = false
                    mid = low + (high - low) / 2.0
                    continue
                }
            }
            if (possibleAnswer == null) {
                high = mid
            } else {
                answer = possibleAnswer
                low = mid
            }
            mid = low + (high - low) / 2.0
        }

        if (answer == null) return ColorUtils.intFromLstar(tone)

        return answer.viewed(viewingConditions)
    }

    static findCamByJ(hue: number, chroma: number, tone: number) {
        let low = 0.0
        let high = 100.0
        let mid = 0.0
        let bestdL = 1000.0
        let bestdE = 1000.0
        let bestCam: Cam16 | null = null

        while (Math.abs(low - high) > Hct.LIGHTNESS_SEARCH_ENDPOINT) {
            mid = low + (high - low) / 2
            let camBeforeClip = Cam16.fromJch(mid, chroma, hue)
            let clipped = camBeforeClip.int
            let clippedLstar = ColorUtils.lstarFromInt(clipped)
            let dL = Math.abs(tone - clippedLstar)
            if (dL < Hct.DL_MAX) {
                let camClipped = Cam16.fromInt(clipped)
                let dE =
                    camClipped.distance(Cam16.fromJch(camClipped.j, camClipped.chroma, hue))
                if (dE <= Hct.DE_MAX && dE <= bestdE) {
                    bestdL = dL
                    bestdE = dE
                    bestCam = camClipped
                }
            }
            if (bestdL == 0 && bestdE < Hct.DE_MAX_ERROR) {
                break
            }
            if (clippedLstar < tone) {
                low = mid
            } else {
                high = mid
            }
        }
        return bestCam
    }
}