import React, {useEffect, useLayoutEffect, useRef, useState} from "react";
// import "./ripple.scss"

const createRipple = (on: HTMLElement, e: PointerEvent) => {
    var rect = on.getBoundingClientRect();

    var left = e.clientX - rect.left;
    var top = e.clientY - rect.top;
    const height = on.clientHeight;
    const width = on.clientWidth;

    const diameter = Math.max(width, height);

    return  {
        top: top - diameter / 2,
        left: left - diameter / 2,
        width: Math.max(width, height),
        height: Math.max(width, height),
    }
}

const useRipple = <T extends HTMLElement>(ref: React.RefObject<T>, color: string = "#ffffff") => {
    //ripples are just styles that we attach to span elements
    const [ripples, setRipples] = useState<React.CSSProperties[]>([]);
    const rippleRef = useRef<HTMLElement>(null)
    const [isHolding, setIsHolding] = useState(false)

    useLayoutEffect(() => {
        //check if there's a ref
        if (ref.current) {
            const elem = ref.current;

            const currentRipple = rippleRef.current

            //add a click handler for the ripple
            const onDown = (e: PointerEvent) => {
                setIsHolding(true)

                const prev = {
                    ...ripples[ripples.length - 1],
                    ...createRipple(elem, e)
                }

                setRipples([
                    // any existing active ripples
                    ...ripples.slice(0, ripples.length - 1),
                    // current
                    prev,
                    // next
                    {
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
                const elemContainer = elem.children[0]
                    .children[0]
                const cRipple = elemContainer.children[elemContainer.children.length - 2]
                console.log("onUp", cRipple)

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
            if (!isHolding) setRipples([{transform: "scale(0)"}]);
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