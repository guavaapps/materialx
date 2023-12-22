import {RunType, WidgetRun} from "./WidgetRun";
import {ConstraintWidget, DimensionBehaviour} from "./ConstraintWidget";
import {DependencyNode, DependencyNodeType} from "./DependencyNode";
import {ConstraintAnchorType} from "./ConstraintAnchor";
import {Interfaces} from "./utils";
import {Dependency} from "./Dependency";
import {DimensionDependency} from "./DimensionDependency";
import {BaselineDimensionDependency} from "./BaselineDimensionDependency";

export class VerticalWidgetRun extends WidgetRun {
    private static readonly FORCE_USE = true;
    public baseline: DependencyNode = new DependencyNode(this);
    mBaselineDimension: DimensionDependency | null = null;

    constructor(widget: ConstraintWidget) {
        super(widget);

        this.start.mType = DependencyNodeType.TOP
        this.end.mType = DependencyNodeType.BOTTOM
        this.baseline.mType = DependencyNodeType.BASELINE
        this.orientation = ConstraintWidget.VERTICAL
    }

    toString() {
        return "VerticalRun " + this.mWidget.getDebugName();
    }

    clear() {
        this.mRunGroup = null;
        this.start.clear();
        this.end.clear();
        this.baseline.clear()
        this.mDimension.clear();
        this.mResolved = false;
    }

    reset() {
        this.mResolved = false;
        this.start.clear();
        this.start.resolved = false;
        this.end.clear();
        this.end.resolved = false;
        this.baseline.clear()
        this.baseline.resolved = false
        this.mDimension.resolved = false;
    }

    supportsWrapComputation(): boolean {
        if (super.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT) {
            if (super.mWidget.mMatchConstraintDefaultHeight == ConstraintWidget.MATCH_CONSTRAINT_SPREAD) {
                return true;
            }
            return false;
        }
        return true;
    }

    apply() {
        if (this.mWidget.measured) {
            this.mDimension.resolve(this.mWidget.getHeight());
        }
        if (!this.mDimension.resolved) {
            super.mDimensionBehavior = this.mWidget.getVerticalDimensionBehaviour();

            if (this.mWidget.hasBaseline()) {
                this.mBaselineDimension = new BaselineDimensionDependency(this);
            }

            if (super.mDimensionBehavior != DimensionBehaviour.MATCH_CONSTRAINT) {
                if (this.mDimensionBehavior == DimensionBehaviour.MATCH_PARENT) {
                    let parent = this.mWidget.getParent();
                    if (parent != null && parent.getVerticalDimensionBehaviour() == DimensionBehaviour.FIXED) {
                        let resolvedDimension = parent.getHeight()
                            - this.mWidget.mTop.getMargin() - this.mWidget.mBottom.getMargin();
                        this.addTarget(this.start, parent.mVerticalRun!.start, this.mWidget.mTop.getMargin());
                        this.addTarget(this.end, parent.mVerticalRun!.end, -this.mWidget.mBottom.getMargin());
                        this.mDimension.resolve(resolvedDimension);
                        return;
                    }
                }
                if (this.mDimensionBehavior == DimensionBehaviour.FIXED) {
                    this.mDimension.resolve(this.mWidget.getHeight());
                }
            }
        } else {
            if (this.mDimensionBehavior == DimensionBehaviour.MATCH_PARENT) {
                let parent = this.mWidget.getParent();
                if (parent != null && (parent.getVerticalDimensionBehaviour() == DimensionBehaviour.FIXED)) {
                    this.addTarget(this.start, parent.mVerticalRun!.start, this.mWidget.mTop.getMargin());
                    this.addTarget(this.end, parent.mVerticalRun!.end, -this.mWidget.mBottom.getMargin());
                    return;
                }
            }
        }

        // three basic possibilities:
        // <-s-e->
        // <-s-e
        //   s-e->
        // and a variation if the dimension is not yet known:
        // <-s-d-e->
        // <-s<-d<-e
        //   s->d->e->

        if (this.mDimension.resolved && this.mWidget.measured) {
            if (this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_TOP].mTarget != null
                && this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_BOTTOM].mTarget != null) { // <-s-e->
                if (this.mWidget.isInVerticalChain()) {
                    this.start.mMargin = this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_TOP].getMargin();
                    this.end.mMargin = -this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_BOTTOM].getMargin();
                } else {
                    let startTarget = this.getTarget(this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_TOP]);
                    if (startTarget != null) {
                        this.addTarget(this.start, startTarget, this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_TOP].getMargin());
                    }
                    let endTarget = this.getTarget(this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_BOTTOM]);
                    if (endTarget != null) {
                        this.addTarget(this.end, endTarget,
                            -this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_BOTTOM].getMargin());
                    }
                    this.start.delegateToWidgetRun = true;
                    this.end.delegateToWidgetRun = true;
                }

                if (this.mWidget.hasBaseline()) {
                    this.addTarget(this.baseline, this.start, this.mWidget.getBaselineDistance());
                }
            } else if (this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_TOP].mTarget != null) { // <-s-e
                let target = this.getTarget(this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_TOP]);

                if (target != null) {
                    this.addTarget(this.start, target, this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_TOP].getMargin());
                    this.addTarget(this.end, this.start, this.mDimension.value);

                    if (this.mWidget.hasBaseline()) {
                        this.addTarget(this.baseline, this.start, this.mWidget.getBaselineDistance());
                    }
                }
            } else if (this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_BOTTOM].mTarget != null) {   //   s-e->
                let target = this.getTarget(this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_BOTTOM]);
                if (target != null) {
                    this.addTarget(this.end, target, -this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_BOTTOM].getMargin());
                    this.addTarget(this.start, this.end, -this.mDimension.value);
                }

                if (this.mWidget.hasBaseline()) {
                    this.addTarget(this.baseline, this.start, this.mWidget.getBaselineDistance());
                }
            }
            else if (this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_BASELINE].mTarget
                != null) {
                let target = this.getTarget(this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_BASELINE]);
                if (target != null) {
                    this.addTarget(this.baseline, target, 0);
                    this.addTarget(this.start, this.baseline, -this.mWidget.getBaselineDistance());
                    this.addTarget(this.end, this.start, this.mDimension.value);
                }
            }
            else {
                // no connections, nothing to do.
                // if (!(this.mWidget instanceof Helper) && this.mWidget.getParent() != null
                //     && this.mWidget.getAnchor(ConstraintAnchorType.CENTER)!.mTarget == null) {
                if (!(Interfaces.instanceOfHelper(this.mWidget)) && this.mWidget.getParent() != null
                    && this.mWidget.getAnchor(ConstraintAnchorType.CENTER)!.mTarget == null) {
                    let top = this.mWidget.getParent()!.mVerticalRun!.start;
                    this.addTarget(this.start, top, this.mWidget.getY());
                    this.addTarget(this.end, this.start, this.mDimension.value);

                    if (this.mWidget.hasBaseline()) {
                        this.addTarget(this.baseline, this.start, this.mWidget.getBaselineDistance());
                    }
                }
            }
        }
        else {
            if (!this.mDimension.resolved && this.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT) {
                switch (this.mWidget.mMatchConstraintDefaultHeight) {
                    case ConstraintWidget.MATCH_CONSTRAINT_RATIO: {
                        if (!this.mWidget.isInVerticalChain()) {
                            if (this.mWidget.mMatchConstraintDefaultWidth == ConstraintWidget.MATCH_CONSTRAINT_RATIO) {
                                // need to look into both side
                                // do nothing here --
                                //    let the HorizontalWidgetRun::update() deal with it.
                                break;
                            }
                            // we have a ratio, but we depend on the other side computation
                            let targetDimension = this.mWidget.mHorizontalRun!.mDimension;
                            this.mDimension.mTargets.push(targetDimension);
                            targetDimension.mDependencies.push(this.mDimension);
                            this.mDimension.delegateToWidgetRun = true;
                            this.mDimension.mDependencies.push(this.start);
                            this.mDimension.mDependencies.push(this.end);
                        }
                    }
                        break;
                    case ConstraintWidget.MATCH_CONSTRAINT_PERCENT: {
                        // we need to look up the parent dimension
                        let parent = this.mWidget.getParent();
                        if (parent == null) {
                            break;
                        }
                        let targetDimension = parent.mVerticalRun!.mDimension;
                        this.mDimension.mTargets.push(targetDimension);
                        targetDimension.mDependencies.push(this.mDimension);
                        this.mDimension.delegateToWidgetRun = true;
                        this.mDimension.mDependencies.push(this.start);
                        this.mDimension.mDependencies.push(this.end);
                    }
                        break;
                    case ConstraintWidget.MATCH_CONSTRAINT_SPREAD: {
                        // the work is done in the update()
                    }
                        break;
                    default:
                        break;
                }
            } else {
                this.mDimension.addDependency(this);
            }
            if (this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_TOP].mTarget != null
                && this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_BOTTOM].mTarget
                != null) { // <-s-d-e->
                if (this.mWidget.isInVerticalChain()) {
                    this.start.mMargin = this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_TOP].getMargin();
                    this.end.mMargin = -this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_BOTTOM].getMargin();
                } else {
                    let startTarget = this.getTarget(this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_TOP]);
                    let endTarget =
                        this.getTarget(this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_BOTTOM]);
                    if (false) {
                        if (startTarget != null) {
                            this.addTarget(this.start, startTarget!, this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_TOP].getMargin());
                        }
                        if (endTarget != null) {
                            this.addTarget(this.end, endTarget!,
                                -this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_BOTTOM]
                                    .getMargin());
                        }
                    } else {
                        if (startTarget != null) {
                            startTarget.addDependency(this);
                        }
                        if (endTarget != null) {
                            endTarget.addDependency(this);
                        }
                    }
                    this.mRunType = RunType.CENTER;
                }
                if (this.mWidget.hasBaseline()) {
                    this.addTargetWithDependency(this.baseline, this.start, 1, this.mBaselineDimension!);
                }
            } else if (this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_TOP].mTarget
                != null) { // <-s<-d<-e
                let target =
                    this.getTarget(this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_TOP]);
                if (target != null) {
                    this.addTarget(this.start, target,
                        this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_TOP].getMargin());
                    this.addTargetWithDependency(this.end, this.start, 1, this.mDimension);
                    if (this.mWidget.hasBaseline()) {
                        this.addTargetWithDependency(this.baseline, this.start, 1, this.mBaselineDimension!);
                    }
                    if (this.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT) {
                        if (this.mWidget.getDimensionRatio() > 0) {
                            if (this.mWidget.mHorizontalRun!.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT) {
                                this.mWidget.mHorizontalRun!.mDimension.mDependencies.push(this.mDimension);
                                this.mDimension.mTargets.push(this.mWidget.mHorizontalRun!.mDimension);
                                this.mDimension.updateDelegate = this;
                            }
                        }
                    }
                }
            } else if (this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_BOTTOM].mTarget
                != null) {   //   s->d->e->
                let target =
                    this.getTarget(this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_BOTTOM]);
                if (target != null) {
                    this.addTarget(this.end, target,
                        -this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_BOTTOM].getMargin());
                    this.addTargetWithDependency(this.start, this.end, -1, this.mDimension);
                    if (this.mWidget.hasBaseline()) {
                        this.addTargetWithDependency(this.baseline, this.start, 1, this.mBaselineDimension!);
                    }
                }
            } else if (this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_BASELINE].mTarget != null) {
                let target =
                    this.getTarget(this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_BASELINE]);
                if (target != null) {
                    this.addTarget(this.baseline, target, 0);
                    this.addTargetWithDependency(this.start, this.baseline, -1, this.mBaselineDimension!);
                    this.addTargetWithDependency(this.end, this.start, 1, this.mDimension);
                }
            } else {
                // no connections, nothing to do.
                //if (!(mWidget instanceof Helper) && this.mWidget.getParent() != null) {
                if (!(Interfaces.instanceOfHelper(this.mWidget)) && this.mWidget.getParent() != null) {
                    let top = this.mWidget.getParent()!.mVerticalRun!.start;
                    this.addTarget(this.start, top, this.mWidget.getY());
                    this.addTargetWithDependency(this.end, this.start, 1, this.mDimension);
                    if (this.mWidget.hasBaseline()) {
                        this.addTargetWithDependency(this.baseline, this.start, 1, this.mBaselineDimension!);
                    }
                    if (this.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT) {
                        if (this.mWidget.getDimensionRatio() > 0) {
                            if (this.mWidget.mHorizontalRun!.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT) {
                                this.mWidget.mHorizontalRun!.mDimension.mDependencies.push(this.mDimension);
                                this.mDimension.mTargets.push(this.mWidget.mHorizontalRun!.mDimension);
                                this.mDimension.updateDelegate = this;
                            }
                        }
                    }
                }
            }

            // if dimension has no dependency, mark it as ready to solve
            if (this.mDimension.mTargets.length == 0) {
                this.mDimension.readyToSolve = true;
            }
        }
    }

    update(dependency: Dependency) {
        switch (this.mRunType) {
            case RunType.START: {
                this.updateRunStart(dependency);
            }
                break;
            case RunType.END: {
                this.updateRunEnd(dependency);
            }
                break;
            case RunType.CENTER: {
                this.updateRunCenter(dependency, this.mWidget.mTop, this.mWidget.mBottom, ConstraintWidget.VERTICAL);
                return;
            }
            default:
                break;
        }
        if (VerticalWidgetRun.FORCE_USE || dependency == this.mDimension) {
            if (this.mDimension.readyToSolve && !this.mDimension.resolved) {
                if (this.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT) {
                    switch (this.mWidget.mMatchConstraintDefaultHeight) {
                        case ConstraintWidget.MATCH_CONSTRAINT_RATIO: {
                            if (this.mWidget.mHorizontalRun!.mDimension.resolved) {
                                let size = 0;
                                let ratioSide = this.mWidget.getDimensionRatioSide();
                                switch (ratioSide) {
                                    case ConstraintWidget.HORIZONTAL: {
                                        size = Math.round(0.5 + this.mWidget.mHorizontalRun!.mDimension.value * this.mWidget.getDimensionRatio());
                                    }
                                        break;
                                    case ConstraintWidget.VERTICAL: {
                                        size = Math.round(0.5 + this.mWidget.mHorizontalRun!.mDimension.value / this.mWidget.getDimensionRatio());
                                    }
                                        break;
                                    case ConstraintWidget.UNKNOWN: {
                                        size = Math.round(0.5 + this.mWidget.mHorizontalRun!.mDimension.value / this.mWidget.getDimensionRatio());
                                    }
                                        break;
                                    default:
                                        break;
                                }
                                this.mDimension.resolve(size);
                            }
                        }
                            break;
                        case ConstraintWidget.MATCH_CONSTRAINT_PERCENT: {
                            let parent = this.mWidget.getParent();
                            if (parent != null) {
                                if (parent.mVerticalRun!.mDimension.resolved) {
                                    let percent = this.mWidget.mMatchConstraintPercentHeight;
                                    let targetDimensionValue = parent.mVerticalRun!.mDimension.value;
                                    let size = Math.round(0.5 + targetDimensionValue * percent);
                                    this.mDimension.resolve(size);
                                }
                            }
                        }
                            break;
                        default:
                            break;
                    }
                }
            }
        }

        if (!(this.start.readyToSolve && this.end.readyToSolve)) {
            return;
        }

        if (this.start.resolved && this.end.resolved && this.mDimension.resolved) {
            return;
        }
        if (!this.mDimension.resolved
            && this.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT
            && this.mWidget.mMatchConstraintDefaultWidth == ConstraintWidget.MATCH_CONSTRAINT_SPREAD
            && !this.mWidget.isInVerticalChain()) {

            let startTarget = this.start.mTargets[0]
            let endTarget = this.end.mTargets[0]
            let startPos = startTarget.value + this.start.mMargin;
            let endPos = endTarget.value + this.end.mMargin;

            let distance = endPos - startPos;
            this.start.resolve(startPos);
            this.end.resolve(endPos);
            this.mDimension.resolve(distance);
            return;
        }
        if (!this.mDimension.resolved
            && this.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT
            && this.matchConstraintsType == ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
            if (this.start.mTargets.length > 0 && this.end.mTargets.length > 0) {
                let startTarget = this.start.mTargets[0]
                let endTarget = this.end.mTargets[0]
                let startPos = startTarget.value + this.start.mMargin;
                let endPos = endTarget.value + this.end.mMargin;
                let availableSpace = endPos - startPos;
                let value = Math.min(availableSpace, this.mDimension.wrapValue);
                let max = this.mWidget.mMatchConstraintMaxWidth;
                let min = this.mWidget.mMatchConstraintMinWidth;
                value = Math.max(min, value);
                if (max > 0) {
                    value = Math.min(max, value);
                }
                this.mDimension.resolve(value);
            }
        }

        if (!this.mDimension.resolved) {
            return;
        }
        let startTarget = this.start.mTargets[0]
        let endTarget = this.end.mTargets[0]
        let startPos = startTarget.value + this.start.mMargin;
        let endPos = endTarget.value + this.end.mMargin;
        let bias = this.mWidget.getHorizontalBiasPercent();
        if (startTarget == endTarget) {
            startPos = startTarget.value;
            endPos = endTarget.value;
            // TODO: this might be a nice feature to support, but I guess for now let's stay
            // compatible with 1.1
            bias = 0.5
        }
        let distance = (endPos - startPos - this.mDimension.value);
        this.start.resolve(Math.round(0.5 + startPos + distance * bias));
        this.end.resolve(this.start.value + this.mDimension.value);
    }

    applyToWidget() {
        if (this.start.resolved) {
            this.mWidget.setY(this.start.value)
        }
    }
}