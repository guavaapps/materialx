import React, {RefObject, useLayoutEffect, useMemo, useRef, useState} from "react";
import PointerEvent from "../../ui/event/pointer_event";
import {State} from "../../state";
import {PointerEventCallback} from "../../ui/event/pointerEventCallback";
import {ReactUiEventAdapter} from "../../ui/event/react_ui_event_adapter";
import useRipple from "../ripple/ripple";
import {Component, Props, StyleAdapter, styled, useTheme} from "../../theme";
import {Attr, AttrMap, Attrs, Style} from "../../styles/style";
import {Styles} from "./styles";

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

    const theme = useTheme()!

    const stateController = useState(isEnabled ? State.STATE_ENABLED : State.STATE_DISABLED);

    const ref = useRef<HTMLButtonElement>(null)
    const [refState, setRef] = useState(ref.current)

    // create statesheets
    const [styledAttrs, styles] = useMemo(() => {
        // create styled attrs
        const styledAttrs = Style.create(style as AttrMap, theme)

        // apply styled attrs to component stylesheet
        const wrapper = StyleAdapter.wrap(ref, styledAttrs)

        // create css stylesheets for each component layer
        const s = Object.values(Layer).map((layer) => {
            // @ts-ignore
            const containerLayer = StyleAdapter.create(wrapper[layer])

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

    const rippleColor = (styledAttrs as AttrMap).rippleColor["enabled"]//state]

    const ripple = useRipple(ref, rippleColor as string)

    // get stylesheet for a given layer
    function stateRefFor(layer: Layer) {
        if (layer === Layer.STATE_LAYER) return {all: "unset"}

        return styles[layer][state]
    }

    // handle state changes triggered by ui events
    const pointerEventCallback = new class extends PointerEventCallback {
        onClick(e?: PointerEvent) {
            onClick?.(e)
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
                        maskImage: `url(${icon})`
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
    return styled(_Button, props)
}