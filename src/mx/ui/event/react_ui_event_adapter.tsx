import {KeyboardEventCallback, PointerEventCallback} from "./pointerEventCallback";
import React, {Dispatch, MutableRefObject, SetStateAction} from "react";
import {State} from "../../state";
import {PointerEvent, KeyboardEvent, KeyVariant} from "./pointer_event";

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

    static wrapKeyboardEvent (callback: KeyboardEventCallback) {
        return {
            onKeyDown (e: React.KeyboardEvent) {
                if (callback.onKeyPressed) {
                    callback.onKeyPressed(KeyboardEvent.create(e))
                }
            },

            onKeyUp (e: React.KeyboardEvent) {
                if (callback.onKeyReleased) {
                    callback.onKeyReleased(KeyboardEvent.create(e))
                }
            }
        }
    }
}