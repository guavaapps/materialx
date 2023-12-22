import {WidgetRun} from "./WidgetRun";
import {ConstraintWidget} from "./ConstraintWidget";
import {Guideline} from "./Guideline";
import {DependencyNode} from "./DependencyNode";
import {Dependency} from "./Dependency";

export class GuidelineReference extends WidgetRun{
    constructor(widget: ConstraintWidget) {
        super(widget);

        widget.mHorizontalRun.clear()
        widget.mVerticalRun.clear()
        this.orientation = (widget as Guideline).getOrientation()
    }

    clear() {
        this.start.clear()
    }

    reset() {
        this.start.resolved = false
        this.end.resolved = false
    }

    supportsWrapComputation(): boolean {
        return false
    }

    addDependency (node: DependencyNode) {
        this.start.mDependencies.push(node)
        node.mTargets.push(this.start)
    }

    update(dependency: Dependency) {
        if (!this.start.readyToSolve) {
            return;
        }
        if (this.start.resolved) {
            return;
        }
        // ready to solve, centering.
        let startTarget = this.start.mTargets[0]
        let guideline = this.mWidget as Guideline
        let startPos = Math.round(0.5 + startTarget.value * guideline.getRelativePercent());
        this.start.resolve(startPos);
    }

    applyToWidget() {
        let guideline = this.mWidget as Guideline
        if (guideline.getOrientation() == ConstraintWidget.VERTICAL) {
            this.mWidget.setX(this.start.value);
        } else {
            this.mWidget.setY(this.start.value);
        }
    }
}