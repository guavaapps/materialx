import {DependencyNode, DependencyNodeType} from "./DependencyNode";
import {WidgetRun} from "./WidgetRun";
import {HorizontalWidgetRun} from "./HorizontalWidgetRun";

export class DimensionDependency extends DependencyNode{
    wrapValue: number = 0

    constructor(run: WidgetRun) {
        super(run);

        if (run instanceof HorizontalWidgetRun) {
            this.mType = DependencyNodeType.HORIZONTAL_DIMENSION;
        } else {
            this.mType = DependencyNodeType.VERTICAL_DIMENSION;
        }
    }

    resolve (value: number) {
        if (this.resolved) {
            return;
        }
        this.resolved = true;
        this.value = value;
        for (let node of this.mDependencies) {
            node.update(node);
        }
    }
}