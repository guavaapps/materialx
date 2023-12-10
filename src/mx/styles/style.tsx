import {Argb} from "../ui/color/Argb";
import {ColorUtils} from "../ui/color/ColorUtils";
import {ColorStateList} from "./colorStateList";
import {Theme} from "../theme";
import {ColorFunction} from "./colorFunction";
import {Color, Number} from "./types";
import {Hct} from "../ui/color/Hct";
import {Statesheet} from "./statesheet";
import {Shapeable, Sizeable} from "../components/Props";
import React, {RefObject} from "react";

export enum Attr {
    colorPrimary = "colorPrimary",
    colorOnPrimary = "colorOnPrimary",
    colorPrimaryContainer = "colorPrimaryContainer",
    colorOnPrimaryContainer = "colorOnPrimaryContainer",

    colorSecondary = "colorSecondary",
    colorOnSecondary = "colorOnSecondary",

    colorSecondaryContainer = "colorSecondaryContainer",
    colorOnSecondaryContainer = "colorOnSecondaryContainer",

    colorSurface = "colorSurface",
    colorOnSurface = "colorOnSurface",

    colorSurfaceVariant = "colorSurfaceVariant",
    colorOnSurfaceVariant = "colorOnSurfaceVariant",

    colorError = "colorError",
    colorOnError = "colorOnError",

    colorErrorContainer = "colorErrorContainer",
    colorOnErrorContainer = "colorOnErrorContainer",

    colorOutline = "colorOutline",
    colorOutlineVariant = "colorOutlineVariant",

    colorSurfaceDim = "colorSurfaceDim",
    colorSurfaceBright = "colorSurfaceBright ",
    colorSurfaceContainerLowest = "colorSurfaceContainerLowest",
    colorSurfaceContainerLow = "colorSurfaceContainerLow",
    colorSurfaceContainer = "colorSurfaceContainer",
    colorSurfaceContainerHigh = "colorSurfaceContainerHigh",
    colorSurfaceContainerHighest = "colorSurfaceContainerHighest"
}

export type AttrMap = { [attr: string]: any } // resolved refs
export abstract class Style implements AttrMap {
    private static isArgbColorFunc(colorFunc: ColorFunction) {
        return "color" in colorFunc && Object.keys(colorFunc).some((v) => ["red", "green", "blue", "alpha",].includes(v))
    }

    private static isHctColorFunc(colorFunc: ColorFunction) {
        return "color" in colorFunc && Object.keys(colorFunc).some((v) => ["hue", "chroma", "tone"].includes(v))
    }

    private static resolveColorFunc(func: ColorFunction, theme: Theme) {
        if (this.isArgbColorFunc(func)) {
            const color = this.resolveColor(func.color, theme)
            const {red, green, blue, alpha} = func

            let resolvedColor = (Style.create({color: color}, theme) as AttrMap).color
            let resolvedRed = (Style.create({red: red}, theme) as AttrMap).red
            let resolvedGreen = (Style.create({green: green}, theme) as AttrMap).green
            let resolvedBlue = (Style.create({blue: blue}, theme) as AttrMap).blue
            let resolvedAlpha = (Style.create({alpha: alpha}, theme) as AttrMap).alpha

            const argb = Argb.fromInt(ColorUtils.intFromHex(resolvedColor))

            const r = resolvedRed ? resolvedRed : argb.red
            const g = resolvedGreen ? resolvedGreen : argb.green
            const b = resolvedBlue ? resolvedBlue : argb.blue
            const a = resolvedAlpha ? resolvedAlpha : argb.alpha

            return ColorUtils.hexFromInt(new Argb(a * 255, r, g, b).toInt())

            //return `rgba(${r}, ${g}, ${b}, ${a})`
        } else if (this.isHctColorFunc(func)) {
            const {color, hue, chroma, tone} = func

            let rColor = (Style.create({color: color}, theme) as AttrMap).color
            let rHue = (Style.create({color: hue}, theme) as AttrMap).color
            let rChroma = (Style.create({color: chroma}, theme) as AttrMap).color
            let rTone = (Style.create({color: tone}, theme) as AttrMap).color

            const hct = Hct.fromInt(0)

            return ""
        }

        return "#000000"
    }

    static resolveColor(color: Color, style: Style) {
        const isColorFunction = ColorFunction.is(color)

        if (typeof color === "number") {
            return ColorUtils.hexFromInt(color)
        } else if (isColorFunction) {
            return this.resolveColorFunc(color as ColorFunction, style)
        }

        return color
    }

    static resolveNumber(style: Style, val: Number) {
        if (typeof val === "number") {
            return `${val}px`
        } else if (Object.values(Attr).includes(val as unknown as Attr)) {
            return (style as AttrMap)[val as keyof AttrMap]
        }

        return val
    }

    static create<A extends AttrMap>(attrs: A, theme: Theme, injectTheme = false) {
        const styledAttrs: AttrMap = {}

        for (let attr in attrs) {
            const val = attrs[attr]

            const isRef = Object.values(Attr).includes(val)
            const isColorFunction = ColorFunction.is(val)
            const isStatesheet = Statesheet.is(val)

            if (isRef) {
                // console.log(`[REF] resolving attr - name=${attr} val=${JSON.stringify(val)}]`)

                styledAttrs[attr] = theme[Attr[val]]
            } else if (isStatesheet) {
                // console.log(`[STATESHEET] resolving attr - name=${attr} val=${JSON.stringify(val)}]`)

                const resolvedAttrs = Object.keys(val as ColorStateList).map((state) => {
                    const stateAttr = (val as AttrMap)[state]

                    return Style.create(Obj.withAttr<AttrMap>(state, stateAttr), theme)
                })

                styledAttrs[attr] = Object.assign({}, ...resolvedAttrs)

                // console.log("[STATESHEET]   resolved", styledAttrs[attr])
            } else if (isColorFunction) {
                // console.log(`[COLOR_FUNCTION] resolving attr - name=${attr} val=${JSON.stringify(val)}]`)

                styledAttrs[attr] = this.resolveColorFunc(val, theme)
            } else styledAttrs[attr] = val
        }

        // inject theme attrs
        if (injectTheme) Object.assign(styledAttrs, theme)

        return styledAttrs as Style
    }
} // unresolved refs

export abstract class Attrs {
    abstract width?: Number
    abstract height?: Number
    abstract minWidth?: Number
    abstract minHeight?: Number
    abstract maxWidth?: Number
    abstract maxHeight?: Number
    abstract cornerSize?: Number
    abstract cornerStyle?: Attr | "round" | "cut" | Statesheet
    abstract elevation?: number | Attr | Statesheet
    abstract outlineWidth?: Number
    abstract outlineStyle?: Attr | string | Statesheet
    abstract color?: ColorStateList
    abstract backgroundColor?: Color
    abstract textColor?: Color
    abstract outlineColor?: Color
    abstract overlayColor?: Color
    abstract rippleColor?: Color
    abstract paddingLeft?: Number
    abstract paddingRight?: Number
    abstract marginLeft?: Number
    abstract marginRight?: Number
    abstract icon?: Attr | string

    static define<T extends Attrs, A extends Attrs>(target: T, attrs: A, pushAttrs: boolean = true): AttrMap {
        let defined: AttrMap = {...target}

        for (let attrName in attrs) {
            const typedName = attrName as keyof typeof attrs
            const attrInTarget = attrName as keyof typeof target

            const val = attrs[typedName]

            if (pushAttrs && !(attrInTarget in target)) {
                //defined = {...defined, ...{attrInTarget: val}}
                defined[attrName] = val
            } else if (target[attrInTarget] === undefined) {
                // defined = {...defined, ...{attrInTarget: val}}
                defined[attrName] = val
            } else defined[attrName] = val
        }

        return defined
    }
}

export type Rect2 = {
    width: number,
    height: number,

    cornerRadius: number | number[]
}

export type Oval = {
    width: number,
    height: number,
}

export type Shape = Rect2 | Oval

export abstract class ShapeDrawable {
    path?: string

    static create () {

    }

    static typeOf (shape: Shape) {

    }

    static isRect (shape: Shape) {
        return "width" in shape && "height" in shape
    }

    static createRect (rect: Rect2) {
        const radius = rect.cornerRadius
        const r = Array.isArray(radius) ? radius : [radius, radius, radius, radius]

        const w = rect?.width || 100
        const h = rect?.height || 50

        const path = `M0,${r[0]} A${r[0]},${r[0]},0,0,1,${r[0]},0 L${w! - r[1]},0 A${r[1]},${r[1]},0,0,1,${w},${r[1]} L${w},${h! - r[2]} A${r[2]},${r[2]},0,0,1,${w! - r[2]},${h!} L${r[3]},${h!} A${r[3]},${r[3]},0,0,1,0,${h! - r[3]} Z`

        return path
    }

    static createOval (oval: Oval) {
        const w = oval.width || 100
        const h = oval.height || 50

        const rx = w! / 2
        const ry = h! / 2

        const path = `M${0},${ry} a${rx},${ry},0,1,0,${w},${0} a${rx},${ry},0,1,0,${-w},${0} Z`

        return path
    }
}

export class CssUtils {
    static createPath (path: string) {
        return `path("${path}")`
    }
}

class Obj {
    static withAttr<T>(key: string, value: any) {
        const obj: AttrMap = {}
        obj[key] = value

        return obj as T
    }

    static createMap (name: string, body: AttrMap) {

    }
}