import {DimensionDependency} from "./DimensionDependency";
import {WidgetRun} from "./WidgetRun";
import {DependencyNode} from "./DependencyNode";
import {VerticalWidgetRun} from "./VerticalWidgetRun";

export class BaselineDimensionDependency extends DimensionDependency{
    constructor(run: WidgetRun) {
        super(run);
    }

    update(node: DependencyNode) {
        let verticalRun = this.mRun as VerticalWidgetRun
        verticalRun.baseline.mMargin = this.mRun.mWidget.getBaselineDistance()
        this.resolved = true
    }
}