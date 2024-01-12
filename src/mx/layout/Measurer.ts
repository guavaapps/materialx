import React, {ReactElement} from "react";
import ReactDOM from "react-dom/client";
import {Layout} from "./layout";
import {Rect} from "../shapes/shapes";


const MATCH_PARENT = Layout.LayoutParams.MATCH_PARENT
const WRAP_CONTENT = Layout.LayoutParams.WRAP_CONTENT
const UNSET = Layout.LayoutParams.UNSET

export class Measurer {
    private static sFragment: DocumentFragment
    private static sLayout: ReactDOM.Root

    constructor(widthMeasureSpec: number, heightMeasureSpec: number) {
        if (Measurer.sLayout === null || Measurer.sFragment === null) {
            const fragment = document.createDocumentFragment()
            const root = ReactDOM.createRoot(fragment)

            Measurer.sFragment = fragment
            Measurer.sLayout = root
        }
    }

    private getViewBounds (view: ReactElement) {
        Measurer.sLayout.render(view)
        const rect = Measurer.sFragment.children.item(0)!.getBoundingClientRect()

        return {
            width: rect.width,
            height: rect.height
        } as Rect
    }

    measure(view: ReactElement, params: Layout.LayoutParams) {
        let [widthMeasureSpec, heightMeasureSpec] = MeasureSpec.get(params)

        let measuredBounds: Rect = {
            width: params.width,
            height: params.height
        }

        if (widthMeasureSpec == MeasureSpec.UNSPECIFIED || widthMeasureSpec == MeasureSpec.AT_MOST) {
            measuredBounds = this.getViewBounds(view)

            if (widthMeasureSpec == MeasureSpec.AT_MOST) {
                measuredBounds.width = Math.min(params.maxWidth, measuredBounds.width)
            }
        }

        if (widthMeasureSpec == MeasureSpec.UNSPECIFIED || widthMeasureSpec == MeasureSpec.AT_MOST) {
            if (!measuredBounds) {
                measuredBounds = this.getViewBounds(view)
            }

            if (widthMeasureSpec == MeasureSpec.AT_MOST) {
                measuredBounds.height = Math.min(params.maxHeight, measuredBounds.height)
            }
        }

        return measuredBounds
    }
}

export class MeasureSpec {
    static readonly UNSPECIFIED = 0
    static readonly EXACTLY = 1
    static readonly AT_MOST = 2

    static get(layoutParams: Layout.LayoutParams) {
        let w
        let h

        if (layoutParams.width == WRAP_CONTENT) {
            if (layoutParams.maxWidth != UNSET) {
                w = MeasureSpec.AT_MOST
            } else {
                w = MeasureSpec.UNSPECIFIED
            }
        } else {
            w = MeasureSpec.EXACTLY
        }

        if (layoutParams.height == WRAP_CONTENT) {
            if (layoutParams.maxHeight != UNSET) {
                h = MeasureSpec.AT_MOST
            } else {
                h = MeasureSpec.UNSPECIFIED
            }
        } else {
            h = MeasureSpec.EXACTLY
        }

        return [w, h]
    }
}