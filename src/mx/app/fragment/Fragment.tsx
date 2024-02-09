import {FragmentParams} from "./FragmentParams";
import React, {cloneElement, createContext, ReactElement, useContext} from "react";
import {ThemeUtils} from "../../theme/ThemeUtils";
import {Theme, THEME_LIGHT} from "../../theme/Theme";
import {ComponentUtils} from "../../components/Component";
import {Layout, Rect} from "../../layout/Layout";
import {CoordinatorLayout} from "../../layout/coordinator-layout/CoordinatorLayout";
import {ConstraintLayout} from "../../layout/constraintLayout/ConstraintLayout";
import {LayoutParams} from "../../layout/LayoutParams";
import MATCH_PARENT = LayoutParams.MATCH_PARENT;
import ReactDOM from "react-dom/client";

export function Fragment(params: FragmentParams) {
    const {
        theme,
        children
    } = params

    const state = new FragmentState(theme)

    return (<FragmentStateWrapper.Provider value={state}>
        {children}
    </FragmentStateWrapper.Provider>)
}


export class FragmentState {
    constructor(
        public theme: Theme
    ) {
    }
}

const DefaultFragmentState = new FragmentState(THEME_LIGHT)

const FragmentStateWrapper = createContext(DefaultFragmentState)

export function useFragment() {
    return useContext(FragmentStateWrapper)
}

class Measurer {
    constructor(
        private container: ComponentUtils.ComponentParams
    ) {

    }

    traverse() {
        let root = this.container

        let q: ComponentUtils.ComponentParams[] = []
        let s = new Set<ComponentUtils.ComponentParams>()

        q.unshift(root)
        s.add(root)

        while (q.length > 0) {
            let v = q.shift()!



            let children = ComponentUtils.getChildren(v)
            for (let child of children) {
                let measuredBounds: Rect = {
                    width: 0,
                    height: 0,
                }

                if (!this.canMeasureDirectly(child)) {
                    measuredBounds = this.wrapMeasure(child)
                }

                if (this.canMeasureWidthDirectly(child)) {
                    if (child.props.width === MATCH_PARENT) {
                        child.props.width = v.width
                    }
                }
                else {
                    child.props.width = measuredBounds.width
                }

                if (this.canMeasureHeightDirectly(child)) {
                    if (child.props.height === MATCH_PARENT) {
                        child.props.height = v.height
                    }
                }
                else {
                    child.props.height = measuredBounds.height
                }

                if (!s.has(child.props) && this.isContainer(child)) {
                    s.add(child.props)
                    q.unshift(child.props)
                }
            }
        }
    }

    wrapMeasure (element: ReactElement) {
        const frag = document.createDocumentFragment()
        const layout = ReactDOM.createRoot(frag)

        layout.render(element)

        const measured = document.children.item(0)!
        const bounds: Rect = {
            width: measured.getBoundingClientRect().width,
            height: measured.getBoundingClientRect().height
        }

        return bounds
    }

    private isContainer(element: ReactElement) {
        return element.type === CoordinatorLayout
            || element.type === ConstraintLayout
    }

    private isComponent (element: ReactElement) {
        return !this.isContainer(element) && typeof element.type === "function"
    }

    private canMeasureDirectly (element: ReactElement) {
        return this.canMeasureWidthDirectly(element) || this.canMeasureHeightDirectly(element)
    }

    private canMeasureWidthDirectly(element: ReactElement) {
        return element.props.width !== LayoutParams.WRAP_CONTENT
    }

    private canMeasureHeightDirectly(element: ReactElement) {
        return element.props.height !== LayoutParams.WRAP_CONTENT
    }
}