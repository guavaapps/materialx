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
import {ColorStateList} from "../../colorStateList";
import {Attr, AttrMap, Attrs, Style, Styles} from "../../style";

export enum ButtonStyle {
    FILLED = "filled",
    OUTLINED = "outlined",
    TONAL = "filledTonal",
    ELEVATED = "elevated",
    TEXT = "text",
}

export abstract class ButtonAttrs extends Attrs {
    abstract width?: number | string
    abstract height?: number | string
    abstract cornerSize?: number | number[]
    abstract elevation?: number
    abstract color?: ColorStateList
}

enum Layer {
    COMPONENT = "component",
    SHADOW_LAYER = "shadowLayer",
    CONTAINER = "container",
    LABEL = "label",
    STATE_LAYER = "stateLayer",
}

export interface ButtonProps<T extends Attrs> extends Props {
    label?: string;
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

export type ColorFunction = {
    color: Attr | number | string
    alpha: number
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

// button attrs
const ATTRS: ButtonAttrs = {
    width: "fit-content",
    height: 40,
    cornerSize: 20,
    elevation: 0,
    cornerStyle: "round"
    // outlineStyle: "solid",
    // outlineWidth: "1px"
}

const FILLED_ATTRS: ButtonAttrs = {
    ...ATTRS,
    color: StyleAdapter.wrapColorStateList(buttonState.filled.colorStateList)
}

const TONAL_ATTRS: ButtonAttrs = {
    ...ATTRS,
    color: StyleAdapter.wrapColorStateList(buttonState.filledTonal.colorStateList),
}

const TEXT_ATTRS: ButtonAttrs = {
    ...ATTRS,
    color: StyleAdapter.wrapColorStateList(buttonState.text.colorStateList)
}

const OUTLINED_ATTRS: ButtonAttrs = {
    ...ATTRS,
    color: StyleAdapter.wrapColorStateList(buttonState.outlined.colorStateList)
}


export function _Button(props: ButtonProps<ButtonAttrs> = {
    label: "",
    isEnabled: true,
}): Component {
    let {
        label, style = Styles.Button.Filled,
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

        // create statesheets from styled attrs
        const wrapper = StyleAdapter.wrap(ref, styledAttrs)

        console.log("wrapper", wrapper)

        // create css wrappers for statesheets
        const s = Object.values(Layer).map((layer) => {
            // @ts-ignore
            const containerLayer = StyleAdapter.create(wrapper[layer])

            const layerObj = {}

            // @ts-ignore
            layerObj[layer as keyof typeof layerObj] = containerLayer
            return layerObj
        })

        return Object.assign({}, ...s)
    }, [style, theme, refState])

    const [state, setState] = stateController

    const ripple = useRipple(ref)

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
        console.log("ref assigned", ref)

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

                    {/*<span className="material-symbols-outlined" style={stateRefFor(Layer.LABEL)}>add</span>*/}
                    <img src={"https://i.pinimg.com/originals/e9/2b/df/e92bdfc88c52c9600a9f545fbc443d4d.jpg"} style={
                        {
                            height: "20px"
                        }
                    }/>

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
    return styled(_Button, props, TONAL_ATTRS)
}