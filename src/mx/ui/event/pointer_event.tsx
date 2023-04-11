import React, {MutableRefObject} from "react";

abstract class PointerEvent {
    viewX? = 0
    viewY? = 0
    x? = 0
    y? = 0

    rawX? = 0
    rawY? = 0

    altPressed? = false
    controlPressed? = false
    metaPressed? = false
    shiftPressed? = false

    static create (ref: MutableRefObject<any>, e: React.MouseEvent) {
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
}

export default PointerEvent;