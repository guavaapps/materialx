import "./styles/filled.scss"
import "./styles/outlined.scss"
import "./styles/text.scss"
import "./styles/filled-tonal.scss"
import React, {RefObject, useLayoutEffect, useMemo, useRef, useState} from "react";
import PointerEvent from "../../ui/event/pointer_event";
import {State} from "../../state";
import {PointerEventCallback} from "../../ui/event/pointerEventCallback";
import {ReactUiEventAdapter} from "../../ui/event/react_ui_event_adapter";
import useRipple from "../../ui/ripple/ripple";
import {Component, Props, StyleAdapter, styled, useTheme} from "../../theme";
import {state} from "../../values";
import {ColorStateList} from "../../styles/colorStateList";
import {Attr, AttrMap, Attrs, Style, Styles} from "../../style";
import add from "../../../add.svg"

export enum ButtonStyle {
    FILLED = "filled",
    OUTLINED = "outlined",
    TONAL = "filledTonal",
    ELEVATED = "elevated",
    TEXT = "text",
}

export abstract class ButtonAttrs extends Attrs {
    iconPaddingRight?: Attr | string | number
    iconSize?: Attr | string | number
}

enum Layer {
    COMPONENT = "component",
    SHADOW_LAYER = "shadowLayer",
    CONTAINER = "container",
    LABEL = "label",
    STATE_LAYER = "stateLayer",
    ICON = "icon"
}

export interface ButtonProps<T extends Attrs> extends Props {
    label?: string;
    icon?: string;
    style?: T;
    isEnabled?: boolean;
    onClick?: (e?: PointerEvent) => void;
    onPressed?: (e?: PointerEvent) => void;
    onReleased?: (e?: PointerEvent) => void;
    onHover?: (e?: PointerEvent) => void;
    onHoverEnd?: (e?: PointerEvent) => void;
}

// function {color:hex: string, alpha: number) {
//     const argb = Argb.fromInt(ColorUtils.intFromHex(Attr.colorOnSurface))
//     const {red, green, blue} = argb
//
//     return `rgba(${red}, ${green}, ${blue}, ${alpha})`
// }

export function _Button(props: ButtonProps<ButtonAttrs> = {
    label: "",
    icon: "",
    isEnabled: true,
}): Component {
    let {
        label, icon, style = Styles.Button.Filled,
        isEnabled,
        onClick, onPressed, onReleased, onHover, onHoverEnd
    } = props

    isEnabled = isEnabled || isEnabled === undefined

    const theme = useTheme()

    const stateController = useState(isEnabled ? State.STATE_ENABLED : State.STATE_DISABLED);

    const ref: RefObject<any> = useRef(null)
    const [refState, setRef] = useState(ref.current)

    // create statesheets
    const styles = useMemo(() => {
        const styledAttrs = Style.create(style as AttrMap, theme)

        console.log("style", styledAttrs)

        // create statesheets from styled attrs
        const wrapper = StyleAdapter.wrap(ref, styledAttrs)

        console.log("wrapper", wrapper)

        // create css wrappers for statesheets
        const s = Object.values(Layer).map((layer) => {
            // @ts-ignore
            const containerLayer = StyleAdapter.create(wrapper[layer])
            console.log(`layer [${layer}]`, containerLayer)

            const layerObj = {}

            // @ts-ignore
            layerObj[layer as keyof typeof layerObj] = containerLayer
            return layerObj
        })

        return Object.assign({}, ...s)
    }, [style, theme, refState])

    const [state, setState] = stateController

    const rippleColor = theme[Attr.colorError]

    const ripple = useRipple(ref, rippleColor as string)

    // get statesheet for a given layer
    function stateRefFor(layer: Layer) {
        return styles[layer][state]
    }

    // handle state changes triggered by ui events
    const pointerEventCallback = new class extends PointerEventCallback {
        onClick(e?: PointerEvent) {
        }

        onHover(e?: PointerEvent) {
            if (isEnabled) setState(State.STATE_HOVERED)
        }

        onHoverEnd(e?: PointerEvent) {
            if (isEnabled) setState(State.STATE_ENABLED)
        }

        onPressed(e?: PointerEvent) {
            if (isEnabled) setState(State.STATE_PRESSED)
        }

        onReleased(e?: PointerEvent) {
            if (isEnabled) setState(State.STATE_HOVERED)
        }

        onMoved(e?: PointerEvent) {

        }
    }()

    useLayoutEffect(() => {
        // trigger redraw after layout
        setRef(ref.current)
    }, [])

    return (
        // TODO move focus listeners to adapter
        <button
            style={stateRefFor(Layer.COMPONENT)}
            onFocus={() => {
                if (isEnabled) setState(State.STATE_FOCUSED)
            }}
            onBlur={() => {
                if (isEnabled) setState(State.STATE_ENABLED)
            }}

            ref={ref}

            // create react ui callbacks
            {...ReactUiEventAdapter.wrap(ref, pointerEventCallback)}>
            <span
                style={stateRefFor(Layer.SHADOW_LAYER)}>
                <span style={stateRefFor(Layer.CONTAINER)}>
                    <span style={stateRefFor(Layer.STATE_LAYER)}></span>

                    <span style={{
                        ...stateRefFor(Layer.ICON),
                        maskImage: `url(${icon})`// no-repeat center`,
                    }}></span>

                    <span style={stateRefFor(Layer.LABEL)}>
                        {label}
                    </span>
                    {isEnabled ? ripple : null}
                </span>
            </span>
        </button>
    )
}

export const Button = (props: ButtonProps<ButtonAttrs>) => {
    return _Button(props)//styled(_Button, props, )
}