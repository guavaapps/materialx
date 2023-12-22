import {RunType, WidgetRun} from "./WidgetRun";
import {ConstraintWidget, DimensionBehaviour} from "./ConstraintWidget";
import {DependencyNodeType} from "./DependencyNode";
import {ConstraintAnchorType} from "./ConstraintAnchor";
import {Interfaces} from "./utils";
import {Dependency} from "./Dependency";

export class HorizontalWidgetRun extends WidgetRun {
    private static sTempDimensions: number[] = new Array(2)

    constructor(widget: ConstraintWidget) {
        super(widget);

        this.start.mType = DependencyNodeType.LEFT
        this.end.mType = DependencyNodeType.RIGHT
        this.orientation = ConstraintWidget.HORIZONTAL
    }

    toString() {
        return "HorizontalRun " + this.mWidget.getDebugName();
    }

    clear() {
        this.mRunGroup = null;
        this.start.clear();
        this.end.clear();
        this.mDimension.clear();
        this.mResolved = false;
    }

    reset() {
        this.mResolved = false;
        this.start.clear();
        this.start.resolved = false;
        this.end.clear();
        this.end.resolved = false;
        this.mDimension.resolved = false;
    }

    supportsWrapComputation(): boolean {
        if (super.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT) {
            if (super.mWidget.mMatchConstraintDefaultWidth == ConstraintWidget.MATCH_CONSTRAINT_SPREAD) {
                return true;
            }
            return false;
        }
        return true;
    }

    apply() {
        if (this.mWidget.measured) {
            this.mDimension.resolve(this.mWidget.getWidth());
        }
        if (!this.mDimension.resolved) {
            super.mDimensionBehavior = this.mWidget.getHorizontalDimensionBehaviour();
            if (super.mDimensionBehavior != DimensionBehaviour.MATCH_CONSTRAINT) {
                if (this.mDimensionBehavior == DimensionBehaviour.MATCH_PARENT) {
                    let parent = this.mWidget.getParent();
                    if (parent != null
                        && (parent.getHorizontalDimensionBehaviour() == DimensionBehaviour.FIXED
                            || parent.getHorizontalDimensionBehaviour() == DimensionBehaviour.MATCH_PARENT)) {
                        let resolvedDimension = parent.getWidth()
                            - this.mWidget.mLeft.getMargin() - this.mWidget.mRight.getMargin();
                        this.addTarget(this.start, parent.mHorizontalRun!.start, this.mWidget.mLeft.getMargin());
                        this.addTarget(this.end, parent.mHorizontalRun!.end, -this.mWidget.mRight.getMargin());
                        this.mDimension.resolve(resolvedDimension);
                        return;
                    }
                }
                if (this.mDimensionBehavior == DimensionBehaviour.FIXED) {
                    this.mDimension.resolve(this.mWidget.getWidth());
                }
            }
        } else {
            if (this.mDimensionBehavior == DimensionBehaviour.MATCH_PARENT) {
                let parent = this.mWidget.getParent();
                if (parent != null
                    && (parent.getHorizontalDimensionBehaviour() == DimensionBehaviour.FIXED
                        || parent.getHorizontalDimensionBehaviour() == DimensionBehaviour.MATCH_PARENT)) {
                    this.addTarget(this.start, parent.mHorizontalRun!.start, this.mWidget.mLeft.getMargin());
                    this.addTarget(this.end, parent.mHorizontalRun!.end, -this.mWidget.mRight.getMargin());
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
            if (this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_LEFT].mTarget != null
                && this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_RIGHT].mTarget
                != null) { // <-s-e->
                if (this.mWidget.isInHorizontalChain()) {
                    this.start.mMargin = this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_LEFT].getMargin();
                    this.end.mMargin = -this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_RIGHT].getMargin();
                } else {
                    let startTarget = this.getTarget(this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_LEFT]);
                    if (startTarget != null) {
                        this.addTarget(this.start, startTarget, this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_LEFT].getMargin());
                    }
                    let endTarget = this.getTarget(this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_RIGHT]);
                    if (endTarget != null) {
                        this.addTarget(this.end, endTarget,
                            -this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_RIGHT].getMargin());
                    }
                    this.start.delegateToWidgetRun = true;
                    this.end.delegateToWidgetRun = true;
                }
            } else if (this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_LEFT].mTarget
                != null) { // <-s-e
                let target = this.getTarget(this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_LEFT]);
                if (target != null) {
                    this.addTarget(this.start, target, this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_LEFT].getMargin());
                    this.addTarget(this.end, this.start, this.mDimension.value);
                }
            } else if (this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_RIGHT].mTarget
                != null) {   //   s-e->
                let target = this.getTarget(this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_RIGHT]);
                if (target != null) {
                    this.addTarget(this.end, target, -this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_RIGHT].getMargin());
                    this.addTarget(this.start, this.end, -this.mDimension.value);
                }
            } else {
                // no connections, nothing to do.
                // if (!(this.mWidget instanceof Helper) && this.mWidget.getParent() != null
                //     && this.mWidget.getAnchor(ConstraintAnchorType.CENTER)!.mTarget == null) {
                if (!(Interfaces.instanceOfHelper(this.mWidget)) && this.mWidget.getParent() != null
                    && this.mWidget.getAnchor(ConstraintAnchorType.CENTER)!.mTarget == null) {
                    let left = this.mWidget.getParent()!.mHorizontalRun!.start;
                    this.addTarget(this.start, left, this.mWidget.getX());
                    this.addTarget(this.end, this.start, this.mDimension.value);
                }
            }
        } else {
            if (this.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT) {
                switch (this.mWidget.mMatchConstraintDefaultWidth) {
                    case ConstraintWidget.MATCH_CONSTRAINT_RATIO: {
                        if (this.mWidget.mMatchConstraintDefaultHeight == ConstraintWidget.MATCH_CONSTRAINT_RATIO
                        ) {
                            // need to look into both side
                            this.start.updateDelegate = this;
                            this.end.updateDelegate = this;
                            this.mWidget.mVerticalRun!.start.updateDelegate = this;
                            this.mWidget.mVerticalRun!.end.updateDelegate = this;
                            this.mDimension.updateDelegate = this;

                            if (this.mWidget.isInVerticalChain()) {
                                this.mDimension.mTargets.push(this.mWidget.mVerticalRun!.mDimension);
                                this.mWidget.mVerticalRun!.mDimension.mDependencies.push(this.mDimension);
                                this.mWidget.mVerticalRun!.mDimension.updateDelegate = this;
                                this.mDimension.mTargets.push(this.mWidget.mVerticalRun!.start);
                                this.mDimension.mTargets.push(this.mWidget.mVerticalRun!.end);
                                this.mWidget.mVerticalRun!.start.mDependencies.push(this.mDimension);
                                this.mWidget.mVerticalRun!.end.mDependencies.push(this.mDimension);
                            } else if (this.mWidget.isInHorizontalChain()) {
                                this.mWidget.mVerticalRun!.mDimension.mTargets.push(this.mDimension);
                                this.mDimension.mDependencies.push(this.mWidget.mVerticalRun!.mDimension);
                            } else {
                                this.mWidget.mVerticalRun!.mDimension.mTargets.push(this.mDimension);
                            }
                            break;
                        }
                        // we have a ratio, but we depend on the other side computation
                        let targetDimension = this.mWidget.mVerticalRun!.mDimension;
                        this.mDimension.mTargets.push(targetDimension);
                        targetDimension.mDependencies.push(this.mDimension);
                        this.mWidget.mVerticalRun!.start.mDependencies.push(this.mDimension);
                        this.mWidget.mVerticalRun!.end.mDependencies.push(this.mDimension);
                        this.mDimension.delegateToWidgetRun = true;
                        this.mDimension.mDependencies.push(this.start);
                        this.mDimension.mDependencies.push(this.end);
                        this.start.mTargets.push(this.mDimension);
                        this.end.mTargets.push(this.mDimension);
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
            }
            if (this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_LEFT].mTarget != null
                && this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_RIGHT].mTarget
                != null) { // <-s-d-e->

                if (this.mWidget.isInHorizontalChain()) {
                    this.start.mMargin = this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_LEFT].getMargin();
                    this.end.mMargin = -this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_RIGHT].getMargin();
                } else {
                    let startTarget = this.getTarget(this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_LEFT])!
                    let endTarget = this.getTarget(this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_RIGHT])!
                    if (false) {
                        if (startTarget != null) {
                            this.addTarget(this.start, startTarget, this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_LEFT].getMargin());
                        }
                        if (endTarget != null) {
                            this.addTarget(this.end, endTarget,
                                -this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_RIGHT]
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
            } else if (this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_LEFT].mTarget
                != null) { // <-s<-d<-e
                let target =
                    this.getTarget(this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_LEFT]);
                if (target != null) {
                    this.addTarget(this.start, target,
                        this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_LEFT].getMargin());
                    this.addTargetWithDependency(this.end, this.start, 1, this.mDimension);
                }
            } else if (this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_RIGHT].mTarget
                != null) {   //   s->d->e->
                let target =
                    this.getTarget(this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_RIGHT]);
                if (target != null) {
                    this.addTarget(this.end, target,
                        -this.mWidget.mListAnchors[ConstraintWidget.ANCHOR_RIGHT].getMargin());
                    this.addTargetWithDependency(this.start, this.end, -1, this.mDimension);
                }
            } else {
                // no connections, nothing to do.
                if (!(Interfaces.instanceOfHelper(this.mWidget)) && this.mWidget.getParent() != null) { // this.mWidget instanceof Helper
                    let left = this.mWidget.getParent()!.mHorizontalRun!.start;
                    this.addTarget(this.start, left, this.mWidget.getX())
                    this.addTargetWithDependency(this.end, this.start, 1, this.mDimension);
                }
            }
        }
    }

    computeInsetRatio(dimensions: number[], x1: number, x2: number, y1: number, y2: number, ratio: number, side: number) {
        let dx = x2 - x1;
        let dy = y2 - y1;

        switch (side) {
            case ConstraintWidget.UNKNOWN: {
                let candidateX1 = Math.round(0.5 + dy * ratio);
                let candidateY1 = dy;
                let candidateX2 = dx;
                let candidateY2 = Math.round(0.5 + dx / ratio);
                if (candidateX1 <= dx && candidateY1 <= dy) {
                    dimensions[ConstraintWidget.HORIZONTAL] = candidateX1;
                    dimensions[ConstraintWidget.VERTICAL] = candidateY1;
                } else if (candidateX2 <= dx && candidateY2 <= dy) {
                    dimensions[ConstraintWidget.HORIZONTAL] = candidateX2;
                    dimensions[ConstraintWidget.VERTICAL] = candidateY2;
                }
            }
                break;
            case ConstraintWidget.HORIZONTAL: {
                let horizontalSide = Math.round(0.5 + dy * ratio);
                dimensions[ConstraintWidget.HORIZONTAL] = horizontalSide;
                dimensions[ConstraintWidget.VERTICAL] = dy;
            }
                break;
            case ConstraintWidget.VERTICAL: {
                let verticalSide = Math.round(0.5 + dx * ratio);
                dimensions[ConstraintWidget.HORIZONTAL] = dx;
                dimensions[ConstraintWidget.VERTICAL] = verticalSide;
            }
                break;
            default:
                break;
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
                this.updateRunCenter(dependency, this.mWidget.mLeft, this.mWidget.mRight, ConstraintWidget.HORIZONTAL);
                return;
            }
            default:
                break;
        }
        if (!this.mDimension.resolved) {
            if (this.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT) {
                switch (this.mWidget.mMatchConstraintDefaultWidth) {
                    case ConstraintWidget.MATCH_CONSTRAINT_RATIO: {
                        if (this.mWidget.mMatchConstraintDefaultHeight == ConstraintWidget.MATCH_CONSTRAINT_SPREAD
                            || this.mWidget.mMatchConstraintDefaultHeight
                            == ConstraintWidget.MATCH_CONSTRAINT_RATIO) {
                            let secondStart = this.mWidget.mVerticalRun!.start;
                            let secondEnd = this.mWidget.mVerticalRun!.end;
                            let s1 = this.mWidget.mLeft.mTarget != null;
                            let s2 = this.mWidget.mTop.mTarget != null;
                            let e1 = this.mWidget.mRight.mTarget != null;
                            let e2 = this.mWidget.mBottom.mTarget != null;

                            let definedSide = this.mWidget.getDimensionRatioSide();

                            if (s1 && s2 && e1 && e2) {
                                let ratio = this.mWidget.getDimensionRatio();
                                if (secondStart.resolved && secondEnd.resolved) {
                                    if (!(this.start.readyToSolve && this.end.readyToSolve)) {
                                        return;
                                    }
                                    let x1 = this.start.mTargets[0].value + this.start.mMargin;
                                    let x2 = this.end.mTargets[0].value - this.end.mMargin;
                                    let y1 = secondStart.value + secondStart.mMargin;
                                    let y2 = secondEnd.value - secondEnd.mMargin;
                                    this.computeInsetRatio(HorizontalWidgetRun.sTempDimensions,
                                        x1, x2, y1, y2, ratio, definedSide);
                                    this.mDimension.resolve(HorizontalWidgetRun.sTempDimensions[ConstraintWidget.HORIZONTAL]);
                                    this.mWidget.mVerticalRun!.mDimension
                                        .resolve(HorizontalWidgetRun.sTempDimensions[ConstraintWidget.VERTICAL]);
                                    return;
                                }
                                if (this.start.resolved && this.end.resolved) {
                                    if (!(secondStart.readyToSolve && secondEnd.readyToSolve)) {
                                        return;
                                    }
                                    let x1 = this.start.value + this.start.mMargin;
                                    let x2 = this.end.value - this.end.mMargin;
                                    let y1 = secondStart.mTargets[0].value
                                        + secondStart.mMargin;
                                    let y2 = secondEnd.mTargets[0].value - secondEnd.mMargin;
                                    this.computeInsetRatio(HorizontalWidgetRun.sTempDimensions,
                                        x1, x2, y1, y2, ratio, definedSide);
                                    this.mDimension.resolve(HorizontalWidgetRun.sTempDimensions[ConstraintWidget.HORIZONTAL]);
                                    this.mWidget.mVerticalRun!.mDimension
                                        .resolve(HorizontalWidgetRun.sTempDimensions[ConstraintWidget.VERTICAL]);
                                }
                                if (!(this.start.readyToSolve && this.end.readyToSolve
                                    && secondStart.readyToSolve
                                    && secondEnd.readyToSolve)) {
                                    return;
                                }
                                let x1 = this.start.mTargets[0].value + this.start.mMargin;
                                let x2 = this.end.mTargets[0].value - this.end.mMargin;
                                let y1 = secondStart.mTargets[0].value + secondStart.mMargin;
                                let y2 = secondEnd.mTargets[0].value - secondEnd.mMargin;
                                this.computeInsetRatio(HorizontalWidgetRun.sTempDimensions,
                                    x1, x2, y1, y2, ratio, definedSide);
                                this.mDimension.resolve(HorizontalWidgetRun.sTempDimensions[ConstraintWidget.HORIZONTAL]);
                                this.mWidget.mVerticalRun!.mDimension.resolve(HorizontalWidgetRun.sTempDimensions[ConstraintWidget.VERTICAL]);
                            } else if (s1 && e1) {
                                if (!(this.start.readyToSolve && this.end.readyToSolve)) {
                                    return;
                                }
                                let ratio = this.mWidget.getDimensionRatio();
                                let x1 = this.start.mTargets[0].value + this.start.mMargin;
                                let x2 = this.end.mTargets[0].value - this.end.mMargin;
                                switch (definedSide) {
                                    case ConstraintWidget.UNKNOWN:
                                    case ConstraintWidget.HORIZONTAL: {
                                        let dx = x2 - x1;
                                        let ldx = this.getLimitedDimension(dx, ConstraintWidget.HORIZONTAL);
                                        let dy = Math.round(0.5 + ldx * ratio);
                                        let ldy = this.getLimitedDimension(dy, ConstraintWidget.VERTICAL);
                                        if (dy != ldy) {
                                            ldx = Math.round(0.5 + ldy / ratio);
                                        }
                                        this.mDimension.resolve(ldx);
                                        this.mWidget.mVerticalRun!.mDimension.resolve(ldy);
                                    }
                                        break;
                                    case ConstraintWidget.VERTICAL: {
                                        let dx = x2 - x1;
                                        let ldx = this.getLimitedDimension(dx, ConstraintWidget.HORIZONTAL);
                                        let dy = Math.round(0.5 + ldx / ratio);
                                        let ldy = this.getLimitedDimension(dy, ConstraintWidget.VERTICAL);
                                        if (dy != ldy) {
                                            ldx = Math.round(0.5 + ldy * ratio);
                                        }
                                        this.mDimension.resolve(ldx);
                                        this.mWidget.mVerticalRun!.mDimension.resolve(ldy);
                                    }
                                        break;
                                    default:
                                        break;
                                }
                            } else if (s2 && e2) {
                                if (!(secondStart.readyToSolve && secondEnd.readyToSolve)) {
                                    return;
                                }
                                let ratio = this.mWidget.getDimensionRatio();
                                let y1 = secondStart.mTargets[0].value + secondStart.mMargin;
                                let y2 = secondEnd.mTargets[0].value - secondEnd.mMargin;

                                switch (definedSide) {
                                    case ConstraintWidget.UNKNOWN:
                                    case ConstraintWidget.VERTICAL: {
                                        let dy = y2 - y1;
                                        let ldy = this.getLimitedDimension(dy, ConstraintWidget.VERTICAL);
                                        let dx = Math.round(0.5 + ldy / ratio);
                                        let ldx = this.getLimitedDimension(dx, ConstraintWidget.HORIZONTAL);
                                        if (dx != ldx) {
                                            ldy = Math.round(0.5 + ldx * ratio);
                                        }
                                       this. mDimension.resolve(ldx);
                                        this.mWidget.mVerticalRun!.mDimension.resolve(ldy);
                                    }
                                        break;
                                    case ConstraintWidget.HORIZONTAL: {
                                        let dy = y2 - y1;
                                        let ldy = this.getLimitedDimension(dy, ConstraintWidget.VERTICAL);
                                        let dx = Math.round(0.5 + ldy * ratio);
                                        let ldx = this.getLimitedDimension(dx, ConstraintWidget.HORIZONTAL);
                                        if (dx != ldx) {
                                            ldy = Math.round(0.5 + ldx / ratio);
                                        }
                                        this.mDimension.resolve(ldx);
                                        this.mWidget.mVerticalRun!.mDimension.resolve(ldy);
                                    }
                                        break;
                                    default:
                                        break;
                                }
                            }
                        } else {
                            let size = 0;
                            let ratioSide = this.mWidget.getDimensionRatioSide();
                            switch (ratioSide) {
                                case ConstraintWidget.HORIZONTAL: {
                                    size = Math.round(0.5 + this.mWidget.mVerticalRun!.mDimension.value / this.mWidget.getDimensionRatio());
                                }
                                    break;
                                case ConstraintWidget.VERTICAL: {
                                    size = Math.round(0.5 + this.mWidget.mVerticalRun!.mDimension.value * this.mWidget.getDimensionRatio());
                                }
                                    break;
                                case ConstraintWidget.UNKNOWN: {
                                    size = Math.round(0.5 + this.mWidget.mVerticalRun!.mDimension.value * this.mWidget.getDimensionRatio());
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
                            if (parent.mHorizontalRun!.mDimension.resolved) {
                                let percent = this.mWidget.mMatchConstraintPercentWidth;
                                let targetDimensionValue = parent.mHorizontalRun!.mDimension.value;
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

        if (!(this.start.readyToSolve && this.end.readyToSolve)) {
            return;
        }

        if (this.start.resolved && this.end.resolved && this.mDimension.resolved) {
            return;
        }
        if (!this.mDimension.resolved
            && this.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT
            && this.mWidget.mMatchConstraintDefaultWidth == ConstraintWidget.MATCH_CONSTRAINT_SPREAD
            && !this.mWidget.isInHorizontalChain()) {

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
            this.mWidget.setX(this.start.value)
        }
    }
}