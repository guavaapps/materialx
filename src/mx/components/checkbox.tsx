import {Attr, AttrMap, Attrs, Style} from "../styles/style";
import {PointerEvent} from "../ui/event/pointer_event";
import {StyleAdapter, useTheme} from "../theme";
import {RefObject, useLayoutEffect, useMemo, useRef, useState} from "react";
import {State} from "../state";
import useRipple from "./ripple/ripple";
import {PointerEventCallback} from "../ui/event/pointerEventCallback";
import {createCssShadow} from "../elevation";
import {ReactUiEventAdapter} from "../ui/event/react_ui_event_adapter";
import {Color} from "../styles/types";

const _Checkbox = (ref: RefObject<HTMLElement>, _style: Style) => {
    const style = _style as AttrMap

    const radius = {
        "borderRadius": (() => {
            if (!style.cornersize) return "0px"
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
            userSelect: "none",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "default",
        }
    }

    return {
        component: {
            ...base.component,
            overflow: "visible",
            clipPath: "unset",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
        },
        shadowLayer: {
            ...base.shadowLayer,
            overflow: "visible",
            clipPath: "unset",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            ...createCssShadow(style.elevation)
        },

        container: {
            ...base.container,
            position: "relative",
            overflow: "hidden",

            // backgroundColor: style.backgroundColor,
            // color: style.textColor,
            // borderStyle: style.outlineStyle,
            // borderWidth: style.outlineWidth,
            // borderColor: style.outlineColor,
        },
        stateLayer: {
            ...base.stateLayer,
            position: "absolute",
            transitionDuration: "200ms",
            backgroundColor: style.overlayColor,
        },

        box: {
            ...base.label,
            // position: "absolute",
            maskPosition: "center",
            maskRepeat: "no-repeat",
            width: style.iconSize,
            height: style.iconSize,
            maskSize: style.iconSize,

            backgroundColor: style.backgroundColor,
        },

        icon: {
            ...base.label,
            position: "absolute",
            maskPosition: "center",
            maskRepeat: "no-repeat",
            width: style.iconSize,
            height: style.iconSize,
            maskSize: style.iconSize,

            backgroundColor: style.iconColor,
        },
    }
}

enum Layer {
    COMPONENT = "component",
    SHADOW_LAYER = "shadowLayer",
    CONTAINER = "container",
    LABEL = "label",
    STATE_LAYER = "stateLayer",
    BOX = "box",
    ICON = "icon",
}

type CheckboxProps = {
    style?: CheckboxAttrs,
    onClick?: (e?: PointerEvent) => void;
    onPressed?: (e?: PointerEvent) => void;
    onReleased?: (e?: PointerEvent) => void;
    onHover?: (e?: PointerEvent) => void;
    onHoverEnd?: (e?: PointerEvent) => void;
    isEnabled?: boolean,
    selected?: boolean
}

export abstract class CheckboxAttrs extends Attrs {
    iconPaddingLeft?: Attr | string | number
    iconPaddingRight?: Attr | string | number
    iconSize?: Attr | string | number
    iconColor?: Color
    containerChecked?: Attr | string
    containerUnchecked?: Attr | string
    iconChecked?: Attr | string
    iconIndeterminate?: Attr | string
}

// btn
/*

btn icon {
    checked -> mtrl_ic_check_mark -> strings :: (M14,18.2 11.4,15.6 10,17 14,21 22,13 20.6,11.6z)
    i -> mtrl_ic_indeterminate -> strings :: (M13.4,15 11,15 11,17 13.4,17 21,17 21,15z)
    u -> M23,7H9C7.9,7,7,7.9,7,9v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V9C25,7.9,24.1,7,23,7z M23,23H9V9h14V23z
}
 */

enum CheckboxState {
    UNCHECKED,
    CHECKED,
    INDETERMINATE
}

export function Checkbox(props: CheckboxProps = {
    isEnabled: true,
    selected: false
}) {
    let {
        isEnabled, selected,
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
        const [styledStatesheet, states] = StyleAdapter.create(styledAttrs)

        // create css stylesheets for each component layer
        const s = Object.values(Layer).map((layer) => {
            // @ts-ignore
            const containerLayer = Object.assign({}, ...Object.values(State).map((it) => {
                const obj: AttrMap = {}
                if (styledStatesheet[it]) obj[it] = _Checkbox(ref, styledStatesheet[it])[layer as keyof object]
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

    const [isSelected, setSelected] = useState(selected)

    const [checkboxState, setCheckboxState] = useState(selected ? CheckboxState.CHECKED : CheckboxState.UNCHECKED)

    function container() {
        if (checkboxState === CheckboxState.CHECKED) return {
            //transition: "maskImage, background-color 50ms linear",
            opacity: 1
        }

        return {
            // transition: "maskImage, background-color 50ms linear",
            // maskImage: `url(${styledAttrs["containerUnchecked" as keyof object]})`,
            opacity: 0,
        }
    }

    function icon() {
        console.log("checked", checkboxState === CheckboxState.CHECKED)

        if (checkboxState === CheckboxState.CHECKED) return {
            opacity: 1,
            scale: 1,
        }
        else if (checkboxState === CheckboxState.INDETERMINATE) return {
            opacity: 1,
            scale: 1,
            maskImage: `url(${styledAttrs["iconIndeterminate" as keyof object]})`
        }

        return {
            scale: 1,
            opacity: 0,
        }
    }

    // get stylesheet for a given layer
    function stateRefFor(layer: Layer) {
        if (isSelected) {
            let filtered = Object.keys(styles[layer].selected).filter((it) => {
                const val = styles[layer].selected[it]

                return val
            }).map((it) => {
                const obj: AttrMap = {}
                obj[it] = styles[layer].selected [it]

                return obj
            })

            filtered = Object.assign({}, ...filtered)

            // TODO add composite states to statesheets
            const r = {
                ...styles[layer][state],
                ...filtered
            }

            if (layer === Layer.STATE_LAYER) {
            }

            console.log(`styles[${layer}][${state}]`, r)

            return r
        }

        return styles[layer][state]
    }

    function iconCheck(icon?: string) {
        if (!icon || icon === "") {
            return {
                width: 0,
                height: 0,
                maskSize: "0px"
            }
        }
    }

    // handle state changes triggered by ui events
    const pointerEventCallback = {
        onClick(e?: PointerEvent) {
            onClick?.(e)

            if (isEnabled) {
                //setState(state === State.STATE_SELECTED ? State.STATE_ENABLED : State.STATE_SELECTED)
                setSelected(it => !it)
                setCheckboxState(it => it === CheckboxState.CHECKED ? CheckboxState.UNCHECKED : CheckboxState.CHECKED)
            }
        },

        onHover(e?: PointerEvent) {
            if (isEnabled) setState(State.STATE_HOVERED)

            onHover?.(e)
        },

        onHoverEnd(e?: PointerEvent) {
            if (isEnabled) setState(State.STATE_ENABLED)

            onHoverEnd?.(e)
        },

        onPressed(e?: PointerEvent) {
            if (isEnabled) setState(State.STATE_PRESSED)

            onPressed?.(e)
        },

        onReleased(e?: PointerEvent) {
            if (isEnabled) setState(State.STATE_HOVERED)

            onReleased?.(e)
        },

        onMoved(e?: PointerEvent) {

        }
    }

    useLayoutEffect(() => {
        // trigger redraw after layout
        setRef(ref.current)
    }, [])

    // @ts-ignore
    return (
        <button
            tabIndex={0}
            style={stateRefFor(Layer.COMPONENT)}

            onFocus={() => {
                if (isEnabled) setState(State.STATE_FOCUSED)
            }}
            onBlur={() => {
                if (isEnabled) setState(State.STATE_ENABLED)
            }}

            // @ts-ignore
            ref={ref}

            // @ts-ignore
            {...ReactUiEventAdapter.wrap(ref, pointerEventCallback)}>

            {/*<span style={{*/}
            {/*    width: 50,*/}
            {/*    height: 50*/}
            {/*}} onPointerEnter={() => {*/}
            {/*    console.log("entered")*/}
            {/*}}></span>*/}

            <span style={stateRefFor(Layer.SHADOW_LAYER)}>
                <span style={stateRefFor(Layer.CONTAINER)}>
                    <span style={stateRefFor(Layer.STATE_LAYER)}></span>

                    <span style={{
                        ...stateRefFor(Layer.BOX),

                        maskImage: `url(${styledAttrs["containerUnchecked" as keyof object]})`,
                    }}></span>

                    <span style={{
                        ...stateRefFor(Layer.BOX),
                        position: "absolute",

                        ...container(),
                        maskImage: `url(${styledAttrs["containerChecked" as keyof object]})`,
                    }}>
                    </span>

                    <span id={"icon"} style={{
                        ...stateRefFor(Layer.ICON),

                        ...icon(),

                        maskImage: `url(${styledAttrs["iconChecked" as keyof object]})`
                    }}></span>

                    {isEnabled ? ripple : null}
                </span>
            </span>
        </button>
    )
}