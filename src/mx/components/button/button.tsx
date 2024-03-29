export default 0

// import React, {useLayoutEffect, useMemo, useRef, useState} from "react";
// import {PointerEvent} from "../../ui/event/pointer_event";
// import {State} from "../../state";
// import {PointerEventCallback} from "../../ui/event/pointerEventCallback";
// import {ReactUiEventAdapter} from "../../ui/event/react_ui_event_adapter";
// import useRipple from "../ripple/ripple";
// import {Component, Props, StyleAdapter, styled, useTheme} from "../../theme";
// import {Attr, AttrMap, Attrs, Style} from "../../styles/Style";
// import {Styles} from "./styles";
// import {Typescale} from "../../typescale/typescale";
// import {createCssShadow} from "../../elevation";
//
// const _ButtonLayout = (ref: React.RefObject<HTMLElement>, _style: Style) => {
//     const style = _style as AttrMap
//
//     const radius = {
//         "borderRadius": (() => {
//             return Array.isArray(style.cornerSize) ? style.cornerSize.map((v) => `${v}px`).join(" ") : `${style.cornerSize}px`
//         })()
//     }
//
//     const applyCorners = () => {
//         if (style.cornerStyle === "round" || style.cornerStyle === undefined) {
//             return radius
//         } else if (style.cornerStyle === "cut") {
//             return {clipPath: StyleAdapter.createCutCorners(ref, style.cornerSize)}
//         }
//     }
//
//     const shape = {
//         "all": "unset",
//         "width": StyleAdapter.resolveSize(style.width),
//         "height": StyleAdapter.resolveSize(style.height),
//         "transitionDuration": "200ms",
//         "userSelect": "none",
//         clipPath: "border-box",
//         ...applyCorners()
//     }
//
//     // base
//     const base = {
//         component: {
//             ...shape,
//             "position": "relative"
//         },
//         shadowLayer: {
//             ...shape,
//         },
//         container: {
//             ...shape,
//             width: "fit-content",
//
//             display: "flex",
//             justifyContent: "center",
//             alignItems: "center",
//         },
//         stateLayer: {
//             ...shape,
//             width: "100%",
//         },
//         label: {
//             ...shape,
//             ...Typescale.Label.Large,
//             userSelect: "none",
//             display: "flex",
//             justifyContent: "center",
//             alignItems: "center",
//             cursor: "default",
//             marginLeft: style.iconPaddingRight,
//             marginRight: style.paddingRight,
//             width: "max-content",
//         }
//     }
//
//     const button = {
//         component: {
//             ...base.component,
//             overflow: "visible",
//             boxShadow: "10 10 10 10 red",
//         },
//         shadowLayer: {
//             ...base.shadowLayer,
//             overflow: "visible",
//
//             ...createCssShadow(style.elevation)
//         },
//
//         container: {
//             ...base.container,
//             position: "relative",
//             overflow: "hidden",
//
//             backgroundColor: style.backgroundColor,
//             color: style.textColor,
//             borderStyle: style.outlineStyle,
//             borderWidth: style.outlineWidth,
//             borderColor: style.outlineColor,
//         },
//         stateLayer: {
//             ...base.stateLayer,
//             position: "absolute",
//             transitionDuration: "200ms",
//             backgroundColor: style.overlayColor,
//         },
//         label: {
//             ...base.label,
//             color: style.textColor,
//             borderRadius: "unset",
//             clipPath: "unset",
//             transform: `scale(${style.scale})`
//         },
//         icon: {
//             ...base.label,
//             color: style.textColor,
//             borderRadius: "unset",
//             clipPath: "unset",
//             width: style.iconSize,
//             height: style.iconSize,
//             maskSize: style.iconSize,
//             maskRepeat: "no-repeat",
//             maskPosition: "center",
//             marginLeft: style.paddingLeft,
//             marginRight: "0px",
//             backgroundColor: style.textColor,
//         }
//     }
//
//     return button
// }
//
// export abstract class ButtonAttrs extends Attrs {
//     iconPaddingRight?: Attr | string | number
//     iconSize?: Attr | string | number
// }
//
// enum Layer {
//     COMPONENT = "component",
//     SHADOW_LAYER = "shadowLayer",
//     CONTAINER = "container",
//     LABEL = "label",
//     STATE_LAYER = "stateLayer",
//     ICON = "icon"
// }
//
// export interface ButtonProps<T extends Attrs> extends Props {
//     label?: string;
//     icon?: string;
//     style?: T;
//     isEnabled?: boolean;
//     onClick?: (e?: PointerEvent) => void;
//     onPressed?: (e?: PointerEvent) => void;
//     onReleased?: (e?: PointerEvent) => void;
//     onHover?: (e?: PointerEvent) => void;
//     onHoverEnd?: (e?: PointerEvent) => void;
// }
//
// export function _Button(props: ButtonProps<ButtonAttrs> = {
//     label: "",
//     icon: "",
//     isEnabled: true,
// }): Component {
//     let {
//         label, icon, style = Styles.Button.Filled,
//         isEnabled,
//         onClick, onPressed, onReleased, onHover, onHoverEnd
//     } = props
//
//     isEnabled = isEnabled || isEnabled === undefined
//
//     const theme = useTheme()!
//
//     const stateController = useState(isEnabled ? State.STATE_ENABLED : State.STATE_DISABLED);
//
//     const ref = useRef<HTMLButtonElement>(null)
//     const [refState, setRef] = useState(ref.current)
//
//     // create statesheets
//     const [styledAttrs, styles] = useMemo(() => {
//         // create styled attrs
//         const styledAttrs = Style.create(style as AttrMap, theme)
//
//         // create style statesheet i.e styles for different states
//         const [styledStatesheet, states] = StyleAdapter.create(styledAttrs)
//
//         // create css stylesheets for each component layer
//         const s = Object.values(Layer).map((layer) => {
//             // @ts-ignore
//             const containerLayer = Object.assign({}, ...Object.values(State).map((it) => {
//                 const obj: AttrMap = {}
//                 obj[it] = _ButtonLayout(ref, styledStatesheet[it])[layer as keyof object]
//                 return obj
//             }))
//
//             const layerObj = {}
//
//             // @ts-ignore
//             layerObj[layer as keyof typeof layerObj] = containerLayer
//             return layerObj
//         })
//
//         return [styledAttrs, Object.assign({}, ...s)]
//
//         // reference refState to trigger redraw on component mount since component size is only available after mount
//         // refState updates with the current element holding the ref after mount
//     }, [style, theme, refState])
//
//     const [state, setState] = stateController
//
//     const rippleColor = (styledAttrs as AttrMap).rippleColor
//
//     const ripple = useRipple(ref, rippleColor as string)
//
//     // get stylesheet for a given layer
//     function stateRefFor(layer: Layer) {
//         if (layer === Layer.STATE_LAYER) return {all: "unset"}
//
//         return styles[layer][state]
//     }
//
//     // handle state changes triggered by ui events
//     const pointerEventCallback = {
//         onClick(e?: PointerEvent) {
//             onClick?.(e)
//         },
//
//         onHover(e?: PointerEvent) {
//             if (isEnabled) setState(State.STATE_HOVERED)
//
//             onHover?.(e)
//         },
//
//         onHoverEnd(e?: PointerEvent) {
//             if (isEnabled) setState(State.STATE_ENABLED)
//
//             onHoverEnd?.(e)
//         },
//
//         onPressed(e?: PointerEvent) {
//             if (isEnabled) setState(State.STATE_PRESSED)
//
//             onPressed?.(e)
//         },
//
//         onReleased(e?: PointerEvent) {
//             if (isEnabled) setState(State.STATE_HOVERED)
//
//             onReleased?.(e)
//         },
//
//         onMoved(e?: PointerEvent) {
//
//         }
//     }
//
//     useLayoutEffect(() => {
//         // trigger redraw after layout
//         setRef(ref.current)
//     }, [])
//
//     return (
//         // TODO move focus listeners to adapter
//         <button
//             style={stateRefFor(Layer.COMPONENT)}
//
//             onFocus={() => {
//                 if (isEnabled) setState(State.STATE_FOCUSED)
//             }}
//             onBlur={() => {
//                 if (isEnabled) setState(State.STATE_ENABLED)
//             }}
//
//             ref={ref}
//
//             // @ts-ignore
//             {...ReactUiEventAdapter.wrap(ref, pointerEventCallback)}>
//             <span
//                 style={stateRefFor(Layer.SHADOW_LAYER)}>
//                 <span style={stateRefFor(Layer.CONTAINER)}>
//                     <span style={stateRefFor(Layer.STATE_LAYER)}></span>
//
//                     <span style={{
//                         ...stateRefFor(Layer.ICON),
//                         maskImage: `url(${icon})`
//                     }}></span>
//
//                     <span style={stateRefFor(Layer.LABEL)}>
//                         {label}
//                     </span>
//                     {isEnabled ? ripple : null}
//                 </span>
//             </span>
//         </button>
//     )
// }
//
// export const Button = (props: ButtonProps<ButtonAttrs>) => {
//     return styled(_Button, props)
// }
