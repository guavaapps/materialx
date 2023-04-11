// use for to refer to theme attributes
import {ButtonAttrs, ColorFunction} from "./components/button/button";
import {Argb} from "./ui/color/Argb";
import {ColorUtils} from "./ui/color/ColorUtils";
import {ColorStateList} from "./colorStateList";
import {StyleAdapter, Theme} from "./theme";
import {state} from "./values";

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
    private static resolveColorFunc(func: ColorFunction, theme: Theme) {
        const {color, alpha} = func

        let resolvedColor = (Style.create({color: color}, theme) as AttrMap).color
        let resolvedAlpha = (Style.create({alpha: alpha}, theme) as AttrMap).alpha

        const argb = Argb.fromInt(ColorUtils.intFromHex(resolvedColor))

        const {red, green, blue} = argb

        return `rgba(${red}, ${green}, ${blue}, ${alpha})`
    }

    static create<A extends AttrMap>(attrs: A, theme: Theme) {
        const styledAttrs: AttrMap = {}

        for (let attr in attrs) {
            const val = attrs[attr]

            const isRef = Object.values(Attr).includes(val)
            const isColorFunction = typeof val == "object" && "color" in val && "alpha" in val
            const isColorStateList = typeof val == "object" && !isColorFunction

            if (isRef) {
                styledAttrs[attr] = theme[Attr[val]]
            } else if (isColorStateList) {
                const {enabled, disabled, hovered, pressed, focused} = val as ColorStateList
                let resolved: ColorStateList = {}

                if (enabled) resolved.enabled = Style.create(enabled, theme)
                if (disabled) resolved.disabled = Style.create(disabled, theme)
                if (pressed) resolved.pressed = Style.create(pressed, theme)
                if (hovered) resolved.hovered = Style.create(hovered, theme)
                if (focused) resolved.focused = Style.create(focused, theme)

                styledAttrs[attr] = resolved
            } else if (isColorFunction) {
                styledAttrs[attr] = this.resolveColorFunc(val, theme)
            } else styledAttrs[attr] = val
        }

        // inject theme attrs
        Object.assign(styledAttrs, theme)

        return styledAttrs as Style
    }
} // unresolved refs
export abstract class Attrs {
    abstract width?: number | string | Attr
    abstract height?: number | string | Attr
    abstract cornerSize?: number | number[] | Attr
    abstract cornerStyle?: Attr | string | "round" | "cut"
    abstract elevation?: number | Attr
    abstract outlineWidth?: Attr | string | number
    abstract outlineStyle?: Attr | string
    abstract color?: ColorStateList

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

const ATTRS: ButtonAttrs = {
    width: "fit-content",
    height: 40,
    cornerSize: 20,
    elevation: 0,
    cornerStyle: "round"
    // outlineStyle: "solid",
    // outlineWidth: "1px"
}

const buttonState = {
    filled: {
        colorStateList: {
            enabled: {
                backgroundColor: Attr.colorPrimary,
                textColor: Attr.colorOnPrimary,
            },
            disabled: {
                backgroundColor: {color: Attr.colorOnSurface, alpha: 0.12},
                textColor: {color: Attr.colorOnSurface, alpha: 0.38}
            },
            hovered: {
                overlayColor: {color: Attr.colorOnSurface, alpha: state.hovered.state_layer_opacity}
            },
            pressed: {
                overlayColor: {color: Attr.colorOnSurface, alpha: state.pressed.state_layer_opacity}
            },
            focused: {
                overlayColor: {color: Attr.colorOnSurface, alpha: state.focused.state_layer_opacity}
            }
        } as ColorStateList
    },
    filledTonal: {
        colorStateList: {
            enabled: {
                backgroundColor: Attr.colorSecondaryContainer,
                textColor: Attr.colorOnSecondaryContainer
            },
            disabled: {
                backgroundColor: {color: Attr.colorOnSurface, alpha: 0.12}, //{color:Attr.colorOnSurface, 0.12),
                textColor: {color: Attr.colorOnSurface, alpha: 0.38}
            },
            hovered: {
                overlayColor: {
                    color: Attr.colorOnSecondaryContainer, alpha: state.hovered.state_layer_opacity
                }
            },
            pressed: {
                overlayColor: {color: Attr.colorOnSecondaryContainer, alpha: state.pressed.state_layer_opacity}
            },
            focused: {
                overlayColor: {color: Attr.colorOnSecondaryContainer, alpha: state.focused.state_layer_opacity}
            },
        }
    },
    text: {
        colorStateList: {
            enabled: {
                textColor: Attr.colorPrimary,
            },
            disabled: {
                textColor: {color: Attr.colorOnSurface, alpha: 0.38}
            },
            hovered: {
                overlayColor: {color: Attr.colorPrimary, alpha: state.hovered.state_layer_opacity}
            },
            pressed: {
                overlayColor: {color: Attr.colorPrimary, alpha: state.pressed.state_layer_opacity}
            },
            focused: {
                overlayColor: {color: Attr.colorPrimary, alpha: state.focused.state_layer_opacity}
            }
        } as ColorStateList
    },
    outlined: {
        colorStateList: {
            enabled: {
                // backgroundColor: Attr.colorPrimary,
                textColor: Attr.colorPrimary,
                outlineColor: Attr.colorOutline,
            },
            disabled: {
                backgroundColor: {color: Attr.colorOnSurface, alpha: 0.12},
                textColor: {color: Attr.colorOnSurface, alpha: 0.38},
            },
            hovered: {
                overlayColor: {color: Attr.colorPrimary, alpha: state.hovered.state_layer_opacity}
            },
            pressed: {
                overlayColor: {color: Attr.colorPrimary, alpha: state.pressed.state_layer_opacity}
            },
            focused: {
                outlineColor: Attr.colorPrimary,
                overlayColor: {color: Attr.colorPrimary, alpha: state.focused.state_layer_opacity}
            }
        } as ColorStateList
    },
}

const FILLED_ATTRS: ButtonAttrs = {
    ...ATTRS,
    color: buttonState.filled.colorStateList
}

const TONAL_ATTRS: ButtonAttrs = {
    ...ATTRS,
    color: buttonState.filledTonal.colorStateList,
}

const TEXT_ATTRS: ButtonAttrs = {
    ...ATTRS,
    color: buttonState.text.colorStateList
}

const OUTLINED_ATTRS: ButtonAttrs = {
    ...ATTRS,
    color: buttonState.outlined.colorStateList
}

export const Styles = {
    Button: {
        Filled: {
            ...FILLED_ATTRS
        },
        Outlined: {
            ...OUTLINED_ATTRS
        },
        Text: {
            ...TEXT_ATTRS
        },
        Tonal: {
            ...TONAL_ATTRS
        }
    }
}