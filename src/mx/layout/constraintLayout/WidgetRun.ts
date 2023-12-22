import {Dependency} from "./Dependency";
import {ConstraintWidget, DimensionBehaviour} from "./ConstraintWidget";
import {DimensionDependency} from "./DimensionDependency";
import {DependencyNode} from "./DependencyNode";
import {ConstraintAnchor, ConstraintAnchorType} from "./ConstraintAnchor";
import {RunGroup} from "./RunGroup";

export enum RunType {
    NONE, START, END, CENTER
}

export class WidgetRun implements Dependency {
    public matchConstraintsType: number = 0
    mWidget: ConstraintWidget
    mRunGroup: RunGroup | null = null
    mDimensionBehavior: DimensionBehaviour = DimensionBehaviour.FIXED
    mDimension = new DimensionDependency(this);

    public orientation = ConstraintWidget.HORIZONTAL;
    mResolved = false;
    public start = new DependencyNode(this);
    public end = new DependencyNode(this);

    protected mRunType = RunType.NONE;

    constructor(widget: ConstraintWidget) {
        this.mWidget = widget
    }

    // abstract
    clear?(): void

    apply?(): void

    applyToWidget?(): void

    reset?(): void

    supportsWrapComputation?(): boolean

    //

    isDimensionResolved() {
        return this.mDimension.resolved
    }

    isCenterConnection() {
        let connections = 0;
        let count = this.start.mTargets.length
        for (let i = 0; i < count; i++) {
            let dependency = this.start.mTargets[i]
            if (dependency.mRun != this) {
                connections++;
            }
        }
        count = this.end.mTargets.length
        for (let i = 0; i < count; i++) {
            let dependency = this.end.mTargets[i]
            if (dependency.mRun != this) {
                connections++;
            }
        }
        return connections >= 2;
    }

    wrapSize(direction: number) {
        if (this.mDimension.resolved) {
            let size = this.mDimension.value;
            if (this.isCenterConnection()) { //start.targets.size() > 0 && end.targets.size() > 0) {
                size += this.start.mMargin - this.end.mMargin;
            } else {
                if (direction == RunGroup.START) {
                    size += this.start.mMargin;
                } else {
                    size -= this.end.mMargin;
                }
            }
            return size;
        }
        return 0;
    }

    getTarget(anchor: ConstraintAnchor) {
        if (anchor.mTarget == null) {
            return null;
        }
        let target: DependencyNode | null = null;
        let targetWidget = anchor.mTarget.mOwner;
        let targetType = anchor.mTarget.mType;
        switch (targetType) {
            case ConstraintAnchorType.LEFT: {
                let run = targetWidget.mHorizontalRun!
                target = run.start;
            }
                break;
            case ConstraintAnchorType.RIGHT: {
                let run = targetWidget.mHorizontalRun!
                target = run.end;
            }
                break;
            case ConstraintAnchorType.TOP: {
                let run = targetWidget.mVerticalRun!
                target = run.start;
            }
                break;
            case ConstraintAnchorType.BASELINE: {
                let run = targetWidget.mVerticalRun!
                target = run.baseline;
            }
                break;
            case ConstraintAnchorType.BOTTOM: {
                let run = targetWidget.mVerticalRun!
                target = run.end;
            }
                break;
            default:
                break;
        }
        return target;
    }

    updateRunCenter(dependency: Dependency, startAnchor: ConstraintAnchor, endAnchor: ConstraintAnchor, orientation: number) {
        let startTarget = this.getTarget(startAnchor)!
        let endTarget = this.getTarget(endAnchor)!

        if (!(startTarget.resolved && endTarget.resolved)) {
            return;
        }

        let startPos = startTarget.value + startAnchor.getMargin();
        let endPos = endTarget.value - endAnchor.getMargin();
        let distance = endPos - startPos;

        if (!this.mDimension.resolved
            && this.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT) {
            this.resolveDimension(orientation, distance);
        }

        if (!this.mDimension.resolved) {
            return;
        }

        if (this.mDimension.value == distance) {
            this.start.resolve(startPos);
            this.end.resolve(endPos);
            return;
        }

        // Otherwise, we have to center
        let bias = orientation == ConstraintWidget.HORIZONTAL ? this.mWidget.getHorizontalBiasPercent()
            : this.mWidget.getVerticalBiasPercent();

        if (startTarget == endTarget) {
            startPos = startTarget.value;
            endPos = endTarget.value;
            // TODO: taking advantage of bias here would be a nice feature to support,
            // but for now let's stay compatible with 1.1
            bias = 0.5
        }

        let availableDistance = (endPos - startPos - this.mDimension.value);
        this.start.resolve(Math.round(0.5 + startPos + availableDistance * bias))
        this.end.resolve(this.start.value + this.mDimension.value);
    }

    resolveDimension(orientation: number, distance: number) {
        switch (this.matchConstraintsType) {
            case ConstraintWidget.MATCH_CONSTRAINT_SPREAD: {
                this.mDimension.resolve(this.getLimitedDimension(distance, orientation));
            }
                break;
            case ConstraintWidget.MATCH_CONSTRAINT_PERCENT: {
                let parent = this.mWidget.getParent();
                if (parent != null) {
                    let run = orientation == ConstraintWidget.HORIZONTAL
                        ? parent.mHorizontalRun!
                        : parent.mVerticalRun!
                    if (run.mDimension.resolved) {
                        let percent = orientation == ConstraintWidget.HORIZONTAL
                            ? this.mWidget.mMatchConstraintPercentWidth
                            : this.mWidget.mMatchConstraintPercentHeight;
                        let targetDimensionValue = run.mDimension.value;
                        let size = Math.round(0.5 + targetDimensionValue * percent);
                        this.mDimension.resolve(this.getLimitedDimension(size, orientation));
                    }
                }
            }
                break;
            case ConstraintWidget.MATCH_CONSTRAINT_WRAP: {
                let wrapValue = this.getLimitedDimension(this.mDimension.wrapValue, orientation);
                this.mDimension.resolve(Math.min(wrapValue, distance));
            }
                break;
            case ConstraintWidget.MATCH_CONSTRAINT_RATIO: {
                if (this.mWidget.mHorizontalRun!.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT
                    && this.mWidget.mHorizontalRun!.matchConstraintsType == ConstraintWidget.MATCH_CONSTRAINT_RATIO
                    && this.mWidget.mVerticalRun!.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT
                    && this.mWidget.mVerticalRun!.matchConstraintsType == ConstraintWidget.MATCH_CONSTRAINT_RATIO) {
                    // pof
                } else {
                    let run = (orientation == ConstraintWidget.HORIZONTAL) ? this.mWidget.mVerticalRun! : this.mWidget.mHorizontalRun!
                    if (run.mDimension.resolved) {
                        let ratio = this.mWidget.getDimensionRatio();
                        let value;
                        if (orientation == ConstraintWidget.VERTICAL) {
                            value = Math.round(0.5 + run.mDimension.value / ratio);
                        } else {
                            value = Math.round(0.5 + ratio * run.mDimension.value);
                        }
                        this.mDimension.resolve(value);
                    }
                }
            }
                break;
            default:
                break;
        }
    }

    updateRunStart(dependency: Dependency) {

    }

    updateRunEnd(dependency: Dependency) {

    }

// @TODO: add description
    update(dependency: Dependency) {
    }

    getLimitedDimension (dimension: number, orientation: number) {
        if (orientation == ConstraintWidget.HORIZONTAL) {
            let max = this.mWidget.mMatchConstraintMaxWidth;
            let min = this.mWidget.mMatchConstraintMinWidth;
            let value = Math.max(min, dimension);
            if (max > 0) {
                value = Math.min(max, dimension);
            }
            if (value != dimension) {
                dimension = value;
            }
        } else {
            let max = this.mWidget.mMatchConstraintMaxHeight;
            let min = this.mWidget.mMatchConstraintMinHeight;
            let value = Math.max(min, dimension);
            if (max > 0) {
                value = Math.min(max, dimension);
            }
            if (value != dimension) {
                dimension = value;
            }
        }
        return dimension;
    }

    getTargetWithOrientation(anchor: ConstraintAnchor, orientation: number) {
        if (anchor.mTarget == null) {
            return null;
        }
        let target: DependencyNode | null = null;
        let targetWidget = anchor.mTarget.mOwner;
        let run = (orientation == ConstraintWidget.HORIZONTAL) ? targetWidget.mHorizontalRun! : targetWidget.mVerticalRun!
        let targetType = anchor.mTarget.mType;
        switch (targetType) {
            case ConstraintAnchorType.TOP:
            case ConstraintAnchorType.LEFT: {
                target = run.start;
            }
                break;
            case ConstraintAnchorType.BOTTOM:
            case ConstraintAnchorType.RIGHT: {
                target = run.end;
            }
                break;
            default:
                break;
        }
        return target;
    }

    addTarget (node: DependencyNode, target: DependencyNode, margin:  number) {
        node.mTargets.push(target);
        node.mMargin = margin;
        target.mDependencies.push(node);
    }

    addTargetWithDependency (node: DependencyNode, target: DependencyNode, marginFactor:  number, dimensionDependency: DimensionDependency) {
        node.mTargets.push(target);
        node.mTargets.push(this.mDimension);
        node.mMarginFactor = marginFactor;
        node.mMarginDependency = dimensionDependency;
        target.mDependencies.push(node);
        dimensionDependency.mDependencies.push(node);
    }

    getWrapDimension () {
        if (this.mDimension.resolved) {
            return this.mDimension.value
        }

        return 0
    }

    isResolved () {
        return this.mResolved
    }
}