import React, {MutableRefObject} from "react";

export abstract class PointerEvent {
    viewX? = 0
    viewY? = 0
    x? = 0
    y? = 0

    rawX? = 0
    rawY? = 0

    clickCount? = 0

    altPressed? = false
    controlPressed? = false
    metaPressed? = false
    shiftPressed? = false

    static create(ref: MutableRefObject<any>, e: React.MouseEvent) {
        const boundingBox = ref.current.getBoundingClientRect()

        return {
            viewX: e.clientX - boundingBox.x,
            viewY: e.clientY - boundingBox.y,

            x: e.clientX,
            y: e.clientY,

            rawX: e.pageX,
            rawY: e.pageY,

            clickCount: e.detail,

            shiftPressed: e.shiftKey,
            altPressed: e.altKey,
            controlPressed: e.ctrlKey,
            metaPressed: e.metaKey,
        }
    }
}

export class KeyVariant {
    static STANDARD = "STANDARD"
    static LEFT = "LEFT"
    static RIGHT = "RIGHT"
    static NUMPAD = "NUMPAD"
    static MOBILE = "MOBILE"
    static JOYSTICK = "JOYSTICK"
}

export abstract class KeyboardEvent {
    key?: string
    code?: string

    locale?: string
    repeating?: boolean
    variant?: string

    altPressed? = false
    controlPressed? = false
    metaPressed? = false
    shiftPressed? = false

    static create(e: React.KeyboardEvent): KeyboardEvent {
        const keyboardEvent: KeyboardEvent = {
            key: e.key,
            code: e.code,

            locale: e.locale,
            repeating: e.repeat,
            variant: this.mapKeyVariant(e.location),

            altPressed: e.altKey,
            controlPressed: e.ctrlKey,
            metaPressed: e.metaKey,
            shiftPressed: e.shiftKey
        }

        return keyboardEvent
    }

    private static mapKeyVariant(variant: number) {
        switch (variant) {
            case 1:
                return KeyVariant.LEFT

            case 2:
                return KeyVariant.RIGHT

            case 3:
                return KeyVariant.NUMPAD

            case 4:
                return KeyVariant.MOBILE

            case 5:
                return KeyVariant.JOYSTICK

            default:
                return KeyVariant.STANDARD
        }
    }
}

export abstract class FocusEvent {
    static create (e: React.FocusEvent): KeyboardEvent {
        return {

        }
    }
}