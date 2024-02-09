import {Statesheet} from "./Statesheet";
import {Color, Number, String} from "./Color";

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

export type AttributeSet = { [attribute: string]: any }

export namespace AttributeSet {
    export function hasDefinedAttribute(name: string, attributes: AttributeSet) {
        const definedAttributes = Object.keys(attributes)

        return definedAttributes.includes(name)
    }

    export function getAttribute(name: string, attributes: AttributeSet, defaultValue: any = undefined) {
        return attributes[name] ?? defaultValue
    }
}

export abstract class Style implements AttributeSet {
    [attribute: string]: any
}

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

    abstract color?: Color
    abstract backgroundColor?: Color

    abstract textColor?: Color
    abstract outlineColor?: Color

    abstract overlayColor?: Color
    abstract rippleColor?: Color

    abstract paddingLeft?: Number
    abstract paddingTop?: Number
    abstract paddingRight?: Number
    abstract paddingBottom?: Number

    abstract marginLeft?: Number
    abstract marginRight?: Number
    abstract icon?: Attr | string
}

export namespace Style {
    export function extend(style: Style, from: Style) {
        const extendedTheme = Object.assign({}, from)
        const themeAttrs = Object.keys(style)

        for (let attr of themeAttrs) {
            extendedTheme[attr] = style[attr]
        }

        return extendedTheme
    }

    export function create(attributeSet: AttributeSet, style: Style) {
        const newStyle: Style = {}

        const attributes = Object.keys(attributeSet)

        for (let attribute of attributes) {
            const value = attributeSet[attribute]

            newStyle[attribute] = resolveAttribute(value, style)
        }

        return newStyle
    }

    function resolveAttribute(attribute: any, style: Style) {
        if (Number.isNumber(attribute, style)) {
            return Number.resolve(attribute, style)
        } else if (String.isString(attribute, style)) {
            return String.resolve(attribute, style)
        } else if (Color.isColor(attribute, style)) {
            return Color.resolve(attribute, style)
        }
    }
}