import {LayoutParams} from "../layout/LayoutParams";
import React, {ReactElement} from "react";
import {Layout} from "../layout/Layout";
import {ConstraintLayout} from "../layout/constraintLayout/ConstraintLayout";
import {CoordinatorLayout} from "../layout/coordinator-layout/CoordinatorLayoutParams";
import {Style} from "../styles/Style";

export namespace Component {
    export type ComponentParams = {
        id?: string,
        isEnabled?: boolean,
        children?: React.ReactNode,
        style?: Style,
    } & Layout.LayoutParams
        & ConstraintLayout.LayoutParams
        & CoordinatorLayout.CoordinatorLayoutParams

    export namespace ComponentParams {
        export function withDefaults(params: Component.ComponentParams) {
            const p = Object.assign({}, params)

            p.isEnabled = p.isEnabled ?? true

            return p
        }
    }
}
