import {PointerEvent, KeyboardEvent, KeyVariant, FocusEvent} from "../ui/event/pointer_event";
import React, {Dispatch, MutableRefObject, SetStateAction, useLayoutEffect, useMemo, useRef, useState} from "react";
import {StyleAdapter, Theme, THEME_LIGHT} from "../theme";
import {AttrMap, Rect2, ShapeDrawable, Style} from "../styles/style";
import {Styles} from "./button/styles";
import {FocusEventCallback, KeyboardEventCallback, PointerEventCallback} from "../ui/event/pointerEventCallback";
import {Statesheet} from "../styles/statesheet";
import {LinearInterpolator, morb, transition, Transition, TransitionHandler2} from "./orb";

export type Clickable = {
    onClick?: (e?: PointerEvent) => boolean;
    onPressed?: (e?: PointerEvent) => boolean;
    onReleased?: (e?: PointerEvent) => boolean;
    onHover?: (e?: PointerEvent) => boolean;
    onHoverEnd?: (e?: PointerEvent) => boolean;
    onMoved?: (e?: PointerEvent) => boolean;
}

export type Pressable = {
    onKeyPressed?: (e?: KeyboardEvent) => boolean;
    onKeyReleased?: (e?: KeyboardEvent) => boolean;
}

export type Focusable = {
    onFocused?: (e?: FocusEvent) => boolean;
    onUnfocused?: (e?: Focusable) => boolean;
}

export function useOnLayoutHandler(callback: (bounds: Rect2) => any) {
    const ref = useRef<HTMLElement>(null)
    const [r, updateRef] = useState(ref.current)

    useLayoutEffect(() => {
        const bounds: Rect2 = {
            width: ref.current?.clientWidth || 100,
            height: ref.current?.offsetHeight || 50,
            cornerRadius: 0
        }

        updateRef(ref.current)
        callback(bounds)
    }, [r])

    return ref
}

export type Layout = (bounds: Rect2, styledStatesheet: AttrMap) => object

export function useJoe(layout: Layout, style: object, theme: Theme) {
    const [bounds, setBounds] = useState<Rect2 | null>({width: 0, height: 0, cornerRadius: 0})

    const ref = useOnLayoutHandler((bounds) => {
        setBounds(bounds)
    })

    const s = useMemo(() => {
        const styledAttrs = Style.create(style as AttrMap, theme)

        // create style statesheet i.e styles for different states
        const [styledStatesheet, states] = StyleAdapter.create(styledAttrs)

        const builtLayout = layout(bounds!, styledStatesheet)

        const layers = Object.keys(builtLayout)

        // create css stylesheets for each component layer
        const s = Object.values(layers).map((layer) => {
            // @ts-ignore
            const containerLayer = Object.assign({}, ...Object.values(states).map((it) => {
                const obj: AttrMap = {}
                obj[it] = layout(bounds!, styledStatesheet[it])[layer as keyof object]
                return obj
            }))

            const layerObj = {}

            // @ts-ignore
            layerObj[layer as keyof typeof layerObj] = containerLayer
            return layerObj
        })

        return [styledAttrs, styledStatesheet, Object.assign({}, ...s), ref]
    }, [bounds, style, theme])

    return s
}

const TextViewLayout: Layout = (bounds, styledStatesheet) => {
    return {
        container: {
            width: StyleAdapter.resolveSize(styledStatesheet.width),
            height: StyleAdapter.resolveSize(styledStatesheet.height),

            paddingLeft: styledStatesheet.paddingLeft,
            paddingTop: styledStatesheet.paddingTop,
            paddingRight: styledStatesheet.paddingRight,
            paddingBottom: styledStatesheet.paddingBottom,

            marginLeft: styledStatesheet.marginLeft,
            marginTop: styledStatesheet.marginTop,
            marginRight: styledStatesheet.marginRight,
            marginBottom: styledStatesheet.marginBottom,

            backgroundColor: styledStatesheet.backgroundColor,
            color: styledStatesheet.textColor,
        }
    }
}

type TextViewProps = {
    isEnabled?: boolean

    children?: React.ReactNode,

    selectable?: boolean,
    onSelected?: (selection: string) => void

    animationHandler?: AnimationHandler
} & Clickable & Pressable & Focusable

export type CHParams = {}

export class StateHandler {
    static is(state: string, s: string) {
        const _s = s.split("$")
        _s.push(state)

        return this.hasAllComposites(state, _s)
    }

    static hasAllComposites(state: string, composites: string[]) {
        let hasAll = true

        return state.split("$").forEach((it, i) => {
            if (!composites.includes(it, 0)) hasAll = false
        })

        return hasAll
    }

    static hasComposites(state: string, composites: string | string[]) {
        let has = false

        const c = Array.isArray(composites) ? composites : [composites]

        c.forEach((it, i) => {
            if (state.split("$").includes(it, 0)) {
                has = true
            }
        })


        return has
    }

    static setComposite(state: string, composite: string) {
        const baseState = this.clearComposites(state)

        return this.addComposites(baseState, composite)
    }

    static addComposites(state: string, composite: string | string[]) {
        if (Array.isArray(composite)) {
            composite = composite.join("$")
        }

        return `${state}$${composite}`
    }

    static removeComposites(state: string, composites: string | string[]) {
        const c = Array.isArray(composites) ? composites : [composites]

        return state.split("$").filter((it, i) => {
            return !c.includes(it, 0)
        }).join("$")
    }

    static clearComposites(state: string) {
        return state.split("$")[0]
    }

    static applyOn(state: string, composite: string, states: string | string[]) {
        const s = Array.isArray(states) ? states : [states]

        if (this.hasComposites(state, s)) {
            return this.addComposites(state, composite)
        }

        return state
    }
}

export class ClickableHandler {
    protected static createPointerEvent(ref: MutableRefObject<any>, e: React.MouseEvent) {
        const boundingBox = ref.current.getBoundingClientRect()

        return {
            viewX: e.clientX - boundingBox.x,
            viewY: e.clientY - boundingBox.y,

            x: e.clientX,
            y: e.clientY,

            rawX: e.pageX,
            rawY: e.pageY,

            shiftPressed: e.shiftKey,
            altPressed: e.altKey,
            controlPressed: e.ctrlKey,
            metaPressed: e.metaKey,
        }
    }

    static insert(base: PointerEventCallback, callback: PointerEventCallback): PointerEventCallback {
        return {
            onClick(e?: PointerEvent) {
                base.onClick?.(e)
                return callback.onClick?.(e) || false
            },

            onHover(e?: PointerEvent) {
                base.onHover?.(e)
                return callback.onHover?.(e) || false
            },

            onHoverEnd(e?: PointerEvent) {
                base.onHoverEnd?.(e)
                return callback.onHoverEnd?.(e) || false
            },

            onPressed(e?: PointerEvent) {
                base.onPressed?.(e)
                return callback.onPressed?.(e) || false
            },

            onReleased(e?: PointerEvent) {
                base.onReleased?.(e)
                return callback.onReleased?.(e) || false
            },

            onMoved(e?: PointerEvent) {
                base.onMoved?.(e)
                return callback.onMoved?.(e) || false
            }
        }
    }

    static create(ref: MutableRefObject<any>, state: string, setState: React.Dispatch<React.SetStateAction<string>>, callback: PointerEventCallback) {

        return {
            onClick: (e: React.MouseEvent) => {
                if (callback.onClick) {
                    callback.onClick(PointerEvent.create(ref, e))
                }
            },
            onPointerEnter: (e: React.MouseEvent) => {
                if (callback.onHover) callback.onHover(PointerEvent.create(ref, e))
            },
            onPointerLeave: (e: React.MouseEvent) => {
                if (callback.onHoverEnd) callback.onHoverEnd(PointerEvent.create(ref, e))
            },

            onPointerDown: (e: React.MouseEvent) => {
                if (callback.onPressed) callback.onPressed(PointerEvent.create(ref, e))
            },

            onPointerUp: (e: React.MouseEvent) => {
                if (callback.onReleased) callback.onReleased(PointerEvent.create(ref, e))
            },

            onPointerMove: (e: React.MouseEvent) => {
                if (callback.onMoved) callback.onMoved(PointerEvent.create(ref, e))
            },
        }
    }
}

export class PressableHandler {
    static insert(base: KeyboardEventCallback, callback: KeyboardEventCallback): KeyboardEventCallback {
        return {
            onKeyPressed(e?: KeyboardEvent) {
                base.onKeyPressed?.(e)
                return callback.onKeyPressed?.(e) || false
            },

            onKeyReleased(e?: KeyboardEvent) {
                base.onKeyReleased?.(e)
                return callback.onKeyReleased?.(e) || false
            }
        }
    }

    static create(callback: KeyboardEventCallback) {
        return {
            onKeyDown(e: React.KeyboardEvent) {
                if (callback.onKeyPressed) {
                    callback.onKeyPressed(KeyboardEvent.create(e))
                }
            },

            onKeyUp(e: React.KeyboardEvent) {
                if (callback.onKeyReleased) {
                    callback.onKeyReleased(KeyboardEvent.create(e))
                }
            }
        }
    }
}

export class FocusableHandler {
    static insert(base: FocusEventCallback, callback: FocusEventCallback): FocusEventCallback {
        return {
            onFocused(e?: FocusEvent) {
                base.onFocused?.(e)
                return callback.onFocused?.(e) || false
            },

            onUnfocused(e?: FocusEvent) {
                base.onUnfocused?.(e)
                return callback.onUnfocused?.(e) || false
            }
        }
    }

    static create(callback: FocusEventCallback) {
        return {
            onFocus(e: React.FocusEvent) {
                let c = e.currentTarget === e.target
                let r = !e.currentTarget.contains(e.relatedTarget)

                console.log("onFocus", e.currentTarget, e.target, e.relatedTarget)

                if (!e.currentTarget.contains(e.relatedTarget)) {
                    callback.onFocused?.(FocusEvent.create(e))
                }
            },

            onBlur(e: React.FocusEvent) {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                    callback.onUnfocused?.(FocusEvent.create(e))
                }
            }
        }
    }
}

function SelectableText(isSelectable: boolean) {
    const val = isSelectable ? "text" : "none"

    return {
        userSelect: val,
        WebkitUserSelect: val,
        MozUserSelect: val,
        msUserSelect: val
    }
}

function handleTextSelection() {
    const selectedText = window.getSelection()?.toString()

    const selectionBounds = window.getSelection()?.getRangeAt(0).getBoundingClientRect()

    return [selectedText, selectionBounds]
}

export type StatesheetProfile = { [state: string]: string }

export class StatesheetHandler {
    protected profile: StatesheetProfile

    constructor(profile: StatesheetProfile) {
        this.profile = profile
    }

    /**
     * Apply a new composite state and transfer any applicable substates
     * @param state current state
     * @param composite composite state to apply
     * @param keepAllOnly true if composites states should be transferred only if all can be
     */
    applyOn(state: string, composite: string, keepAllOnly: boolean = false) {
        const stateArray: string[] = state.split("$")

        // get order of the composite state to replace
        let order = 0

        stateArray.forEach((it) => {
            if (this.profile[it].includes(composite)) {
                order = this.profile[it].indexOf(composite)
            }
        })

        if (order > stateArray.length - 1) {
            return `${state}$${composite}`
        }

        // replace state and transfer composites
        const newStateArray: string[] = stateArray.slice(0, order)

        const compArray = stateArray.slice(order + 1, stateArray.length - order)

        const newComposites = StatesheetHandler.transferComposites(this.profile, composite, compArray)

        if (keepAllOnly) {
            if (compArray.every((it) => newComposites.includes(it))) {
                newStateArray.push(...newComposites)
            }
        } else newStateArray.push(...newComposites)

        return newStateArray.join("$")
    }

    removeFrom(state: string, composite: string, removeSubstates: boolean = false, keepAllOnly: boolean = false) {
        const stateArray: string[] = state.split("$")

        if (!stateArray.includes(composite)) return state

        // get order of the composite state to replace
        let order = 0

        stateArray.forEach((it) => {
            if (this.profile[it].includes(composite)) {
                order = this.profile[it].indexOf(composite)
            }
        })

        if (order === 0) throw new Error("cannot remove a base state")

        // replace state and transfer composites
        const newStateArray: string[] = stateArray.slice(0, order)

        const compArray = stateArray.slice(order + 1, stateArray.length - order)

        const newComposite = stateArray[order - 1]

        const newComposites = StatesheetHandler.transferComposites(this.profile, newComposite, compArray)

        if (!removeSubstates) {
            if (keepAllOnly) {
                if (compArray.every((it) => newComposites.includes(it))) {
                    newStateArray.push(...newComposites)
                }
            } else newStateArray.push(...newComposites)
        }

        return newStateArray.join("$")
    }

    protected static transferComposites(profile: StatesheetProfile, base: string, composites: string[]) {
        const all = [base, ...composites]

        const joined = [base]

        for (let i = 0; i < all.length; i++) {
            let it = all[i]

            if (profile[it].includes(all[i + 1])) {
                joined.push(all[i + 1])
            } else break
        }

        return joined
    }

    static fromStatesheet(statesheet: Statesheet) {
        const states = Object.keys(statesheet)

        const baseStates = states.filter((it, i) => {
            return !it.includes("$")
        })

        const compositeStates = states.filter((it, i) => {
            return it.includes("$")
        })

        const profile: AttrMap = {}

        baseStates.forEach((it) => {
            compositeStates.forEach((comp) => {
                if (comp.includes(it)) {
                    comp.split("$").forEach((elem, i, array) => {
                        if (i < array.length) {
                            if (Object.keys(profile).includes(elem)) {
                                if (array[i + 1]) profile[elem].push(array[i + 1])
                            } else profile[elem] = array[i + 1] ? [array[i + 1]] : []
                        }
                    })
                }
            })

            if (!Object.keys(profile).includes(it)) profile[it] = []
        })

        return new StatesheetHandler(profile)
    }
}

export class ComponentStateHandler {
    handler: StatesheetHandler
    state: string
    setState: Dispatch<SetStateAction<string>>

    constructor(statesheetHandler: StatesheetHandler, state: string, setState: Dispatch<SetStateAction<string>>) {
        this.handler = statesheetHandler
        this.state = state
        this.setState = setState
    }

    set(state: string, onApply?: (oldState: string, newState: string) => void) {
        const oldState = this.state
        const newState = this.handler.applyOn(oldState, state)

        this.setState(newState)

        onApply?.(oldState, newState)
    }
}

function useComponentStateHandler(statesheet: Statesheet, state: string, setState: Dispatch<SetStateAction<string>>) {
    return useMemo(() => {
        // create statesheet handler
        const statesheetHandler = StatesheetHandler.fromStatesheet(statesheet)
        const handler = new ComponentStateHandler(statesheetHandler, state, setState)

        return handler
    }, [setState, state, statesheet])
}

export type Animatable = "width" | "height" | "backgroundColor" | "textColor" | "shape" | "cornerSize"

export type Animation = {
    attr: Animatable,
    values: any[],
    duration: number,

    name?: string
}

export type RunningAnimation = {
    progress: number,
    isRunning: boolean
} & Animation

export type AnimationCallback = {
    onAnimationStart?(e: RunningAnimation): void
    onAnimationUpdate?(e: RunningAnimation): void
    onAnimationEnd?(e: RunningAnimation): void
}

export function useAnimationHandler() {
    const [animations, setAnimations] = useState<Animation[]>([])

    const [animationHandler, setAnimationHandler] = useState(new AnimationHandler())

    return animationHandler
}

export class AnimationHandler {
    private ref?: React.RefObject<HTMLElement>

    private callback: AttrMap = {}

    private runningAnimations: RunningAnimation[] = []

    // for hook
    private animations: Animation[] = []

    private animationCallbacks: { [name: string]: AnimationCallback } = {}

    // private setAnimations: Dispatch<SetStateAction<Animation[]>>

    constructor() {
        // this.animations = animations
        // this.setAnimations = setAnimations
    }

    get animationCallback() {
        return this.callback
    }

    private animatableAttrMap: AnimatableAttrMap = {}

    use(ref: React.RefObject<HTMLElement>, animatableAttrMap: AnimatableAttrMap) {
        console.log("use", ref)

        this.ref = ref
        this.animatableAttrMap = animatableAttrMap
    }

    getAnimations(name: string) {
        return this.ref?.current?.getAnimations().filter((it) => {
            return it.id === name
        })
    }

    static createAnimationCallback(callback: AnimationCallback) {
        return {
            onAnimationStart: (e: React.AnimationEvent) => {
                // callback.onAnimationStart?.(e)
            },
            onAnimationUpdate: (e: React.AnimationEvent) => {
                // callback.onAnimationUpdate?.(e)
            },
            onAnimationEnd: (e: React.AnimationEvent) => {
                // callback.onAnimationEnd?.(e)
            }
        }
    }

    start(animation: Animation, callback?: AnimationCallback) {
        const {attr, values, duration} = animation

        const keyframes = values.map((it) => {
            const keyframe: AttrMap = {}

            const cssAttr = this.animatableAttrMap[attr]
            Array.isArray(cssAttr) ? cssAttr.forEach((a) => {
                keyframe[a] = it
            }) : keyframe[cssAttr] = it

            return keyframe
        })

        if (callback) this.animationCallbacks[animation.name!] = callback

        const animationProxy = this.ref?.current?.animate(keyframes, {
            duration: duration,
            id: animation.name
        })

        animationProxy?.addEventListener("finish", (e) => {
            console.log("finished")
        })

        this.ref?.current?.addEventListener("animationstart", (e) => {
            console.log("e", e)
        })
    }

    createAnimationCallback(callback: AnimationCallback) {
        return {
            onAnimationStart: (e: React.AnimationEvent) => {
                // this.runningAnimations.push(runningAnimation)
                //
                // callback?.onAnimationStart?.(runningAnimation)
            },

            onAnimationIteration: (e: React.AnimationEvent) => {

            },

            onAnimationEnd: (e: React.AnimationEvent) => {

            }
        }
    }

    resume(animation: Animation) {
        const a = this.ref?.current?.getAnimations()

        const f = a?.filter((it) => {
            return it.id === animation.name
        })

        const i = this.runningAnimations.findIndex((it) => {
            return it.name === animation.name
        })

        this.runningAnimations[i].isRunning = true

        f?.forEach((it) => {
            it.play()
        })
    }

    pause(animation: Animation) {
        const a = this.ref?.current?.getAnimations()

        const f = a?.filter((it) => {
            return it.id === animation.name
        })

        // const i = this.runningAnimations.findIndex((it) => {
        //     return it.name === animation.name
        // })
        //
        // console.log("pausing", i, animation.name)
        //
        // this.runningAnimations[i].isRunning = false

        f?.forEach((it) => {
            it.pause()
        })
    }

    stop(animation: Animation) {
        this.ref?.current?.getAnimations().filter((it: any) => {
            return it.id === animation.name
        })[0].finish()
    }

    findAnimationByName(name: string) {
        return this.animations.find((it) => it.name === name)
    }
}

export type AnimatableAttrMap = { [attr: string]: string | string[] }

export const TVAnimatableAttrMap: AnimatableAttrMap = {
    width: "width",
    height: "height",
    backgroundColor: "backgroundColor",
    textColor: "color",
    shape: "shape",
    cornerSize: "corner"
}

export const ContainerLayout = () => {
    return {
        width: "fit-content",
        height: "fit-content",
    }
}

export function TextView(props: TextViewProps) {
    const {
        isEnabled = true,
        children,

        selectable = false,
        onSelected,

        animationHandler,

        onClick, onHover, onHoverEnd, onPressed, onReleased, onMoved,
        onKeyPressed, onKeyReleased,
        onFocused, onUnfocused
    } = props

    const [state, setState] = useState<string>(isEnabled ? "enabled" : "disabled")

    const [bounds, setBounds] = useState<Rect2>()
    const [styledAttrs, styledStatesheet, styledLayers, ref] = useJoe(TextViewLayout, Styles.TextView, THEME_LIGHT)
    const containerRef = useRef<HTMLDivElement>(null)

    // console.log("joe", styledAttrs, styledLayers)

    // handle component state and ui events
    const handler = useComponentStateHandler(styledStatesheet, state, setState)

    // handle pointer events
    const basePointerEventCallback: PointerEventCallback = {
        onClick(e?: PointerEvent) {
            return false
        },

        onHover(e?: PointerEvent) {
            handler.set("hovered")

            return false
        },

        onHoverEnd(e?: PointerEvent) {
            handler.set("enabled")

            return false
        },

        onPressed(e?: PointerEvent) {
            handler.set("pressed")

            return false
        },

        onReleased(e?: PointerEvent) {
            handler.set("enabled", () => {
                const [selection, bounds] = handleTextSelection()
            })

            return false
        },

        onMoved(e?: PointerEvent) {
            return false
        },
    }
    const insertedPointerEventCallback: PointerEventCallback = {
        onClick(e?: PointerEvent) {
            return onClick?.(e) || false
        },

        onHover(e?: PointerEvent) {
            return onHover?.(e) || false
        },

        onHoverEnd(e?: PointerEvent) {
            return onHoverEnd?.(e) || false
        },

        onPressed(e?: PointerEvent) {
            return onPressed?.(e) || false
        },

        onReleased(e?: PointerEvent) {
            return onReleased?.(e) || false
        },

        onMoved(e?: PointerEvent) {
            return onMoved?.(e) || false
        }
    }

    const pointerEventCallback = ClickableHandler.insert(basePointerEventCallback, insertedPointerEventCallback)

    const clickableHandler = ClickableHandler.create(ref, state, setState, pointerEventCallback)

    // handle keyboard events
    const baseKeyboardEventCallback: KeyboardEventCallback = {
        onKeyPressed(e?: KeyboardEvent) {
            return false
        },
        onKeyReleased(e?: KeyboardEvent) {
            return false
        }
    }
    const insertedKeyboardEventCallback: KeyboardEventCallback = {
        onKeyPressed(e?: KeyboardEvent) {
            return onKeyPressed?.(e) || false
        },

        onKeyReleased(e?: KeyboardEvent) {
            return onKeyReleased?.(e) || false
        }
    }

    const keyboardEventCallback: KeyboardEventCallback = PressableHandler.insert(baseKeyboardEventCallback, insertedKeyboardEventCallback)

    const pressableHandler = PressableHandler.create(keyboardEventCallback)

    // handle focus events
    const baseFocusEventCallback: FocusEventCallback = {
        onFocused(e?: FocusEvent) {
            handler.set("focused")

            return false
        },

        onUnfocused(e?: FocusEvent) {
            handler.set("enabled")

            return false
        }
    }
    const insertedFocusEventCallback: FocusEventCallback = {
        onFocused(e?: FocusEvent) {
            return onFocused?.(e) || false
        },

        onUnfocused(e?: FocusEvent) {
            return onUnfocused?.(e) || false
        }
    }

    const focusEventHandler = FocusableHandler.insert(baseFocusEventCallback, insertedFocusEventCallback)

    const focusableHandler = FocusableHandler.create(focusEventHandler)

    let animationCallback = {}

    const [p, setP] = useState("")
    const [n, setN] = useState("")
    const [u, setU] = useState("")
    const [pathObj, setPathObj] = useState<SVGPathElement | null>(null)

    useOnLayoutHandler((rect) => {
        // handle animations
        animationHandler?.use(ref, TVAnimatableAttrMap)

        setBounds(rect)

        console.log("bounds", rect)

        const w = rect.width
        const h = rect.height

        const p = `M0,0 H${w} V${h} H0 V0 Z`
        // const n = `M0,0 H${w / 2} V${h} L0,0 Z`
        const n = `M0,0 H${w / 2} V${h / 2} H0 V0 Z`

        const rct1 = ShapeDrawable.createRect({
            width: w,
            height: h,
            cornerRadius: 10
        })

        const rct2 = ShapeDrawable.createRect({
            width: w / 2,
            height: h,
            cornerRadius: 20
        })

        const rct3 = `M0,10 L10,0 L${w / 2 - 10},0 l10,10 L${w / 2},${h - 10} l-10,10 L${10},${h} l-10,-10 L0,10 Z`
        const rct4 = `M0,0 H${w} V${h} H0 V0 Z`

        setP(rct1) // p
        setN(rct2) // n
        setU(p)

        const r = containerRef as React.RefObject<HTMLElement>
        const c = Array.from(Array.from(r.current?.children!).filter((it) => it.tagName === "svg")[0]
            .children)[0] as SVGPathElement

        setPathObj(c)

        c?.animate([
            {d: p},
            {d: n}
        ], {duration: 2000, id: "id"})
    })

    const [th, setTh] = useState<TransitionHandler2>()

    // svg, path w, h = 100%
    return (<div ref={containerRef} tabIndex={1} style={{...ContainerLayout(), position: "relative"}}>
        <svg style={{
            width: bounds?.width,//"100%",
            height: bounds?.height,//"100%",
            position: "absolute",
            zIndex: -1,
        }}>
            <path id={"path"} style={{transition: "all 2000ms"}} width={bounds?.width} height={bounds?.height}
                  fill={"red"} d={p}>
            </path>
        </svg>

        <div
            ref={ref}
            style={{
                ...styledLayers.container[state], ...SelectableText(selectable),
                transition: "all 500ms"
            }} {...clickableHandler} {...pressableHandler} {...focusableHandler}
            onAnimationStart={e => {
                console.log("anim", e.animationName)
            }}

            onAnimationIteration={event => {
                console.log("anim", event.animationName)
            }
            }
            onPointerDown={(event) => {
                if (!th) return

                const transHandler = th!

                if (! transHandler.started) transHandler.start()
                else transHandler.resume()

                setTimeout(() => {
                    transHandler.pause()

                    setTimeout (() => {
                        transHandler.resume()
                    }, 2000)
                }, 1000)
            }}
            onPointerEnter={() => {
                const r = containerRef as React.RefObject<HTMLElement>
                const e = Array.from(r.current?.children!).filter((it) => it.tagName === "svg")[0] as SVGElement
                const pathObj = e.firstChild as SVGPathElement
                //morb(e, n)

                const trans: Transition = {
                    from: p,
                    to: n,
                    duration: 2000,
                    delay: 0,
                    interpolator: LinearInterpolator
                }

                const transHandler = transition(trans, [{element: pathObj, props: ["d"]}])

                setTh(transHandler)
            }}
            onPointerLeave={(event) => {

            }}

        >{children}</div>
    </div>)
}