import PointerEvent from "./pointer_event";
import React from "react";

export class PointerEventCallback {
    onClick(e?: PointerEvent) {
    };

    onHover(e?: PointerEvent) {
    };

    onHoverEnd(e?: PointerEvent) {
    };

    onPressed(e?: PointerEvent) {
    };

    onReleased(e?: PointerEvent) {
    };

    onMoved(e?: PointerEvent) {

    }

    static insert(outer: PointerEventCallback, inner: PointerEventCallback) {
        const callback = new class extends PointerEventCallback {
            onClick(e?: PointerEvent) {
                outer.onClick(e)
                inner.onClick(e);
            }

            onHover(e?: PointerEvent) {
                outer.onHover(e)
                inner.onHover(e);
            }
        }()
    }
}