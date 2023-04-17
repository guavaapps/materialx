import React, {createContext, MutableRefObject, useContext} from "react"
import {createCssShadow, Elevation} from "./elevation";
import {Argb} from "./ui/color/Argb";
import {
    _DefaultThemeNeutralColors as Neutral,
    _DefaultThemePrimaryColors as Primary,
    _DefaultThemeSecondaryColors as Secondary
} from "./ui/color/ThemeUtils";
import {State} from "./state";
import {ColorState, ColorStateList} from "./styles/colorStateList";
import {AttrMap, Attrs, Style, StyleWrapper} from "./style";
import {Typescale} from "./typescale/typescale";
import {Statesheet} from "./styles/statesheet";
import {s} from "./components/button/styles";

// default themes
export const THEME_LIGHT: Theme = {
    colorError: "#B3261E",
    colorErrorContainer: "#F9DEDC",
    colorOnError: "#FFFFFF",
    colorOnErrorContainer: "#410E0B",
    colorOnPrimary: Primary.pink100,
    colorOnPrimaryContainer: Primary.pink10,
    colorOnSecondary: Secondary.coral100,
    colorOnSecondaryContainer: Secondary.coral10,
    colorOnSurface: Neutral.neutral10,
    colorOnSurfaceVariant: Neutral.neutral_variant30,
    colorOutline: Neutral.neutral_variant50,
    colorOutlineVariant: Neutral.neutral_variant80,
    colorPrimary: Primary.pink40,
    colorPrimaryContainer: Primary.pink90,
    colorSecondary: Secondary.coral40,
    colorSecondaryContainer: Secondary.coral90,
    colorSurface: Neutral.neutral99,
    colorSurfaceVariant: Neutral.neutral_variant99,
}

const THEME_DARK: Theme = {
    colorError: 0,
    colorErrorContainer: 0,
    colorOnError: 0,
    colorOnErrorContainer: 0,
    colorOnPrimary: 0,
    colorOnPrimaryContainer: 0,
    colorOnSecondary: 0,
    colorOnSecondaryContainer: 0,
    colorOnSurface: 0,
    colorOnSurfaceVariant: 0,
    colorOutline: 0,
    colorOutlineVariant: 0,
    colorPrimary: 0,
    colorPrimaryContainer: 0,
    colorSecondary: 0,
    colorSecondaryContainer: 0,
    colorSurface: 0,
    colorSurfaceVariant: 0
}

// theme class
export abstract class Theme {
    colorPrimary?: number | string;
    colorOnPrimary?: number | string;
    colorPrimaryContainer?: number | string;
    colorOnPrimaryContainer?: number | string;

    colorSecondary?: number | string;
    colorOnSecondary?: number | string;

    colorSecondaryContainer?: number | string
    colorOnSecondaryContainer?: number | string

    colorSurface?: number | string
    colorOnSurface?: number | string

    colorSurfaceVariant?: number | string
    colorOnSurfaceVariant?: number | string

    colorError?: number | string
    colorOnError?: number | string

    colorErrorContainer?: number | string
    colorOnErrorContainer?: number | string

    colorOutline?: number | string
    colorOutlineVariant?: number | string

    colorSurfaceDim?: number | string
    colorSurfaceBright?: number | string
    colorSurfaceContainerLowest?: number | string
    colorSurfaceContainerLow?: number | string
    colorSurfaceContainer?: number | string
    colorSurfaceContainerHigh?: number | string
    colorSurfaceContainerHighest?: number | string
}

// theme wrappers for react context
const ThemeProvider = createContext(THEME_LIGHT)

export const useTheme = () => useContext(ThemeProvider);

type ThemeWrapperProps<C extends Component, P extends Props> = {
    Component: (props: P) => C,
    props: P,
    styleAttrs: Attrs
    attrs?: Attrs
    theme?: Theme,
}

export function ThemeWrapper<C extends Component, P extends Props>(wrapperProps: ThemeWrapperProps<C, P>): Component {
    const {Component, props, theme, styleAttrs, attrs} = wrapperProps

    const superTheme = useTheme()

    const resolvedTheme = theme ? theme : superTheme

    const themeWrapper = {
        ...React.createElement(ThemeProvider.Provider, {value: resolvedTheme}),
    }

    const definedAttrs = attrs ? Attrs.define(styleAttrs, attrs) : styleAttrs
    const styledAttrs = Style.create(definedAttrs, resolvedTheme)

    return (
        <ThemeProvider.Provider value={resolvedTheme}>
            <Component {...props}></Component>
        </ThemeProvider.Provider>
    )
}

// apply theme
export function styled<C extends Component, P extends Props, A extends Attrs>(
    Component: (props: P) => C, props: P,
    styleAttrs: A, attrs?: A,
    theme?: Theme,
): Component {

    const themeWrapper = <ThemeWrapper Component={Component} props={props} theme={theme}
                                       styleAttrs={styleAttrs} attrs={attrs}></ThemeWrapper>

    return themeWrapper
}

const buttonSheet = (ref: React.RefObject<HTMLElement>, _style: Style) => {
    const style = _style as AttrMap

    const radius = {
        "borderRadius": (() => {
            return Array.isArray(style.cornerSize) ? style.cornerSize.map((v) => `${v}px`).join(" ") : `${style.cornerSize}px`
        })()
    }

    const applyCorners = () => {
        if (style.cornerStyle === "round" || style.cornerStyle === undefined) {
            return radius
        } else if (style.cornerStyle === "cut") {
            return {clipPath: StyleAdapter.createCutCorners(ref, style.cornerSize)}
        }
    }

    const shape = {
        "all": "unset",
        "width": StyleAdapter.resolveSize(style.width),
        "height": StyleAdapter.resolveSize(style.height),
        "transitionDuration": "200ms",
        "userSelect": "none",
        clipPath: "border-box",
        ...applyCorners()
    }

    // base
    const base = {
        component: {
            ...shape,
            "position": "relative"
        },
        shadowLayer: {
            ...shape,
        },
        container: {
            ...shape,
            width: "fit-content",

            display: "flex",
            justifyContent: "center",
            alignItems: "center",
        },
        stateLayer: {
            ...shape,
            width: "100%",
        },
        label: {
            ...shape,
            ...Typescale.Label.Large,
            userSelect: "none",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "default",
            marginLeft: style.iconPaddingRight,
            marginRight: style.paddingRight,
            width: "max-content",
        }
    }

    const button = {
        component: {
            ...base.component,
            overflow: "visible",
        },
        shadowLayer: {
            ...base.shadowLayer,
            overflow: "visible",

            ...createCssShadow(style.elevation)
        },

        container: {
            ...base.container,
            position: "relative",
            overflow: "hidden",

            backgroundColor: style.backgroundColor,
            color: style.textColor,
            borderStyle: style.outlineStyle,
            borderWidth: style.outlineWidth,
            borderColor: style.outlineColor,
        },
        stateLayer: {
            ...base.stateLayer,
            position: "absolute",
            transitionDuration: "200ms",
            backgroundColor: style.overlayColor,
        },
        label: {
            ...base.label,
            color: style.textColor,
            borderRadius: "unset",
            clipPath: "unset",
        },
        icon: {
            ...base.label,
            color: style.textColor,
            borderRadius: "unset",
            clipPath: "unset",
            width: style.iconSize,
            height: style.iconSize,
            maskSize: style.iconSize,
            maskRepeat: "no-repeat",
            maskPosition: "center",
            marginLeft: style.paddingLeft,
            marginRight: "0px",
            backgroundColor: style.textColor,
        }
    }

    return button
}

export class StyleAdapter {
    static wrap(ref: React.RefObject<HTMLElement>, style: Style): object {
        // @ts-ignore
        const wrapper = Object.assign({}, buttonSheet(ref, style))

        return wrapper
    }

    static createCutCorners(ref: React.RefObject<HTMLElement>, _radius: number | number[][]) {
        if (ref.current == null) return null

        const radius = Array.isArray(_radius) ? _radius : Array.from(Array(4)).map(() => [_radius, _radius])

        const bounds = ref.current!.getBoundingClientRect()
        const width = bounds?.width
        const height = bounds?.height

        const points = [
            [[0, radius[0][0]], [radius[0][0], 0]],
            [[width - radius[0][0], 0], [width, radius[0][0]]],

            [[width, height - radius[0][0]], [width - radius[0][0], height]],
            [[radius[0][0], height], [0, height - radius[0][0]]],
        ]

        const css = points.map((point) => {
            return point.map(p => p.map(_p => `${Math.round(_p)}px`).join(" "))
        }).join(", ")

        return `polygon(${css})`
    }

    static wrapColorStateList(_colorStateList: ColorStateList) {
        return _colorStateList

        const colorStateList = _colorStateList as AttrMap

        const enabled = colorStateList["enabled" as keyof typeof colorStateList] as ColorState

        const wrapped: ColorStateList = {...colorStateList}

        Object.values(State).forEach((state) => {
            if (!(state in colorStateList)) {
                colorStateList[state as keyof typeof colorStateList] = enabled
            }
        })

        return wrapped
    }

    protected static createEmptyState(state: string) {
        const obj = {}
        // @ts-ignore
        obj[state as keyof typeof obj] = {}

        return obj
    }

    static resolveSize(size?: number | string) {
        return typeof size === "number" ? `${size}px` : size
    }

    protected static wrapArgb(color: number) {
        const argb = Argb.fromInt(color)

        const {alpha, red, green, blue} = argb

        return `rgba(${alpha}, ${red}, ${green}, ${blue})`
    }

    static resolve(from: object, state?: string) {
        return {
            ...this.extractBase(from),
            ...from[state as keyof typeof from] as object
        }
    }

    static extractBase(from: object) {
        const attrs = Object.keys(from).filter((attr) => {
            const fromKey = attr as keyof typeof attr
            const typeOf = typeof from[attr as keyof typeof from]
            const isObj = typeOf != "object"
            const isMoreObj = typeOf !== "object"

            return typeof from[attr as keyof typeof from] !== "object"
        })

        const attrMap = attrs.map((v) => {
            const attr: { [key: string]: any } = {}
            attr[v as keyof typeof attr] = from[v as keyof typeof from]

            return attr
        })

        return Object.assign({}, ...attrMap)
    }

    static wrapStatesheet (statesheet: Statesheet) {
        const wrapped = Object.keys(Statesheet.empty()).map((state) => {
            const attrs = statesheet[state]

            const obj: AttrMap = {}
            obj[state] = attrs ? attrs : statesheet.enabled

            return obj
        })


        const r = Object.assign({}, ...wrapped)
        console.log("statesheet wrap", r)

        return r
    }

    static spread(_attrs: Attrs) {
        const attrs = _attrs as AttrMap

        const states = Statesheet.empty()

        Object.keys(attrs).map((attr) => {
            let val = attrs[attr]
            // console.log("ss", attr, val)

            if (Statesheet.is(val)) {
                val = this.wrapStatesheet(val)

                Object.keys(val).forEach((v) => {
                    const obj: AttrMap = {}
                    obj[attr] = val[v]
                    Object.assign(states[v], obj)

                    // console.log("spreading statesheet", v, attr, val[v])
                })
            } else {
                Object.keys(states).forEach((v) => {
                    const obj: AttrMap = {}
                    obj[attr] = val
                    Object.assign(states[v], obj)
                })
            }
        })

        console.log("states", states)

        return states
    }

    //
    static create(statesheet: Statesheet, stateNames: string[] = ["enabled", "disabled", "pressed", "hovered", "focused"]): { [key: string]: any } {
        let base = this.spread(statesheet as AttrMap)

        // let states = stateNames!.map((state) => {
        //     const obj = {}
        //
        //     let stateObj = statesheet[state] ? statesheet[state] : this.createEmptyState(state)
        //     stateObj = this.spread(stateObj)
        //
        //     // @ts-ignore
        //     obj[state] = {
        //         ...base,
        //         ...stateObj
        //     }
        //
        //     return obj
        // })

        let r = {}

        Object.assign(r, base)

        return r

    }
}

export interface Component extends JSX.Element {
    key: React.Key | null
    props: any
    type: any


}

export interface Props {
    style?: Style
}