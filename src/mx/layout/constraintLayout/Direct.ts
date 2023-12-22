import {BasicMeasure, Measure, Measurer} from "./BasicMeasure";
import {ConstraintWidgetContainer} from "./ConstraintWidgetContainer";
import {Barrier} from "./Barrier";
import {ConstraintWidget, DimensionBehaviour} from "./ConstraintWidget";
import {Guideline} from "./Guideline";
import {ConstraintAnchor, ConstraintAnchorType} from "./ConstraintAnchor";
import {LinearSystem} from "./LinearSystem";
import {ChainHead} from "./ChainHead";

export class Direct {
    private static readonly APPLY_MATCH_PARENT = false;
    private static sMeasure = new Measure();
    private static readonly EARLY_TERMINATION = true; // feature flag -- remove after release.

    private static sHcount = 0;
    private static sVcount = 0;

    static solvingPass(layout: ConstraintWidgetContainer, measurer: Measurer) {
        let horizontal = layout.getHorizontalDimensionBehaviour();
        let vertical = layout.getVerticalDimensionBehaviour();
        Direct.sHcount = 0;
        Direct.sVcount = 0;
        let time = 0;
        layout.resetFinalResolution();
        let children: ConstraintWidget[] = layout.getChildren();
        const count = children.length
        for (let i = 0; i < count; i++) {
            let child = children[i]
            child.resetFinalResolution();
        }

        let isRtl = layout.isRtl();

        if (horizontal == DimensionBehaviour.FIXED) {
            layout.setFinalHorizontal(0, layout.getWidth());
        } else {
            layout.setFinalLeft(0);
        }

        // Then let's first try to solve horizontal guidelines,
        // as they only depends on the container
        let hasGuideline = false;
        let hasBarrier = false;

        for (let i = 0; i < count; i++) {
            let child = children[i]
            if (child instanceof Guideline) {
                let guideline = child as Guideline
                if (guideline.getOrientation() == Guideline.VERTICAL) {
                    if (guideline.getRelativeBegin() != -1) {
                        guideline.setFinalValue(guideline.getRelativeBegin());
                    } else if (guideline.getRelativeEnd() != -1
                        && layout.isResolvedHorizontally()) {
                        guideline.setFinalValue(layout.getWidth() - guideline.getRelativeEnd());
                    } else if (layout.isResolvedHorizontally()) {
                        let position =
                            Math.round(0.5 + guideline.getRelativePercent() * layout.getWidth());
                        guideline.setFinalValue(position);
                    }
                    hasGuideline = true;
                }
            } else if (child instanceof Barrier) {
                let barrier = child as Barrier
                if (barrier.getOrientation() == ConstraintWidget.HORIZONTAL) {
                    hasBarrier = true;
                }
            }
        }
        if (hasGuideline) {
            for (let i = 0; i < count; i++) {
                let child = children[i]
                if (child instanceof Guideline) {
                    let guideline = child as Guideline
                    if (guideline.getOrientation() == Guideline.VERTICAL) {
                        this.horizontalSolvingPass(0, guideline, measurer!, isRtl);
                    }
                }
            }
        }

        this.horizontalSolvingPass(0, layout, measurer!, isRtl);

        // Finally, let's go through barriers, as they depends on widgets that may have been solved.
        if (hasBarrier) {
            for (let i = 0; i < count; i++) {
                let child = children[i]
                if (child instanceof Barrier) {
                    let barrier = child as Barrier
                    if (barrier.getOrientation() == ConstraintWidget.HORIZONTAL) {
                        this.solveBarrier(0, barrier, measurer!, ConstraintWidget.HORIZONTAL, isRtl);
                    }
                }
            }
        }

        if (vertical == DimensionBehaviour.FIXED) {
            layout.setFinalVertical(0, layout.getHeight());
        } else {
            layout.setFinalTop(0);
        }

        // Same thing as above -- let's start with guidelines...
        hasGuideline = false;
        hasBarrier = false;
        for (let i = 0; i < count; i++) {
            let child = children[i]
            if (child instanceof Guideline) {
                let guideline = child as Guideline
                if (guideline.getOrientation() == Guideline.HORIZONTAL) {
                    if (guideline.getRelativeBegin() != -1) {
                        guideline.setFinalValue(guideline.getRelativeBegin());
                    } else if (guideline.getRelativeEnd() != -1 && layout.isResolvedVertically()) {
                        guideline.setFinalValue(layout.getHeight() - guideline.getRelativeEnd());
                    } else if (layout.isResolvedVertically()) {
                        let position =
                            Math.round(0.5 + guideline.getRelativePercent() * layout.getHeight());
                        guideline.setFinalValue(position);
                    }
                    hasGuideline = true;
                }
            } else if (child instanceof Barrier) {

                let barrier = child as Barrier
                if (barrier.getOrientation() == ConstraintWidget.VERTICAL) {
                    hasBarrier = true;
                }
            }
        }
        if (hasGuideline) {
            for (let i = 0; i < count; i++) {
                let child = children[i]
                if (child instanceof Guideline) {
                    let guideline = child as Guideline
                    if (guideline.getOrientation() == Guideline.HORIZONTAL) {
                        this.verticalSolvingPass(1, guideline, measurer!);
                    }
                }
            }
        }

        // ...then solve the vertical dependencies...
        this.verticalSolvingPass(0, layout, measurer!);

        if (hasBarrier) {
            for (let i = 0; i < count; i++) {
                let child = children[i]
                if (child instanceof Barrier) {
                    let barrier = child as Barrier
                    if (barrier.getOrientation() == ConstraintWidget.VERTICAL) {
                        this.solveBarrier(0, barrier, measurer!, ConstraintWidget.VERTICAL, isRtl);
                    }
                }
            }
        }

        for (let i = 0; i < count; i++) {
            let child = children[i]
            if (child.isMeasureRequested() && this.canMeasure(0, child)) {
                ConstraintWidgetContainer.measure(0, child, measurer, Direct.sMeasure, Measure.SELF_DIMENSIONS);
                if (child instanceof Guideline) {
                    if ((child as Guideline).getOrientation() == Guideline.HORIZONTAL) {
                        this.verticalSolvingPass(0, child, measurer);
                    } else {
                        this.horizontalSolvingPass(0, child, measurer, isRtl);
                    }
                } else {
                    this.horizontalSolvingPass(0, child, measurer, isRtl);
                    this.verticalSolvingPass(0, child, measurer);
                }
            }
        }
    }

    static solveBarrier(level: number, barrier: Barrier, measurer: Measurer, orientation: number, isRtl: boolean) {
        if (barrier.allSolved()) {
            if (orientation == ConstraintWidget.HORIZONTAL) {
                this.horizontalSolvingPass(level + 1, barrier, measurer, isRtl);
            } else {
                this.verticalSolvingPass(level + 1, barrier, measurer);
            }
        }
    }

    static horizontalSolvingPass(level: number, layout: ConstraintWidget, measurer: Measurer, isRtl: boolean) {
        if (Direct.EARLY_TERMINATION && layout.isHorizontalSolvingPassDone()) {
            return;
        }
        Direct.sHcount++;

        if (!(layout instanceof ConstraintWidgetContainer) && layout.isMeasureRequested()
            && this.canMeasure(level + 1, layout)) {
            let measure = new Measure();
            ConstraintWidgetContainer.measure(level + 1, layout, measurer, measure, Measure.SELF_DIMENSIONS);
        }

        let left = layout.getAnchor(ConstraintAnchorType.LEFT)!
        let right = layout.getAnchor(ConstraintAnchorType.RIGHT)!
        let l = left.getFinalValue();
        let r = right.getFinalValue();

        if (left.getDependents() != null && left.hasFinalValue()) {
            for (let first of left.getDependents()!) {
                let widget = first.mOwner;
                let x1 = 0;
                let x2 = 0;
                let canMeasure = this.canMeasure(level + 1, widget);
                if (widget.isMeasureRequested() && canMeasure) {
                    let measure = new Measure();
                    ConstraintWidgetContainer.measure(level + 1, widget, measurer, measure, Measure.SELF_DIMENSIONS);
                }

                let bothConnected = (first == widget.mLeft && widget.mRight.mTarget != null
                        && widget.mRight.mTarget.hasFinalValue())
                    || (first == widget.mRight && widget.mLeft.mTarget != null
                        && widget.mLeft.mTarget.hasFinalValue());
                if (widget.getHorizontalDimensionBehaviour()
                    != DimensionBehaviour.MATCH_CONSTRAINT || canMeasure) {
                    if (widget.isMeasureRequested()) {
                        // Widget needs to be measured
                        continue;
                    }
                    if (first == widget.mLeft && widget.mRight.mTarget == null) {
                        x1 = l + widget.mLeft.getMargin();
                        x2 = x1 + widget.getWidth();
                        widget.setFinalHorizontal(x1, x2);
                        this.horizontalSolvingPass(level + 1, widget, measurer, isRtl);
                    } else if (first == widget.mRight && widget.mLeft.mTarget == null) {
                        x2 = l - widget.mRight.getMargin();
                        x1 = x2 - widget.getWidth();
                        widget.setFinalHorizontal(x1, x2);
                        this.horizontalSolvingPass(level + 1, widget, measurer, isRtl);
                    } else if (bothConnected && !widget.isInHorizontalChain()) {
                        this.solveHorizontalCenterConstraints(level + 1, measurer, widget, isRtl);
                    } else if (Direct.APPLY_MATCH_PARENT && widget.getHorizontalDimensionBehaviour()
                        == DimensionBehaviour.MATCH_PARENT) {
                        widget.setFinalHorizontal(0, widget.getWidth());
                        this.horizontalSolvingPass(level + 1, widget, measurer, isRtl);
                    }
                } else if (widget.getHorizontalDimensionBehaviour()
                    == DimensionBehaviour.MATCH_CONSTRAINT
                    && widget.mMatchConstraintMaxWidth >= 0
                    && widget.mMatchConstraintMinWidth >= 0
                    && (widget.getVisibility() == ConstraintWidget.GONE
                        || ((widget.mMatchConstraintDefaultWidth
                                == ConstraintWidget.MATCH_CONSTRAINT_SPREAD)
                            && widget.getDimensionRatio() == 0))
                    && !widget.isInHorizontalChain() && !widget.isInVirtualLayout()) {
                    if (bothConnected && !widget.isInHorizontalChain()) {
                        this.solveHorizontalMatchConstraint(level + 1, layout, measurer, widget, isRtl);
                    }
                }
            }
        }
        if (layout instanceof Guideline) {
            return;
        }
        if (right.getDependents() != null && right.hasFinalValue()) {
            for (let first of right.getDependents()!) {
                let widget = first.mOwner;
                let canMeasure = this.canMeasure(level + 1, widget);
                if (widget.isMeasureRequested() && canMeasure) {
                    let measure = new Measure();
                    ConstraintWidgetContainer.measure(level + 1, widget, measurer, measure, Measure.SELF_DIMENSIONS);
                }

                let x1 = 0;
                let x2 = 0;
                let bothConnected = (first == widget.mLeft && widget.mRight.mTarget != null
                        && widget.mRight.mTarget.hasFinalValue())
                    || (first == widget.mRight && widget.mLeft.mTarget != null
                        && widget.mLeft.mTarget.hasFinalValue());
                if (widget.getHorizontalDimensionBehaviour()
                    != DimensionBehaviour.MATCH_CONSTRAINT || canMeasure) {
                    if (widget.isMeasureRequested()) {
                        // Widget needs to be measured
                        continue;
                    }
                    if (first == widget.mLeft && widget.mRight.mTarget == null) {
                        x1 = r + widget.mLeft.getMargin();
                        x2 = x1 + widget.getWidth();
                        widget.setFinalHorizontal(x1, x2);
                        this.horizontalSolvingPass(level + 1, widget, measurer, isRtl);
                    } else if (first == widget.mRight && widget.mLeft.mTarget == null) {
                        x2 = r - widget.mRight.getMargin();
                        x1 = x2 - widget.getWidth();
                        widget.setFinalHorizontal(x1, x2);
                        this.horizontalSolvingPass(level + 1, widget, measurer, isRtl);
                    } else if (bothConnected && !widget.isInHorizontalChain()) {
                        this.solveHorizontalCenterConstraints(level + 1, measurer, widget, isRtl);
                    }
                } else if (widget.getHorizontalDimensionBehaviour()
                    == DimensionBehaviour.MATCH_CONSTRAINT
                    && widget.mMatchConstraintMaxWidth >= 0
                    && widget.mMatchConstraintMinWidth >= 0
                    && (widget.getVisibility() == ConstraintWidget.GONE
                        || ((widget.mMatchConstraintDefaultWidth
                                == ConstraintWidget.MATCH_CONSTRAINT_SPREAD)
                            && widget.getDimensionRatio() == 0))
                    && !widget.isInHorizontalChain() && !widget.isInVirtualLayout()) {
                    if (bothConnected && !widget.isInHorizontalChain()) {
                        this.solveHorizontalMatchConstraint(level + 1, layout, measurer, widget, isRtl);
                    }
                }
            }
        }
        layout.markHorizontalSolvingPassDone();
    }

    static verticalSolvingPass (level: number, layout: ConstraintWidget, measurer: Measurer) {
        if (Direct.EARLY_TERMINATION && layout.isVerticalSolvingPassDone()) {
            return;
        }
        Direct.sVcount++;

        if (!(layout instanceof ConstraintWidgetContainer)
            && layout.isMeasureRequested() && this.canMeasure(level + 1, layout)) {
            let measure = new Measure();
            ConstraintWidgetContainer.measure(level + 1, layout, measurer, measure, Measure.SELF_DIMENSIONS);
        }

        let top = layout.getAnchor(ConstraintAnchorType.TOP)!
        let bottom = layout.getAnchor(ConstraintAnchorType.BOTTOM)!
        let t = top.getFinalValue();
        let b = bottom.getFinalValue();

        if (top.getDependents() != null && top.hasFinalValue()) {
            for (let first of top.getDependents()!) {
                let widget = first.mOwner;
                let y1 = 0;
                let y2 = 0;
                let canMeasure = this.canMeasure(level + 1, widget);
                if (widget.isMeasureRequested() && canMeasure) {
                    let measure = new Measure();
                    ConstraintWidgetContainer.measure(level + 1, widget, measurer, measure, Measure.SELF_DIMENSIONS);
                }

                let bothConnected = (first == widget.mTop && widget.mBottom.mTarget != null
                        && widget.mBottom.mTarget.hasFinalValue())
                    || (first == widget.mBottom && widget.mTop.mTarget != null
                        && widget.mTop.mTarget.hasFinalValue());
                if (widget.getVerticalDimensionBehaviour()
                    != DimensionBehaviour.MATCH_CONSTRAINT
                    || canMeasure) {
                    if (widget.isMeasureRequested()) {
                        // Widget needs to be measured
                        continue;
                    }
                    if (first == widget.mTop && widget.mBottom.mTarget == null) {
                        y1 = t + widget.mTop.getMargin();
                        y2 = y1 + widget.getHeight();
                        widget.setFinalVertical(y1, y2);
                        this.verticalSolvingPass(level + 1, widget, measurer);
                    } else if (first == widget.mBottom && widget.mTop.mTarget == null) {
                        y2 = t - widget.mBottom.getMargin();
                        y1 = y2 - widget.getHeight();
                        widget.setFinalVertical(y1, y2);
                        this.verticalSolvingPass(level + 1, widget, measurer);
                    } else if (bothConnected && !widget.isInVerticalChain()) {
                        this.solveVerticalCenterConstraints(level + 1, measurer, widget);
                    } else if (Direct.APPLY_MATCH_PARENT && widget.getVerticalDimensionBehaviour()
                        == DimensionBehaviour.MATCH_PARENT) {
                        widget.setFinalVertical(0, widget.getHeight());
                        this.verticalSolvingPass(level + 1, widget, measurer);
                    }
                } else if (widget.getVerticalDimensionBehaviour()
                    == DimensionBehaviour.MATCH_CONSTRAINT
                    && widget.mMatchConstraintMaxHeight >= 0
                    && widget.mMatchConstraintMinHeight >= 0
                    && (widget.getVisibility() == ConstraintWidget.GONE
                        || ((widget.mMatchConstraintDefaultHeight
                                == ConstraintWidget.MATCH_CONSTRAINT_SPREAD)
                            && widget.getDimensionRatio() == 0))
                    && !widget.isInVerticalChain() && !widget.isInVirtualLayout()) {
                    if (bothConnected && !widget.isInVerticalChain()) {
                        this.solveVerticalMatchConstraint(level + 1, layout, measurer, widget);
                    }
                }
            }
        }
        if (layout instanceof Guideline) {
            return;
        }
        if (bottom.getDependents() != null && bottom.hasFinalValue()) {
            for (let first of bottom.getDependents()!) {
                let widget = first.mOwner;
                let canMeasure = this.canMeasure(level + 1, widget);
                if (widget.isMeasureRequested() && canMeasure) {
                    let measure = new Measure();
                    ConstraintWidgetContainer.measure(level + 1, widget, measurer, measure, Measure.SELF_DIMENSIONS);
                }

                let y1 = 0;
                let y2 = 0;
                let bothConnected = (first == widget.mTop && widget.mBottom.mTarget != null
                        && widget.mBottom.mTarget.hasFinalValue())
                    || (first == widget.mBottom && widget.mTop.mTarget != null
                        && widget.mTop.mTarget.hasFinalValue());
                if (widget.getVerticalDimensionBehaviour()
                    != DimensionBehaviour.MATCH_CONSTRAINT || canMeasure) {
                    if (widget.isMeasureRequested()) {
                        // Widget needs to be measured
                        continue;
                    }
                    if (first == widget.mTop && widget.mBottom.mTarget == null) {
                        y1 = b + widget.mTop.getMargin();
                        y2 = y1 + widget.getHeight();
                        widget.setFinalVertical(y1, y2);
                        this.verticalSolvingPass(level + 1, widget, measurer);
                    } else if (first == widget.mBottom && widget.mTop.mTarget == null) {
                        y2 = b - widget.mBottom.getMargin();
                        y1 = y2 - widget.getHeight();
                        widget.setFinalVertical(y1, y2);
                        this.verticalSolvingPass(level + 1, widget, measurer);
                    } else if (bothConnected && !widget.isInVerticalChain()) {
                        this.solveVerticalCenterConstraints(level + 1, measurer, widget);
                    }
                } else if (widget.getVerticalDimensionBehaviour()
                    == DimensionBehaviour.MATCH_CONSTRAINT
                    && widget.mMatchConstraintMaxHeight >= 0
                    && widget.mMatchConstraintMinHeight >= 0
                    && (widget.getVisibility() == ConstraintWidget.GONE
                        || ((widget.mMatchConstraintDefaultHeight
                                == ConstraintWidget.MATCH_CONSTRAINT_SPREAD)
                            && widget.getDimensionRatio() == 0))
                    && !widget.isInVerticalChain() && !widget.isInVirtualLayout()) {
                    if (bothConnected && !widget.isInVerticalChain()) {
                        this.solveVerticalMatchConstraint(level + 1, layout, measurer, widget);
                    }
                }
            }
        }

        let baseline = layout.getAnchor(ConstraintAnchorType.BASELINE)!
        if (baseline.getDependents() != null && baseline.hasFinalValue()) {
            let baselineValue = baseline.getFinalValue();
            for (let first of baseline.getDependents()!) {
                let widget = first.mOwner;
                let canMeasure = this.canMeasure(level + 1, widget);
                if (widget.isMeasureRequested() && canMeasure) {
                    let measure = new Measure();
                    ConstraintWidgetContainer.measure(level + 1, widget, measurer, measure, Measure.SELF_DIMENSIONS);
                }
                if (widget.getVerticalDimensionBehaviour()
                    != DimensionBehaviour.MATCH_CONSTRAINT || canMeasure) {
                    if (widget.isMeasureRequested()) {
                        // Widget needs to be measured
                        continue;
                    }
                    if (first == widget.mBaseline) {
                        widget.setFinalBaseline(baselineValue + first.getMargin());
                        this.verticalSolvingPass(level + 1, widget, measurer);
                    }
                }
            }
        }
        layout.markVerticalSolvingPassDone();
    }

    static solveHorizontalCenterConstraints (level: number, measurer: Measurer, widget: ConstraintWidget, isRtl: boolean) {
        let x1;
        let x2;
        let bias = widget.getHorizontalBiasPercent();
        let start = widget.mLeft.mTarget!.getFinalValue();
        let end = widget.mRight.mTarget!.getFinalValue();
        let s1 = start + widget.mLeft.getMargin();
        let s2 = end - widget.mRight.getMargin();
        if (start == end) {
            bias = 0.5
            s1 = start;
            s2 = end;
        }
        let width = widget.getWidth();
        let distance = s2 - s1 - width;
        if (s1 > s2) {
            distance = s1 - s2 - width;
        }
        let d1;
        if (distance > 0) {
            d1 = Math.round(0.5 + bias * distance);
        } else {
            d1 = Math.round(bias * distance);
        }
        x1 = s1 + d1;
        x2 = x1 + width;
        if (s1 > s2) {
            x1 = s1 + d1;
            x2 = x1 - width;
        }
        widget.setFinalHorizontal(x1, x2);
        this.horizontalSolvingPass(level + 1, widget, measurer, isRtl);
    }

    static solveVerticalCenterConstraints (level: number, measurer: Measurer, widget: ConstraintWidget) {
        let y1;
        let y2;
        let bias = widget.getVerticalBiasPercent();
        let start = widget.mTop.mTarget!.getFinalValue();
        let end = widget.mBottom.mTarget!.getFinalValue();
        let s1 = start + widget.mTop.getMargin();
        let s2 = end - widget.mBottom.getMargin();
        if (start == end) {
            bias = 0.5;
            s1 = start;
            s2 = end;
        }
        let height = widget.getHeight();
        let distance = s2 - s1 - height;
        if (s1 > s2) {
            distance = s1 - s2 - height;
        }
        let d1;
        if (distance > 0) {
            d1 = Math.round(0.5 + bias * distance);
        } else {
            d1 = Math.round(bias * distance);
        }
        y1 = s1 + d1;
        y2 = y1 + height;
        if (s1 > s2) {
            y1 = s1 - d1;
            y2 = y1 - height;
        }
        widget.setFinalVertical(y1, y2);
        this.verticalSolvingPass(level + 1, widget, measurer);
    }

    static solveHorizontalMatchConstraint (level: number, layout: ConstraintWidget, measurer: Measurer, widget: ConstraintWidget, isRtl: boolean) {
        let x1;
        let x2;
        let bias = widget.getHorizontalBiasPercent();
        let s1 = widget.mLeft.mTarget!.getFinalValue() + widget.mLeft.getMargin();
        let s2 = widget.mRight.mTarget!.getFinalValue() - widget.mRight.getMargin();
        if (s2 >= s1) {
            let width = widget.getWidth();
            if (widget.getVisibility() != ConstraintWidget.GONE) {
                if (widget.mMatchConstraintDefaultWidth
                    == ConstraintWidget.MATCH_CONSTRAINT_PERCENT) {
                    let parentWidth = 0;
                    if (layout instanceof ConstraintWidgetContainer) {
                        parentWidth = layout.getWidth();
                    } else {
                        parentWidth = layout.getParent()!.getWidth();
                    }
                    width = Math.round(0.5 * widget.getHorizontalBiasPercent() * parentWidth);
                } else if (widget.mMatchConstraintDefaultWidth
                    == ConstraintWidget.MATCH_CONSTRAINT_SPREAD) {
                    width = s2 - s1;
                }
                width = Math.max(widget.mMatchConstraintMinWidth, width);
                if (widget.mMatchConstraintMaxWidth > 0) {
                    width = Math.min(widget.mMatchConstraintMaxWidth, width);
                }
            }
            let distance = s2 - s1 - width;
            let d1 = Math.round(0.5 + bias * distance);
            x1 = s1 + d1;
            x2 = x1 + width;
            widget.setFinalHorizontal(x1, x2);
            this.horizontalSolvingPass(level + 1, widget, measurer, isRtl);
        }
    }

    static solveVerticalMatchConstraint (level: number, layout: ConstraintWidget, measurer: Measurer, widget: ConstraintWidget) {
        let y1;
        let y2;
        let bias = widget.getVerticalBiasPercent();
        let s1 = widget.mTop.mTarget!.getFinalValue() + widget.mTop.getMargin();
        let s2 = widget.mBottom.mTarget!.getFinalValue() - widget.mBottom.getMargin();
        if (s2 >= s1) {
            let height = widget.getHeight();
            if (widget.getVisibility() != ConstraintWidget.GONE) {
                if (widget.mMatchConstraintDefaultHeight
                    == ConstraintWidget.MATCH_CONSTRAINT_PERCENT) {
                    let parentHeight = 0;
                    if (layout instanceof ConstraintWidgetContainer) {
                        parentHeight = layout.getHeight();
                    } else {
                        parentHeight = layout.getParent()!.getHeight();
                    }
                    height = Math.round(0.5 * bias * parentHeight);
                } else if (widget.mMatchConstraintDefaultHeight
                    == ConstraintWidget.MATCH_CONSTRAINT_SPREAD) {
                    height = s2 - s1;
                }
                height = Math.max(widget.mMatchConstraintMinHeight, height);
                if (widget.mMatchConstraintMaxHeight > 0) {
                    height = Math.min(widget.mMatchConstraintMaxHeight, height);
                }
            }
            let distance = s2 - s1 - height;
            let d1 = Math.round(0.5 + bias * distance);
            y1 = s1 + d1;
            y2 = y1 + height;
            widget.setFinalVertical(y1, y2);
            this.verticalSolvingPass(level + 1, widget, measurer);
        }
    }

    static canMeasure (level: number, layout: ConstraintWidget) {
        let horizontalBehaviour =
            layout.getHorizontalDimensionBehaviour();
        let verticalBehaviour =
            layout.getVerticalDimensionBehaviour();
        let parent = layout.getParent() != null
            ? layout.getParent() as ConstraintWidgetContainer : null;
        let isParentHorizontalFixed = parent != null && parent.getHorizontalDimensionBehaviour()
            == DimensionBehaviour.FIXED;
        let isParentVerticalFixed = parent != null && parent.getVerticalDimensionBehaviour()
            == DimensionBehaviour.FIXED;
        let isHorizontalFixed = horizontalBehaviour == DimensionBehaviour.FIXED
            || layout.isResolvedHorizontally()
            || (Direct.APPLY_MATCH_PARENT && horizontalBehaviour
                == DimensionBehaviour.MATCH_PARENT && isParentHorizontalFixed)
            || horizontalBehaviour == DimensionBehaviour.WRAP_CONTENT
            || (horizontalBehaviour == DimensionBehaviour.MATCH_CONSTRAINT
                && layout.mMatchConstraintDefaultWidth
                == ConstraintWidget.MATCH_CONSTRAINT_SPREAD
                && layout.mDimensionRatio == 0
                && layout.hasDanglingDimension(ConstraintWidget.HORIZONTAL))
            || (horizontalBehaviour == DimensionBehaviour.MATCH_CONSTRAINT
                && layout.mMatchConstraintDefaultWidth == ConstraintWidget.MATCH_CONSTRAINT_WRAP
                && layout.hasResolvedTargets(ConstraintWidget.HORIZONTAL, layout.getWidth()));
        let isVerticalFixed = verticalBehaviour == DimensionBehaviour.FIXED
            || layout.isResolvedVertically()
            || (Direct.APPLY_MATCH_PARENT && verticalBehaviour
                == DimensionBehaviour.MATCH_PARENT && isParentVerticalFixed)
            || verticalBehaviour == DimensionBehaviour.WRAP_CONTENT
            || (verticalBehaviour == DimensionBehaviour.MATCH_CONSTRAINT
                && layout.mMatchConstraintDefaultHeight
                == ConstraintWidget.MATCH_CONSTRAINT_SPREAD
                && layout.mDimensionRatio == 0
                && layout.hasDanglingDimension(ConstraintWidget.VERTICAL))
            || (verticalBehaviour == DimensionBehaviour.MATCH_CONSTRAINT
                && layout.mMatchConstraintDefaultHeight == ConstraintWidget.MATCH_CONSTRAINT_WRAP
                && layout.hasResolvedTargets(ConstraintWidget.VERTICAL, layout.getHeight()));
        if (layout.mDimensionRatio > 0 && (isHorizontalFixed || isVerticalFixed)) {
            return true;
        }
        return isHorizontalFixed && isVerticalFixed;
    }

    static solveChain (container: ConstraintWidgetContainer, system: LinearSystem, orientation: number, offset: number, chainHead: ChainHead,
                isChainSpread: boolean, isChainSpreadInside: boolean, isChainPacked: boolean) {
        if (isChainPacked) {
            return false;
        }
        if (orientation == ConstraintWidget.HORIZONTAL) {
            if (!container.isResolvedHorizontally()) {
                return false;
            }
        } else {
            if (!container.isResolvedVertically()) {
                return false;
            }
        }
        let level = 0; // nested level (used for debugging)
        let isRtl = container.isRtl();

        let first = chainHead.getFirst()!
        let last = chainHead.getLast()!
        let firstVisibleWidget = chainHead.getFirstVisibleWidget();
        let lastVisibleWidget = chainHead.getLastVisibleWidget();
        let head = chainHead.getHead()!

        let widget = first;
        let next;
        let done = false;

        let begin = first.mListAnchors[offset];
        let end = last.mListAnchors[offset + 1];
        if (begin.mTarget == null || end.mTarget == null) {
            return false;
        }
        if (!begin.mTarget.hasFinalValue() || !end.mTarget.hasFinalValue()) {
            return false;
        }

        if (firstVisibleWidget == null || lastVisibleWidget == null) {
            return false;
        }

        let startPoint = begin.mTarget.getFinalValue()
            + firstVisibleWidget.mListAnchors[offset].getMargin();
        let endPoint = end.mTarget.getFinalValue()
            - lastVisibleWidget.mListAnchors[offset + 1].getMargin();

        let distance = endPoint - startPoint;
        if (distance <= 0) {
            return false;
        }
        let totalSize = 0;
        let measure = new Measure();

        let numWidgets = 0;
        let numVisibleWidgets = 0;

        while (!done) {
            let canMeasure = this.canMeasure(level + 1, widget);
            if (!canMeasure) {
                return false;
            }
            if (widget.mListDimensionBehaviors[orientation]
                == DimensionBehaviour.MATCH_CONSTRAINT) {
                return false;
            }

            if (widget.isMeasureRequested()) {
                ConstraintWidgetContainer.measure(level + 1, widget, container.getMeasurer(), measure, Measure.SELF_DIMENSIONS);
            }

            totalSize += widget.mListAnchors[offset].getMargin();
            if (orientation == ConstraintWidget.HORIZONTAL) {
                totalSize += +widget.getWidth();
            } else {
                totalSize += widget.getHeight();
            }
            totalSize += widget.mListAnchors[offset + 1].getMargin();

            numWidgets++;
            if (widget.getVisibility() != ConstraintWidget.GONE) {
                numVisibleWidgets++;
            }


            // go to the next widget
            let nextAnchor = widget.mListAnchors[offset + 1].mTarget;
            if (nextAnchor != null) {
                next = nextAnchor.mOwner;
                if (next.mListAnchors[offset].mTarget == null
                    || next.mListAnchors[offset].mTarget!.mOwner != widget) {
                    next = null;
                }
            } else {
                next = null;
            }
            if (next != null) {
                widget = next;
            } else {
                done = true;
            }
        }

        if (numVisibleWidgets == 0) {
            return false;
        }

        if (numVisibleWidgets != numWidgets) {
            return false;
        }

        if (distance < totalSize) {
            return false;
        }

        let gap = distance - totalSize;
        if (isChainSpread) {
            gap = gap / (numVisibleWidgets + 1);
        } else if (isChainSpreadInside) {
            if (numVisibleWidgets > 2) {
                gap = gap / numVisibleWidgets - 1;
            }
        }

        if (numVisibleWidgets == 1) {
            let bias;
            if (orientation == ConstraintWidget.HORIZONTAL) {
                bias = head.getHorizontalBiasPercent();
            } else {
                bias = head.getVerticalBiasPercent();
            }
            let p1 = Math.round(0.5 + startPoint + gap * bias);
            if (orientation == ConstraintWidget.HORIZONTAL) {
                firstVisibleWidget.setFinalHorizontal(p1, p1 + firstVisibleWidget.getWidth());
            } else {
                firstVisibleWidget.setFinalVertical(p1, p1 + firstVisibleWidget.getHeight());
            }
            Direct.horizontalSolvingPass(level + 1,
                firstVisibleWidget, container.getMeasurer()!, isRtl);
            return true;
        }

        if (isChainSpread) {
            done = false;

            let current = startPoint + gap;
            widget = first;
            while (!done) {
                if (widget.getVisibility() == ConstraintWidget.GONE) {
                    if (orientation == ConstraintWidget.HORIZONTAL) {
                        widget.setFinalHorizontal(current, current);
                        Direct.horizontalSolvingPass(level + 1,
                            widget, container.getMeasurer()!, isRtl);
                    } else {
                        widget.setFinalVertical(current, current);
                        Direct.verticalSolvingPass(level + 1, widget, container.getMeasurer()!);
                    }
                } else {
                    current += widget.mListAnchors[offset].getMargin();
                    if (orientation == ConstraintWidget.HORIZONTAL) {
                        widget.setFinalHorizontal(current, current + widget.getWidth());
                        Direct.horizontalSolvingPass(level + 1,
                            widget, container.getMeasurer()!, isRtl);
                        current += widget.getWidth();
                    } else {
                        widget.setFinalVertical(current, current + widget.getHeight());
                        Direct.verticalSolvingPass(level + 1, widget, container.getMeasurer()!);
                        current += widget.getHeight();
                    }
                    current += widget.mListAnchors[offset + 1].getMargin();
                    current += gap;
                }

                widget.addToSolver(system, false);

                // go to the next widget
                let nextAnchor = widget.mListAnchors[offset + 1].mTarget;
                if (nextAnchor != null) {
                    next = nextAnchor.mOwner;
                    if (next.mListAnchors[offset].mTarget == null
                        || next.mListAnchors[offset].mTarget!.mOwner != widget) {
                        next = null;
                    }
                } else {
                    next = null;
                }
                if (next != null) {
                    widget = next;
                } else {
                    done = true;
                }
            }
        } else if (isChainSpreadInside) {
            if (numVisibleWidgets == 2) {
                if (orientation == ConstraintWidget.HORIZONTAL) {
                    firstVisibleWidget.setFinalHorizontal(startPoint,
                        startPoint + firstVisibleWidget.getWidth());
                    lastVisibleWidget.setFinalHorizontal(endPoint - lastVisibleWidget.getWidth(),
                        endPoint);
                    Direct.horizontalSolvingPass(level + 1,
                        firstVisibleWidget, container.getMeasurer()!, isRtl);
                    Direct.horizontalSolvingPass(level + 1,
                        lastVisibleWidget, container.getMeasurer()!, isRtl);
                } else {
                    firstVisibleWidget.setFinalVertical(startPoint,
                        startPoint + firstVisibleWidget.getHeight());
                    lastVisibleWidget.setFinalVertical(endPoint - lastVisibleWidget.getHeight(),
                        endPoint);
                    Direct.verticalSolvingPass(level + 1,
                        firstVisibleWidget, container.getMeasurer()!);
                    Direct.verticalSolvingPass(level + 1,
                        lastVisibleWidget, container.getMeasurer()!);
                }
                return true;
            }
            return false;
        }
        return true;
    }
}