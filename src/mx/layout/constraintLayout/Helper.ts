import {ConstraintWidget} from "./ConstraintWidget";
import {ConstraintWidgetContainer} from "./ConstraintWidgetContainer";

export interface Helper {
    updateConstraints (container: ConstraintWidgetContainer): void

    add (widget: ConstraintWidgetContainer): void

    removeAllIds (): void
}