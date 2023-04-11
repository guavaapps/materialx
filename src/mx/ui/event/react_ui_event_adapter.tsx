import {PointerEventCallback} from "./pointerEventCallback";
import React, {Dispatch, MutableRefObject, SetStateAction} from "react";
import {State} from "../../state";
import PointerEvent from "./pointer_event";
import Pointer_event from "./pointer_event";

export class ReactUiEventAdapter {
    static wrap(ref: MutableRefObject<any>, callback: PointerEventCallback) {
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