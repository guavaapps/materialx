import React, {RefObject, useEffect, useLayoutEffect, useRef, useState} from "react";
import "./ripple.scss"
import {keyboard} from "@testing-library/user-event/dist/keyboard";
import {Button} from "../button/button";

type RippleProps = {
    left: number
    top: number
    width: number, height: number
    diameter: number,
    color: string
}

function Ripple(props: RippleProps) {
    const {color, diameter, left, top, width, height} = props

    return (<span
        style={{
            top: top - diameter / 2,
            left: left - diameter / 2,
            height: Math.max(width, height),
            width: Math.max(width, height),
            transitionDuration: "200ms",
            transform: "scale(0.5)",
            position: "absolute",
            backgroundColor: color,
            opacity: "100%",
            borderRadius: "50%",
        }}
    />)
}

const useRipple = <T extends HTMLElement>(ref: React.RefObject<T>, color: string = "#ffffff") => {
    //ripples are just styles that we attach to span elements
    const [ripples, setRipples] = useState<React.CSSProperties[]>([]);
    const rippleRef = useRef<HTMLElement>(null)
    const [rippleTag, setRippleTag] = useState<string | null>(null)
    const [isHolding, setIsHolding] = useState(false)

    useLayoutEffect(() => {
        //check if there's a ref
        if (ref.current) {
            const elem = ref.current;

            const currentRipple = rippleRef.current
            console.log(" ")
            console.log("new ripples size", ripples.length)
            console.log("button children", currentRipple)

            //add a click handler for the ripple
            const onDown = (e: MouseEvent) => {
                setIsHolding(false)
                setRippleTag(`ripple-${ripples.length}`)

                //calculate the position and dimensions of the ripple.
                //based on click position and button dimensions
                var rect = elem.getBoundingClientRect();

                var left = e.clientX - rect.left;
                var top = e.clientY - rect.top;
                const height = elem.clientHeight;
                const width = elem.clientWidth;

                const diameter = Math.max(width, height);

                const prev = ripples[ripples.length - 1]
                prev.top = top - diameter / 2
                prev.left = left - diameter / 2
                prev.width = Math.max(width, height)
                prev.height = Math.max(width, height)

                setRipples([
                    ...ripples.slice(0, ripples.length - 1),
                    prev,
                    {
                        top: top - diameter / 2,
                        left: left - diameter / 2,
                        height: Math.max(width, height),
                        width: Math.max(width, height),
                        transform: "scale(0)"
                    },
                ]);

                currentRipple?.animate(
                    [{
                        transform: "scale(2)",
                    }],
                    {
                        duration: 200,
                        fill: "forwards"
                    }
                )

            };

            const onUp = (e: PointerEvent) => {
                console.log("onUp", currentRipple)

                const elemContainer = elem.children[0]
                    .children[0]
                const cRipple = elemContainer.children[elemContainer.children.length - 2]

                cRipple?.animate(
                    [{
                        opacity: 0
                    }],
                    {
                        duration: 200,
                        delay: 200,
                        fill: "forwards"
                    }
                )

                setIsHolding(false)
            }

            //add an event listener to the button
            elem.addEventListener("pointerdown", onDown);
            elem.addEventListener("pointerup", onUp)

            //clean up when the component is unmounted
            return () => {
                elem.removeEventListener("pointerdown", onDown);
                elem.removeEventListener("pointerup", onUp)
            };
        }
    }, [ref, ripples, rippleRef.current]);

    //add a debounce so that if the user doesn't click after 1s, we remove the ripples
    const _debounced = useDebounce(ripples, 1000);
    useEffect(() => {
        if (_debounced.length) {
            //if (!isHolding) setRipples([]);
        }
    }, [_debounced.length]);

    //map through the ripples and return span elements.
    //this will be added to the button component later

    if (ripples.length === 0) {
        setRipples([{transform: "scale(0)"}])
    }

    return ripples?.map((style, i) => {
        return (
            <span
                key={i}
                ref={rippleRef}
                id={`ripple-${i}`}
                style={{
                    ...style,
                    position: "absolute",
                    backgroundColor: color,
                    opacity: "100%",
                    borderRadius: "50%",
                    //@ts-ignore
                    color: `rgba(${i}, 0, 0, 0.5)`,
                }}
            />
        );
    });
};

function useDebounce<T>(value: T, delay?: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay || 500)

        return () => {
            clearTimeout(timer)
        }
    }, [value, delay])

    return debouncedValue
}

export default useRipple;