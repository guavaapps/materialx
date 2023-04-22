import {Attr, AttrMap, Attrs, Style} from "../styles/style";
import PointerEvent from "../ui/event/pointer_event";
import {StyleAdapter, useTheme} from "../theme";
import {RefObject, useLayoutEffect, useMemo, useRef, useState} from "react";
import {State} from "../state";
import useRipple from "./ripple/ripple";
import {PointerEventCallback} from "../ui/event/pointerEventCallback";
import {Typescale} from "../typescale/typescale";
import {createCssShadow} from "../elevation";
import {ReactUiEventAdapter} from "../ui/event/react_ui_event_adapter";
import {Simulate} from "react-dom/test-utils";
import select = Simulate.select;

enum Layer {
    COMPONENT = "component",
    SHADOW_LAYER = "shadowLayer",
    CONTAINER = "container",
    LABEL = "label",
    STATE_LAYER = "stateLayer",
    LEADING_ICON = "leadingIcon",
    TRAILING_ICON = "trailingIcon"
}

type ChipProps = {
    label?: string,
    leadingIcon?: string,
    trailingIcon?: string,
    style?: Attrs,
    onClick?: (e?: PointerEvent) => void;
    onPressed?: (e?: PointerEvent) => void;
    onReleased?: (e?: PointerEvent) => void;
    onHover?: (e?: PointerEvent) => void;
    onHoverEnd?: (e?: PointerEvent) => void;
    isEnabled?: boolean
}

const _Chip = (ref: RefObject<HTMLElement>, _style: Style) => {
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
        all: "unset",
        display: "block",
        width: StyleAdapter.resolveSize(style.width),
        height: StyleAdapter.resolveSize(style.height),
        transitionDuration: "200ms",
        userSelect: "none",
        clipPath: "border-box",
        ...applyCorners()
    }

    // base
    const base = {
        component: {
            ...shape,
            position: "relative"
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
            marginRight: style.iconPaddingLeft,
            width: "max-content",
        }
    }

    return {
        component: {
            ...base.component,
            overflow: "visible",
            clipPath: "unset"
        },
        shadowLayer: {
            ...base.shadowLayer,
            overflow: "visible",
            clipPath: "unset",

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
            transform: `scale(${style.scale})`
        },
        leadingIcon: {
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
        },
        trailingIcon: {
            ...base.label,
            color: style.textColor,
            borderRadius: "unset",
            clipPath: "unset",
            width: style.iconSize,
            height: style.iconSize,
            maskSize: style.iconSize,
            maskRepeat: "no-repeat",
            maskPosition: "center",
            marginLeft: "0px",
            marginRight: style.paddingRight,
            backgroundColor: style.textColor,
        }
    }
}

export abstract class ChipAttrs extends Attrs {
    iconPaddingLeft?: Attr | string | number
    iconPaddingRight?: Attr | string | number
    iconSize?: Attr | string | number
}

export function Chip(props: ChipProps = {
    isEnabled: true,
    label: "",
    leadingIcon: "",
    trailingIcon: ""
}) {
    let {
        label, leadingIcon, trailingIcon,
        isEnabled,
        style,
        onClick, onHover, onHoverEnd, onPressed, onReleased
    } = props

    isEnabled = isEnabled || isEnabled === undefined

    const theme = useTheme()!

    const stateController = useState(isEnabled ? State.STATE_ENABLED : State.STATE_DISABLED)

    const ref = useRef<HTMLDivElement>(null)
    const [refState, setRef] = useState(ref.current)

    // create statesheets
    const [styledAttrs, styles] = useMemo(() => {
        // create styled attrs
        const styledAttrs = Style.create(style as AttrMap, theme)

        // create style statesheet i.e styles for different states
        const styledStatesheet = StyleAdapter.create(styledAttrs)
        console.log("sstates", styledStatesheet)

        // create css stylesheets for each component layer
        const s = Object.values(Layer).map((layer) => {
            // @ts-ignore
            const containerLayer = Object.assign({}, ...Object.values(State).map((it) => {
                const obj: AttrMap = {}
                obj[it] = _Chip(ref, styledStatesheet[it])[layer as keyof object]
                return obj
            }))

            const layerObj = {}

            // @ts-ignore
            layerObj[layer as keyof typeof layerObj] = containerLayer
            return layerObj
        })

        return [styledAttrs, Object.assign({}, ...s)]

        // reference refState to trigger redraw on component mount since component size is only available after mount
        // refState updates with the current element holding the ref after mount
    }, [style, theme, refState])

    const [state, setState] = stateController

    const rippleColor = (styledAttrs as AttrMap).rippleColor

    const ripple = useRipple(ref, rippleColor as string)

    const [isSelected, setSelected] = useState(false)

    // get stylesheet for a given layer
    function stateRefFor(layer: Layer) {
        if (isSelected) {
            let filtered = Object.keys(styles[layer].selected).filter((it) => {
                const val = styles[layer].selected[it]

                console.log("f", it, val)

                return val
            }).map((it) => {
                const obj: AttrMap = {}
                obj[it] = styles[layer].selected [it]

                return obj
            })

            filtered = Object.assign({}, ...filtered)

            console.log("filtered", filtered)

            // TODO add composite states to statesheets
            const r = {
                ...styles[layer][state],
                ...filtered
            }

            if (layer === Layer.STATE_LAYER) {
                console.log("state layer", state, styles[layer].selected)
            }

            return r
        }

        return styles[layer][state]
    }

    // handle state changes triggered by ui events
    const pointerEventCallback = new class extends PointerEventCallback {
        onClick(e?: PointerEvent) {
            onClick?.(e)

            if (isEnabled) {
                console.log("setting selected")
                //setState(state === State.STATE_SELECTED ? State.STATE_ENABLED : State.STATE_SELECTED)
                setSelected(it => !it)
            }
        }

        onHover(e?: PointerEvent) {
            if (isEnabled) setState(State.STATE_HOVERED)

            onHover?.(e)
        }

        onHoverEnd(e?: PointerEvent) {
            if (isEnabled) setState(State.STATE_ENABLED)

            onHoverEnd?.(e)
        }

        onPressed(e?: PointerEvent) {
            if (isEnabled) setState(State.STATE_PRESSED)

            onPressed?.(e)
        }

        onReleased(e?: PointerEvent) {
            if (isEnabled) setState(State.STATE_HOVERED)

            onReleased?.(e)
        }

        onMoved(e?: PointerEvent) {

        }
    }()

    useLayoutEffect(() => {
        // trigger redraw after layout
        setRef(ref.current)
    }, [])

    return (
        <div
            tabIndex={0}
            style={stateRefFor(Layer.COMPONENT)}

            onFocus={() => {
                if (isEnabled) setState(State.STATE_FOCUSED)
            }}
            onBlur={() => {
                if (isEnabled) setState(State.STATE_ENABLED)
            }}

            ref={ref}

            {...ReactUiEventAdapter.wrap(ref, pointerEventCallback)}>

            <span style={stateRefFor(Layer.SHADOW_LAYER)}>
                <span style={stateRefFor(Layer.CONTAINER)}>
                    <span style={stateRefFor(Layer.STATE_LAYER)}></span>
                    <span style={{
                        ...stateRefFor(Layer.LEADING_ICON),
                        ...(() => {
                            if (!leadingIcon || leadingIcon === "") {
                                return {
                                    width: 0,
                                    height: 0,
                                    maskSize: "0px"
                                }
                            }
                        })(),

                        ...(() => {
                            if (!isSelected) {
                                return {
                                    width: 0,
                                    height: 0,
                                    maskSize: "0px",
                                    alpha: 0
                                }
                            }
                        })(),

                        maskImage: `url(${leadingIcon})`,
                    }}></span>
                    <span style={stateRefFor(Layer.LABEL)}>
                        {label}
                    </span>
                    <span style={{
                        ...stateRefFor(Layer.TRAILING_ICON),
                        ...(() => {
                            if (!trailingIcon || trailingIcon === "") {
                                return {
                                    width: 0,
                                    height: 0,
                                    maskSize: "0px"
                                }
                            }
                        })(),
                        maskImage: `url(${trailingIcon})`
                    }}></span>
                    {isEnabled ? ripple : null}
                </span>
            </span>
        </div>
    )
}