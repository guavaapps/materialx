import {ConstraintWidgetContainer} from "./ConstraintWidget";

export interface Helper {
    updateConstraints (container: ConstraintWidgetContainer): void

    add (widget: ConstraintWidgetContainer): void

    removeAllIds (): void
}