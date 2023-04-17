// use for to refer to theme attributes
import {ButtonAttrs} from "./components/button/button";
import {Argb} from "./ui/color/Argb";
import {ColorUtils} from "./ui/color/ColorUtils";
import {ColorState, ColorStateList} from "./styles/colorStateList";
import {StyleAdapter, Theme} from "./theme";
import {state} from "./values";
import {ColorFunction} from "./styles/colorFunction";
import {Color, Number} from "./styles/types";
import {Hct} from "./ui/color/Hct";
import {Statesheet} from "./styles/statesheet";

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

            return `rgba(${r}, ${g}, ${b}, ${a})`
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
                styledAttrs[attr] = theme[Attr[val]]
            } else if (isStatesheet) {
                const {enabled, disabled, hovered, pressed, focused} = val as ColorStateList
                let resolved: ColorStateList = {}

                if (enabled) resolved.enabled = Style.create({enabled}, theme)["enabled" as keyof Style]
                if (disabled) resolved.disabled = Style.create({disabled}, theme)["disabled" as keyof Style]
                if (pressed) resolved.pressed = Style.create({pressed}, theme)["pressed" as keyof Style]
                if (hovered) resolved.hovered = Style.create({hovered}, theme)["hovered" as keyof Style]
                if (focused) resolved.focused = Style.create({focused}, theme)["focused" as keyof Style]

                styledAttrs[attr] = resolved

                //
                const resolvedAttrs = Object.keys(val as ColorStateList).map((state) => {
                    const stateAttr = (val as AttrMap)[state]

                    const styled = Style.create(Obj.withAttr<AttrMap>(state, stateAttr), theme)

                    return styled
                })

                styledAttrs[attr] = Object.assign({}, ...resolvedAttrs)
                console.log("sattrs", styledAttrs)

            } else if (isColorFunction) {
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

export type StyleWrapper = {
    name: string,
    style: Style
}

class Obj {
    static withAttr<T>(key: string, value: any) {
        const obj: AttrMap = {}
        obj[key] = value

        return obj as T
    }
}