export default 0

// import {Attr, AttrMap, Attrs, Style} from "../styles/Style";
// import {RefObject, useLayoutEffect, useMemo, useRef, useState} from "react";
// import {StyleAdapter, useTheme} from "../theme";
// import {createCssShadow} from "../elevation";
// import {State} from "../state";
// import useRipple from "./ripple/ripple";
// import {Color} from "../styles/unused/types";
// import {Typescale} from "../typescale/typescale";
// import {ReactUiEventAdapter} from "../ui/event/react_ui_event_adapter";
// import {PointerEventCallback} from "../ui/event/pointerEventCallback";
// import {PointerEvent} from "../ui/event/pointer_event";
// import {Clickable} from "./Props";
// import {Button} from "./button/button";
// import {Styles} from "./button/styles";
//
// const _TextInputField = (ref: RefObject<HTMLElement>, _style: Style) => {
//     const style = _style as AttrMap
//
//     const radius = {
//         "borderRadius": (() => {
//             if (!style.cornerSize) return "0px"
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
//         all: "unset",
//         display: "inline-block",
//         width: StyleAdapter.resolveSize(style.width),
//         height: StyleAdapter.resolveSize(style.height),
//         minWidth: StyleAdapter.resolveSize(style.minWidth),
//         minHeight: StyleAdapter.resolveSize(style.minHeight),
//
//         maxWidth: StyleAdapter.resolveSize(style.maxWidth),
//         maxHeight: StyleAdapter.resolveSize(style.maxHeight),
//
//         transitionDuration: "200ms",
//         userSelect: "none",
//         clipPath: "border-box",
//         ...applyCorners()
//     }
//
//     // base
//     const base = {
//         component: {
//             ...shape,
//             position: "relative"
//         },
//         shadowLayer: {
//             ...shape,
//         },
//         container: {
//             ...shape,
//         },
//         stateLayer: {
//             ...shape,
//             width: "100%",
//         },
//         label: {
//             ...shape,
//             userSelect: "none",
//             display: "flex",
//             justifyContent: "center",
//             alignItems: "center",
//             cursor: "default",
//         }
//     }
//
//     return {
//         component: {
//             ...base.component,
//             overflow: "hidden",
//             clipPath: "unset",
//
//             backgroundColor: "red"
//         },
//         shadowLayer: {
//             display: "block",
//             position: "relative",
//             width: "100%",
//             height: "100%",
//             overflow: "hidden",
//
//             // ...createCssShadow(style.elevation)
//         },
//
//         container: {
//             position: "relative",
//             overflow: "hidden",
//
//             display: "flex",
//             flexDirection: "row",
//             width: "100%",
//             height: "100%",
//
//             alignItems: "center",
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
//         supportText: {},
//
//         activeIndicator: {
//             position: "absolute",
//             top: style.height - 1,
//             width: "100%",
//             height: 1,
//             left: 0,
//             backgroundColor: style.activeIndicatorColor,
//             pointerEvents: "none",
//             boxSizing: "border-box"
//         },
//
//         leadingIconContainer: {
//             display: "block",
//             color: style.textColor,
//             borderRadius: "unset",
//             width: style.leadingIconSize,
//             height: style.leadingIconSize,
//             maskSize: style.leadingIconSize,
//             maskRepeat: "no-repeat",
//             maskPosition: "center",
//             marginLeft: style.paddingLeft,
//             marginRight: "0px",
//
//             position: "relative",
//             clipPath: "inset(0, 100%, 100%, 100%)",
//             mask: "unset",
//             backgroundColor: "transparent",
//             flexGrow: 0,
//         },
//
//         leadingIcon: {
//             // ...base.label,
//             display: "block",
//             color: style.textColor,
//             borderRadius: "unset",
//             clipPath: "unset",
//             width: style.leadingIconSize,
//             height: style.leadingIconSize,
//             maskSize: style.leadingIconSize,
//             maskRepeat: "no-repeat",
//             maskPosition: "center",
//             marginRight: "0px",
//             backgroundColor: style.leadingIconColor,
//             flexGrow: 0,
//         },
//
//         trailingIconContainer: {
//             display: "block",
//             color: style.textColor,
//             borderRadius: "unset",
//             width: style.trailingIconSize,
//             height: style.trailingIconSize,
//             maskSize: style.trailingIconSize,
//             maskRepeat: "no-repeat",
//             maskPosition: "center",
//             marginLeft: "0px",
//             marginRight: style.paddingRight,
//
//             position: "relative",
//             clipPath: "inset(0, 100%, 100%, 100%)",
//             mask: "unset",
//             backgroundColor: "transparent",
//         },
//
//         trailingIcon: {
//             display: "block",
//             color: style.textColor,
//             borderRadius: "unset",
//             clipPath: "unset",
//             width: style.trailingIconSize,
//             height: style.trailingIconSize,
//             maskSize: style.trailingIconSize,
//             maskRepeat: "no-repeat",
//             maskPosition: "center",
//             marginLeft: "0px",
//             backgroundColor: style.trailingIconColor,
//         },
//
//         label: {
//             // all: "unset",
//             transition: "all 200ms",
//             display: "flex",
//             alignItems: "center",
//         },
//
//         inputField: {
//             ...Typescale.Body.Large,
//             padding: 0,
//             position: "absolute",
//             border: "none",
//             margin: "none",
//             overflow: "hidden",
//             transition: "all 200ms",
//             alignItems: "center",
//             maxWidth: "100",
//             minWidth: "0",
//             width: "100%",
//             top: 8 + 16,
//             bottom: 8,
//             left: 0, // ky
//             height: 24,//"auto",
//             backgroundColor: "transparent",
//             outline: "none",
//             boxSizing: "border-box",
//         }
//     }
// }
//
// /*
//
// rec default: 245
// max: 488,
// min no label: 56,
// min label: 88,
//
//
//  */
//
// enum Layer {
//     COMPONENT = "component",
//     CONTAINER = "container",
//     LABEL = "label",
//     STATE_LAYER = "stateLayer",
//     LEADING_ICON_CONTAINER = "leadingIconContainer",
//     LEADING_ICON = "leadingIcon",
//     TRAILING_ICON_CONTAINER = "trailingIconContainer",
//
//     TRAILING_ICON = "trailingIcon",
//     ACTIVE_INDICATOR = "activeIndicator",
//     INPUT_FIELD = "inputField",
// }
//
// type TextInputFieldProps = Clickable & {
//     label?: Attr | string,
//     leadingIcon?: Attr | string,
//     trailingIcon?: Attr | string
//     supportText?: Attr | string
//     isEnabled?: Attr | boolean
//     style?: TextInputFieldAttrs
// }
//
// export abstract class TextInputFieldAttrs extends Attrs {
//     iconPaddingLeft?: Attr | string | number
//     iconPaddingRight?: Attr | string | number
//     leadingIconSize?: Attr | string | number
//     trailingIconSize?: Attr | string | number
//     leadingIconColor?: Color
//     trailingIconColor?: Color
//     activeIndicatorColor?: Color
//     caretColor?: Color
// }
//
// export function TextInputFiled(props: TextInputFieldProps) {
//     let {
//         isEnabled, style,
//         label, supportText,
//         leadingIcon, trailingIcon,
//         onClick, onHover, onHoverEnd, onPressed, onReleased
//     } = props
//
//     isEnabled = isEnabled || isEnabled === undefined
//
//     const theme = useTheme()!
//
//     const stateController = useState(isEnabled ? State.STATE_ENABLED : State.STATE_DISABLED)
//
//     const ref = useRef<HTMLDivElement>(null)
//     const [refState, setRef] = useState(ref.current)
//     const inputRef = useRef<HTMLInputElement>(null)
//
//     const [text, setText] = useState<string | null>(null)
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
//                 if (styledStatesheet[it]) obj[it] = _TextInputField(ref, styledStatesheet[it])[layer as keyof object]
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
//     function LabelText() {
//         if (state === State.STATE_FOCUSED || isFocused || text) {
//             return {
//                 ...Typescale.Body.Small,
//                 height: "16px",
//                 marginTop: 8
//             }
//         }
//
//         return {
//             ...Typescale.Body.Large,
//             flexGrow: 1,
//             height: "100%",
//         }
//     }
//
//     function InputText() {
//         if (state === State.STATE_FOCUSED || isFocused || text) {
//             return {
//                 opacity: 1,
//             }
//         }
//
//         return {
//             opacity: 0,
//         }
//     }
//
//     const [isFocused, setFocused] = useState(false)
//
//     function stateRefFor(layer: Layer) {
//         if (isFocused && state !== State.STATE_FOCUSED) {
//             console.log("isFocused")
//             let filtered = Object.keys(styles[layer].focused).filter((it) => {
//                 const val = styles[layer].focused[it]
//
//                 return val
//             }).map((it) => {
//                 const obj: AttrMap = {}
//                 obj[it] = styles[layer].focused [it]
//
//                 return obj
//             })
//
//             filtered = Object.assign({}, ...filtered)
//
//             if (layer === Layer.TRAILING_ICON_CONTAINER) console.log("s", styles[layer][state])
//
//             // TODO add composite states to statesheets
//             const r = {
//                 ...styles[layer][state],
//                 ...filtered
//             }
//
//             console.log(`styles[${layer}][${state}]`, r)
//
//             return r
//         }
//
//         return styles[layer][state]
//     }
//
//     const pointerEventCallback = {
//         onClick(e?: PointerEvent) {
//             onClick?.(e)
//
//             if (isEnabled) {
//                 //setState(State.STATE_FOCUSED)
//                 setFocused(true)
//                 inputRef.current?.focus()
//             }
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
//         const bounds = ref.current?.getBoundingClientRect()
//         const width = bounds?.width
//         const height = bounds?.height
//
//         setFW(width?.toString()!)
//
//         // trigger redraw after layout
//         setRef(ref.current)
//     }, [])
//
//     const [fieldWidth, setFW] = useState("100%")
//
//     return (
//         <div
//             tabIndex={0}
//             style={stateRefFor(Layer.COMPONENT)}
//
//             onFocus={() => {
//                 if (isEnabled) {
//                     setState(State.STATE_FOCUSED)
//                     inputRef.current?.focus()
//                 }
//                 setFocused(true)
//             }}
//             onBlur={() => {
//                 if (isEnabled) {
//                     setState(State.STATE_ENABLED)
//                     inputRef.current?.blur()
//                 }
//                 setFocused(false)
//             }}
//
//             // @ts-ignore
//             ref={ref}
//
//             // @ts-ignore
//             {...ReactUiEventAdapter.wrap(ref, pointerEventCallback)}>
//             <span style={stateRefFor(Layer.CONTAINER)}>
//                     <span style={stateRefFor(Layer.STATE_LAYER)}></span>
//                     <span style={{
//                         ...stateRefFor(Layer.TRAILING_ICON_CONTAINER),
//                         ...((() => {
//                             if (!leadingIcon || leadingIcon === "") return {
//                                 width: 0,
//                                 height: 0,
//                                 marginLeft: 16
//                             }
//                             else return {
//                                 marginLeft: 4
//                             }
//                         })())
//                     }}>
//                         <span style={{
//                             ...stateRefFor(Layer.LEADING_ICON),
//                             maskImage: `url(${leadingIcon})`
//                         }}></span>
//                     </span>
//                     <span id={"field"} style={{
//                         position: "relative",
//                         display: "flex",
//                         flexDirection: "column",
//                         flexBasis: 0,
//                         flexShrink: 0,
//                         flexGrow: 1,
//                         height: "100%",
//                     }}>
//                         <span style={{
//                             ...stateRefFor(Layer.LABEL),
//                             ...LabelText(),
//                         }}>label</span>
//
//                         <input ref={inputRef} type="text" onChange={it => setText(it.target.value)} style={{
//                             ...stateRefFor(Layer.INPUT_FIELD),
//                             ...InputText(),
//                         }}></input>
//                     </span>
//                     <span style={{
//                         ...stateRefFor(Layer.TRAILING_ICON_CONTAINER),
//                         ...((() => {
//                             if (!trailingIcon || trailingIcon == "") return {
//                                 width: 0,
//                                 height: 0,
//                                 marginRight: 16
//                             }
//                             else return {
//                                 marginRight: 4
//                             }
//                         })())
//                     }}>
//                         <span style={{
//                             ...stateRefFor(Layer.TRAILING_ICON),
//                             maskImage: `url(${trailingIcon})`
//                         }}></span>
//                     </span>
//                 {/*{isEnabled ? ripple : null}*/}
//                 </span>
//             <span style={stateRefFor(Layer.ACTIVE_INDICATOR)}></span>
//         </div>
//     )
// }