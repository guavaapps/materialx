import {WidgetContainer} from "./WidgetContainer";
import {WidgetRun} from "./WidgetRun";
import {ConstraintWidget} from "./ConstraintWidget";
import {DependencyNode, DependencyNodeType} from "./DependencyNode";
import {Barrier} from "./Barrier";
import {Dependency} from "./Dependency";

export class HelperReferences extends WidgetRun{
    constructor(widget: ConstraintWidget) {
        super(widget);
    }

    clear() {
        this.mRunGroup = null
        this.start.clear()
    }

    reset() {
        this.start.resolved = false
    }

    supportsWrapComputation(): boolean {
        return false
    }

    addDependency (node: DependencyNode) {
        this.start.mDependencies.push(node)

        node.mTargets.push(this.start)
    }

    apply() {
        if (this.mWidget instanceof Barrier) {
            this.start.delegateToWidgetRun = true;
            let barrier = this.mWidget as Barrier
            let type = barrier.getBarrierType();
            let allowsGoneWidget = barrier.getAllowsGoneWidget();
            switch (type) {
                case Barrier.LEFT: {
                    this.start.mType = DependencyNodeType.LEFT;
                    for (let i = 0; i < barrier.mWidgetsCount; i++) {
                        let refWidget = barrier.mWidgets[i]!
                        if (!allowsGoneWidget && refWidget.getVisibility() == ConstraintWidget.GONE) {
                            continue;
                        }
                        let target = refWidget.mHorizontalRun.start;
                        target.mDependencies.add(this.start);
                        this.start.mTargets.push(target);
                        // FIXME -- if we move the DependencyNode directly
                        //          in the ConstraintAnchor we'll be good.
                    }
                    this.addDependency(this.mWidget.mHorizontalRun.start);
                    this.addDependency(this.mWidget.mHorizontalRun.end);
                }
                    break;
                case Barrier.RIGHT: {
                    this.start.mType = DependencyNodeType.RIGHT;
                    for (let i = 0; i < barrier.mWidgetsCount; i++) {
                        let refWidget = barrier.mWidgets[i]!
                        if (!allowsGoneWidget
                            && refWidget.getVisibility() == ConstraintWidget.GONE) {
                            continue;
                        }
                        let target = refWidget.mHorizontalRun.end!
                        target.mDependencies.add(this.start);
                        this.start.mTargets.push(target);
                        // FIXME -- if we move the DependencyNode directly
                        //              in the ConstraintAnchor we'll be good.
                    }
                    this.addDependency(this.mWidget.mHorizontalRun.start);
                    this.addDependency(this.mWidget.mHorizontalRun.end);
                }
                    break;
                case Barrier.TOP: {
                    this.start.mType = DependencyNodeType.TOP;
                    for (let i = 0; i < barrier.mWidgetsCount; i++) {
                        let refwidget = barrier.mWidgets[i]!
                        if (!allowsGoneWidget
                            && refwidget.getVisibility() == ConstraintWidget.GONE) {
                            continue;
                        }
                        let target = refwidget.mVerticalRun.start;
                        target.mDependencies.add(this.start);
                        this.start.mTargets.push(target);
                        // FIXME -- if we move the DependencyNode directly
                        //              in the ConstraintAnchor we'll be good.
                    }
                    this.addDependency(this.mWidget.mVerticalRun.start);
                    this.addDependency(this.mWidget.mVerticalRun.end);
                }
                    break;
                case Barrier.BOTTOM: {
                    this.start.mType = DependencyNodeType.BOTTOM;
                    for (let i = 0; i < barrier.mWidgetsCount; i++) {
                        let refwidget = barrier.mWidgets[i]!
                        if (!allowsGoneWidget
                            && refwidget.getVisibility() == ConstraintWidget.GONE) {
                            continue;
                        }
                        let target = refwidget.mVerticalRun.end;
                        target.mDependencies.add(this.start);
                        this.start.mTargets.push(target);
                        // FIXME -- if we move the DependencyNode directly
                        //              in the ConstraintAnchor we'll be good.
                    }
                    this.addDependency(this.mWidget.mVerticalRun.start);
                    this.addDependency(this.mWidget.mVerticalRun.end);
                }
                    break;
            }
        }
    }

    update(dependency: Dependency) {
        let barrier = this.mWidget as Barrier
        let type = barrier.getBarrierType();

        let min = -1;
        let max = 0;
        for (let node of this.start.mTargets) {
            let value = node.value;
            if (min == -1 || value < min) {
                min = value;
            }
            if (max < value) {
                max = value;
            }
        }
        if (type == Barrier.LEFT || type == Barrier.TOP) {
            this.start.resolve(min + barrier.getMargin());
        } else {
            this.start.resolve(max + barrier.getMargin());
        }
    }

    applyToWidget() {
        if (this.mWidget instanceof Barrier) {
            let barrier = this.mWidget as Barrier
            let type = barrier.getBarrierType();
            if (type == Barrier.LEFT
                || type == Barrier.RIGHT) {
                this.mWidget.setX(this.start.value);
            } else {
                this.mWidget.setY(this.start.value);
            }
        }
    }
}