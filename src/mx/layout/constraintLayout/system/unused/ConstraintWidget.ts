import {ConstraintAnchor, ConstraintAnchorType} from "./ConstraintAnchor";
import {LinearSystem} from "./SolverVariable";
import {Cache} from "./Cache";
import {SolverVariable} from "./SolverVariable";
import {Arrays, Deref, Interfaces, MathUtils} from "./utils";
import {VirtualLayout} from "./VirtualLayout";
import {Optimizer} from "./Optimizer";
import {DependencyGraph} from "./DependencyGraph";
import {ChainHead} from "./ChainHead";
import {Chain} from "./Chain";
import {Grouping} from "./Grouping";
import {Helper} from "./Helper";
import {WidgetGroup} from "./WidgetGroup";
import {Dependency} from "./Dependency";
import {RunGroup} from "./RunGroup";

export enum DimensionBehaviour {
    FIXED, WRAP_CONTENT, MATCH_CONSTRAINT, MATCH_PARENT
}

export class Measure {
    public static SELF_DIMENSIONS = 0;
    public static TRY_GIVEN_DIMENSIONS = 1;
    public static USE_GIVEN_DIMENSIONS = 2;

    // TODO uninit values
    public horizontalBehavior: DimensionBehaviour = DimensionBehaviour.FIXED
    public verticalBehavior: DimensionBehaviour = DimensionBehaviour.FIXED
    //

    public horizontalDimension = 0
    public verticalDimension = 0
    public measuredWidth = 0
    public measuredHeight = 0
    public measuredBaseline =  0
    public measuredHasBaseline = false
    public measuredNeedsSolverPass = false
    public measureStrategy = 0
}

export interface Measurer {
    measure (widget: ConstraintWidget, measure: Measure): void

    didMeasures (): void
}

export class BasicMeasure {
    private static readonly DEBUG = false;
    private static readonly DO_NOT_USE = false;
    private static readonly MODE_SHIFT = 30;
    public static readonly UNSPECIFIED = 0;
    public static readonly EXACTLY = 1 << BasicMeasure.MODE_SHIFT;
    public static readonly AT_MOST = 2 << BasicMeasure.MODE_SHIFT;

    public static readonly MATCH_PARENT = -1;
    public static readonly WRAP_CONTENT = -2;
    public static readonly FIXED = -3;

    private mVariableDimensionsWidgets: ConstraintWidget[] = []
    private mMeasure = new Measure();

    updateHierarchy(layout: ConstraintWidgetContainer) {
        this.mVariableDimensionsWidgets = []
        const childCount = layout.mChildren.length
        for (let i = 0; i < childCount; i++) {
            let widget = layout.mChildren[i]
            if (widget.getHorizontalDimensionBehaviour() == DimensionBehaviour.MATCH_CONSTRAINT
                || widget.getVerticalDimensionBehaviour() == DimensionBehaviour.MATCH_CONSTRAINT) {
                this.mVariableDimensionsWidgets.push(widget);
            }
        }
        layout.invalidateGraph();
    }

    private mConstraintWidgetContainer: ConstraintWidgetContainer

    constructor(constraintWidgetContainer: ConstraintWidgetContainer) {
        this.mConstraintWidgetContainer = constraintWidgetContainer
    }

    measureChildren(layout: ConstraintWidgetContainer) {
        console.log("measuring children", layout.getChildren().length)

        const childCount = layout.mChildren.length
        let optimize = layout.optimizeFor(Optimizer.OPTIMIZATION_GRAPH);
        let measurer = layout.getMeasurer();
        for (let i = 0; i < childCount; i++) {
            let child = layout.mChildren[i]
            if (child instanceof Guideline) {
                continue;
            }
            if (child instanceof Barrier) {
                continue;
            }
            if (child.isInVirtualLayout()) {
                continue;
            }

            if (optimize && child.mHorizontalRun != null && child.mVerticalRun != null
                && child.mHorizontalRun.mDimension.resolved
                && child.mVerticalRun.mDimension.resolved) {
                continue;
            }

            let widthBehavior = child.getDimensionBehaviour(ConstraintWidget.HORIZONTAL);
            let heightBehavior = child.getDimensionBehaviour(ConstraintWidget.VERTICAL);

            let skip = widthBehavior == DimensionBehaviour.MATCH_CONSTRAINT
                && child.mMatchConstraintDefaultWidth != ConstraintWidget.MATCH_CONSTRAINT_WRAP
                && heightBehavior == DimensionBehaviour.MATCH_CONSTRAINT
                && child.mMatchConstraintDefaultHeight != ConstraintWidget.MATCH_CONSTRAINT_WRAP;

            if (!skip && layout.optimizeFor(Optimizer.OPTIMIZATION_DIRECT)
                && !(child instanceof VirtualLayout)) {
                if (widthBehavior == DimensionBehaviour.MATCH_CONSTRAINT
                    && child.mMatchConstraintDefaultWidth == ConstraintWidget.MATCH_CONSTRAINT_SPREAD
                    && heightBehavior != DimensionBehaviour.MATCH_CONSTRAINT
                    && !child.isInHorizontalChain()) {
                    skip = true;
                }

                if (heightBehavior == DimensionBehaviour.MATCH_CONSTRAINT
                    && child.mMatchConstraintDefaultHeight == ConstraintWidget.MATCH_CONSTRAINT_SPREAD
                    && widthBehavior != DimensionBehaviour.MATCH_CONSTRAINT
                    && !child.isInHorizontalChain()) {
                    skip = true;
                }

                // Don't measure yet -- let the direct solver have a shot at it.
                if ((widthBehavior == DimensionBehaviour.MATCH_CONSTRAINT
                        || heightBehavior == DimensionBehaviour.MATCH_CONSTRAINT)
                    && child.mDimensionRatio > 0) {
                    skip = true;
                }
            }

            if (skip) {
                // we don't need to measure here as the dimension of the widget
                // will be completely computed by the solver.
                continue;
            }

            this.measure(measurer, child, Measure.SELF_DIMENSIONS);
        }
        measurer!.didMeasures();
    }

    private solveLinearSystem(layout: ConstraintWidgetContainer, reason: string, pass: number, w: number, h: number) {
        let minWidth = layout.getMinWidth();
        let minHeight = layout.getMinHeight();

        console.log("[pivoting]", w, h)

        layout.setMinWidth(0);
        layout.setMinHeight(0);
        layout.setWidth(w);
        layout.setHeight(h);
        layout.setMinWidth(minWidth);
        layout.setMinHeight(minHeight);
        this.mConstraintWidgetContainer.setPass(pass);
        this.mConstraintWidgetContainer.layout();
    }

    solverMeasure (layout: ConstraintWidgetContainer, optimizationLevel: number, paddingX: number, paddingY: number, widthMode: number, widthSize: number, heightMode: number, heightSize: number, lastMeasureWidth: number, lastMeasureHeight: number) {
        console.log("running solver measure", layout.getChildren().length)

        let measurer = layout.getMeasurer();
        let layoutTime = 0;

        const childCount = layout.mChildren.length
        let startingWidth = layout.getWidth();
        let startingHeight = layout.getHeight();

        console.log("solver measure", startingWidth, startingHeight)

        let optimizeWrap =
            Optimizer.enabled(optimizationLevel, Optimizer.OPTIMIZATION_GRAPH_WRAP);
        let optimize = optimizeWrap
            || Optimizer.enabled(optimizationLevel, Optimizer.OPTIMIZATION_GRAPH);

        if (optimize) {
            for (let i = 0; i < childCount; i++) {
                let child = layout.mChildren[i]
                let matchWidth = child.getHorizontalDimensionBehaviour() == DimensionBehaviour.MATCH_CONSTRAINT;
                let matchHeight = child.getVerticalDimensionBehaviour() == DimensionBehaviour.MATCH_CONSTRAINT;
                let ratio = matchWidth && matchHeight && child.getDimensionRatio() > 0;
                if (child.isInHorizontalChain() && ratio) {
                    optimize = false;
                    break;
                }
                if (child.isInVerticalChain() && ratio) {
                    optimize = false;
                    break;
                }
                if (child instanceof VirtualLayout) {
                    optimize = false;
                    break;
                }
                if (child.isInHorizontalChain()
                    || child.isInVerticalChain()) {
                    optimize = false;
                    break;
                }
            }
        }

        let allSolved = false;

        optimize &&= (widthMode == BasicMeasure.EXACTLY && heightMode == BasicMeasure.EXACTLY) || optimizeWrap;

        let computations = 0;

        if (optimize) {
            // For non-optimizer this doesn't seem to be a problem.
            // For both cases, having the width address max size early seems to work
            //  (which makes sense).
            // Putting it specific to optimizer to reduce unnecessary risk.
            widthSize = Math.min(layout.getMaxWidth(), widthSize);
            heightSize = Math.min(layout.getMaxHeight(), heightSize);

            if (widthMode == BasicMeasure.EXACTLY && layout.getWidth() != widthSize) {
                layout.setWidth(widthSize);
                layout.invalidateGraph();
            }
            if (heightMode == BasicMeasure.EXACTLY && layout.getHeight() != heightSize) {
                layout.setHeight(heightSize);
                layout.invalidateGraph();
            }
            if (widthMode == BasicMeasure.EXACTLY && heightMode == BasicMeasure.EXACTLY) {
                allSolved = layout.directMeasure(optimizeWrap);
                computations = 2;
            } else {
                allSolved = layout.directMeasureSetup(optimizeWrap);
                if (widthMode == BasicMeasure.EXACTLY) {
                    allSolved &&= layout.directMeasureWithOrientation(optimizeWrap, ConstraintWidget.HORIZONTAL);
                    computations++;
                }
                if (heightMode == BasicMeasure.EXACTLY) {
                    allSolved &&= layout.directMeasureWithOrientation(optimizeWrap, ConstraintWidget.VERTICAL);
                    computations++;
                }
            }
            if (allSolved) {
                layout.updateFromRuns(widthMode == BasicMeasure.EXACTLY, heightMode == BasicMeasure.EXACTLY);
            }
        } else {
            if (false) {
                layout.mHorizontalRun!.clear();
                layout.mVerticalRun!.clear();
                for (let child of layout.getChildren()) {
                    child.mHorizontalRun!.clear();
                    child.mVerticalRun!.clear();
                }
            }
        }

        if (!allSolved || computations !== 2) {
            console.log("not all solved", `computations=${computations}`)

            let optimizations = layout.getOptimizationLevel();
            if (childCount > 0) {
                this.measureChildren(layout);
            }

            this.updateHierarchy(layout);

            // let's update the size dependent widgets if any...
            const sizeDependentWidgetsCount = this.mVariableDimensionsWidgets.length

            // let's solve the linear system.
            if (childCount > 0) {
                console.log("solving linear system [call - 1]")
                this.solveLinearSystem(layout, "First pass", 0, startingWidth, startingHeight);
            }

            if (sizeDependentWidgetsCount > 0) {
                let needSolverPass = false;

                let containerWrapWidth = layout.getHorizontalDimensionBehaviour() === DimensionBehaviour.WRAP_CONTENT;
                let containerWrapHeight = layout.getVerticalDimensionBehaviour() === DimensionBehaviour.WRAP_CONTENT;

                let minWidth = Math.max(layout.getWidth(), this.mConstraintWidgetContainer.getMinWidth());
                let minHeight = Math.max(layout.getHeight(), this.mConstraintWidgetContainer.getMinHeight());

                ////////////////////////////////////////////////////////////////////////////////////
                // Let's first apply sizes for VirtualLayouts if any
                ////////////////////////////////////////////////////////////////////////////////////
                for (let i = 0; i < sizeDependentWidgetsCount; i++) {
                    let widget = this.mVariableDimensionsWidgets[i]
                    // if (!(widget instanceof VirtualLayout)) {
                    //     continue;
                    // }
                    let preWidth = widget.getWidth();
                    let preHeight = widget.getHeight();
                    needSolverPass ||= this.measure(measurer, widget, Measure.TRY_GIVEN_DIMENSIONS);
                    let measuredWidth = widget.getWidth();
                    let measuredHeight = widget.getHeight();
                    if (measuredWidth != preWidth) {
                        widget.setWidth(measuredWidth);
                        if (containerWrapWidth && widget.getRight() > minWidth) {
                            let w = widget.getRight() + widget.getAnchor(ConstraintAnchorType.RIGHT)!.getMargin();
                            minWidth = Math.max(minWidth, w);
                        }
                        needSolverPass = true;
                    }
                    if (measuredHeight != preHeight) {
                        widget.setHeight(measuredHeight);
                        if (containerWrapHeight && widget.getBottom() > minHeight) {
                            let h = widget.getBottom() + widget.getAnchor(ConstraintAnchorType.BOTTOM)!.getMargin();
                            minHeight = Math.max(minHeight, h);
                        }
                        needSolverPass = true;
                    }

                    // TODO impl
                    // let virtualLayout = widget as VirtualLayout
                    // needSolverPass ||= virtualLayout.needSolverPass();
                }
                ////////////////////////////////////////////////////////////////////////////////////

                let maxIterations = 2;
                for (let j = 0; j < maxIterations; j++) {
                    for (let i = 0; i < sizeDependentWidgetsCount; i++) {
                        let widget = this.mVariableDimensionsWidgets[i]
                        if ((Interfaces.instanceOfHelper(widget) && !(widget instanceof VirtualLayout)) // widget instanceof Helper
                            || widget instanceof Guideline) {
                            continue;
                        }
                        if (widget.getVisibility() == ConstraintWidget.GONE) {
                            continue;
                        }
                        if (optimize && widget.mHorizontalRun!.mDimension.resolved
                            && widget.mVerticalRun!.mDimension.resolved) {
                            continue;
                        }
                        if (widget instanceof VirtualLayout) {
                            continue;
                        }

                        let preWidth = widget.getWidth();
                        let preHeight = widget.getHeight();
                        let preBaselineDistance = widget.getBaselineDistance();

                        let measureStrategy = Measure.TRY_GIVEN_DIMENSIONS;
                        if (j == maxIterations - 1) {
                            measureStrategy = Measure.USE_GIVEN_DIMENSIONS;
                        }
                        let hasMeasure = this.measure(measurer, widget, measureStrategy);
                        if (BasicMeasure.DO_NOT_USE && !widget.hasDependencies()) {
                            hasMeasure = false;
                        }
                        needSolverPass ||= hasMeasure;

                        let measuredWidth = widget.getWidth();
                        let measuredHeight = widget.getHeight();

                        if (measuredWidth != preWidth) {
                            widget.setWidth(measuredWidth);
                            if (containerWrapWidth && widget.getRight() > minWidth) {
                                let w = widget.getRight() + widget.getAnchor(ConstraintAnchorType.RIGHT)!.getMargin();
                                minWidth = Math.max(minWidth, w);
                            }
                            needSolverPass = true;
                        }
                        if (measuredHeight != preHeight) {
                            widget.setHeight(measuredHeight);
                            if (containerWrapHeight && widget.getBottom() > minHeight) {
                                let h = widget.getBottom() + widget.getAnchor(ConstraintAnchorType.BOTTOM)!.getMargin();
                                minHeight = Math.max(minHeight, h);
                            }
                            needSolverPass = true;
                        }
                        if (widget.hasBaseline()
                            && preBaselineDistance != widget.getBaselineDistance()) {
                            needSolverPass = true;
                        }
                    }
                    if (needSolverPass) {
                        console.log ("solving linear system [call-i]")
                        this.solveLinearSystem(layout, "intermediate pass", 1 + j, startingWidth, startingHeight);
                        needSolverPass = false;
                    } else {
                        break;
                    }
                }
            }
            layout.setOptimizationLevel(optimizations);
        }
        return layoutTime;
    }

    measure(measurer: Measurer | null, widget: ConstraintWidget, measureStrategy: number) {
        this.mMeasure.horizontalBehavior = widget.getHorizontalDimensionBehaviour();
        this.mMeasure.verticalBehavior = widget.getVerticalDimensionBehaviour();
        this.mMeasure.horizontalDimension = widget.getWidth();
        this.mMeasure.verticalDimension = widget.getHeight();
        this.mMeasure.measuredNeedsSolverPass = false;
        this.mMeasure.measureStrategy = measureStrategy;

        let horizontalMatchConstraints = (this.mMeasure.horizontalBehavior
            == DimensionBehaviour.MATCH_CONSTRAINT);
        let verticalMatchConstraints = (this.mMeasure.verticalBehavior
            == DimensionBehaviour.MATCH_CONSTRAINT);
        let horizontalUseRatio = horizontalMatchConstraints && widget.mDimensionRatio > 0;
        let verticalUseRatio = verticalMatchConstraints && widget.mDimensionRatio > 0;

        if (horizontalUseRatio) {
            if (widget.mResolvedMatchConstraintDefault[ConstraintWidget.HORIZONTAL]
                == ConstraintWidget.MATCH_CONSTRAINT_RATIO_RESOLVED) {
                this.mMeasure.horizontalBehavior = DimensionBehaviour.FIXED;
            }
        }
        if (verticalUseRatio) {
            if (widget.mResolvedMatchConstraintDefault[ConstraintWidget.VERTICAL]
                == ConstraintWidget.MATCH_CONSTRAINT_RATIO_RESOLVED) {
                this.mMeasure.verticalBehavior = DimensionBehaviour.FIXED;
            }
        }

        measurer!.measure(widget, this.mMeasure);
        widget.setWidth(this.mMeasure.measuredWidth);
        widget.setHeight(this.mMeasure.measuredHeight);
        widget.setHasBaseline(this.mMeasure.measuredHasBaseline);
        widget.setBaselineDistance(this.mMeasure.measuredBaseline);
        this.mMeasure.measureStrategy = Measure.SELF_DIMENSIONS;
        return this.mMeasure.measuredNeedsSolverPass;
    }


}

//

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

        if (horizontal === DimensionBehaviour.FIXED) {
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

//

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

export class GuidelineReference extends WidgetRun{
    constructor(widget: ConstraintWidget) {
        super(widget);

        widget.mHorizontalRun!.clear()
        widget.mVerticalRun!.clear()
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
                        let target = refWidget.mHorizontalRun!.start;
                        target.mDependencies.push(this.start);
                        this.start.mTargets.push(target);
                        // FIXME -- if we move the DependencyNode directly
                        //          in the ConstraintAnchor we'll be good.
                    }
                    this.addDependency(this.mWidget.mHorizontalRun!.start);
                    this.addDependency(this.mWidget.mHorizontalRun!.end);
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
                        let target = refWidget.mHorizontalRun!.end!
                        target.mDependencies.push(this.start);
                        this.start.mTargets.push(target);
                        // FIXME -- if we move the DependencyNode directly
                        //              in the ConstraintAnchor we'll be good.
                    }
                    this.addDependency(this.mWidget.mHorizontalRun!.start);
                    this.addDependency(this.mWidget.mHorizontalRun!.end);
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
                        let target = refwidget.mVerticalRun!.start;
                        target.mDependencies.push(this.start);
                        this.start.mTargets.push(target);
                        // FIXME -- if we move the DependencyNode directly
                        //              in the ConstraintAnchor we'll be good.
                    }
                    this.addDependency(this.mWidget.mVerticalRun!.start);
                    this.addDependency(this.mWidget.mVerticalRun!.end);
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
                        let target = refwidget.mVerticalRun!.end;
                        target.mDependencies.push(this.start);
                        this.start.mTargets.push(target);
                        // FIXME -- if we move the DependencyNode directly
                        //              in the ConstraintAnchor we'll be good.
                    }
                    this.addDependency(this.mWidget.mVerticalRun!.start);
                    this.addDependency(this.mWidget.mVerticalRun!.end);
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

export class ChainRun extends WidgetRun{
    mWidgets: WidgetRun[] = []
    private mChainStyle: number = 0

    constructor(widget: ConstraintWidget, orientation: number) {
        super(widget);

        this.orientation = orientation

        this.build ()
    }

    toString () {
        let log = ["ChainRun "]
        log.push((this.orientation == ConstraintWidget.HORIZONTAL ? "horizontal : " : "vertical : "));
        for (let run of this.mWidgets) {
            log.push("<");
            log.push(`${run}`);
            log.push("> ");
        }
        return log.toString();
    }

    supportsWrapComputation(): boolean {
        const count = this.mWidgets.length
        for (let i = 0; i < count; i++) {
            let run = this.mWidgets[i]
            if (!run.supportsWrapComputation!()) {
                return false;
            }
        }
        return true;
    }

    getWrapDimension(): number | number {
        const count = this.mWidgets.length
        let wrapDimension = 0;
        for (let i = 0; i < count; i++) {
            let run = this.mWidgets[i]
            wrapDimension += run.start.mMargin;
            wrapDimension += run.getWrapDimension();
            wrapDimension += run.end.mMargin;
        }
        return wrapDimension;
    }

    private build() {
        let current = this.mWidget;
        let previous = current.getPreviousChainMember(this.orientation);
        while (previous != null) {
            current = previous;
            previous = current.getPreviousChainMember(this.orientation);
        }
        this.mWidget = current; // first element of the chain
        this.mWidgets.push(current.getRun(this.orientation)!);
        let next = current.getNextChainMember(this.orientation);
        while (next != null) {
            current = next;
            this.mWidgets.push(current.getRun(this.orientation)!);
            next = current.getNextChainMember(this.orientation);
        }
        for (let run of this.mWidgets) {
            if (this.orientation == ConstraintWidget.HORIZONTAL) {
                run.mWidget.horizontalChainRun = this;
            } else if (this.orientation == ConstraintWidget.VERTICAL) {
                run.mWidget.verticalChainRun = this;
            }
        }
        let isInRtl = (this.orientation ==ConstraintWidget.HORIZONTAL)
            && (this.mWidget.getParent() as ConstraintWidgetContainer).isRtl();
        if (isInRtl && this.mWidgets.length > 1) {
            this.mWidget = this.mWidgets[this.mWidgets.length - 1].mWidget;
        }
        this.mChainStyle = this.orientation == ConstraintWidget.HORIZONTAL
            ? this.mWidget.getHorizontalChainStyle() : this.mWidget.getVerticalChainStyle();
    }

    clear() {
        this.mRunGroup = null
        for (let run of this.mWidgets) {
            run.clear!()
        }
    }

    reset() {
        this.start.resolved = false
        this.end.resolved = false
    }

    update(dependency: Dependency) {
        if (!(this.start.resolved && this.end.resolved)) {
            return;
        }

        let parent = this.mWidget.getParent();
        let isInRtl = false;
        if (parent instanceof ConstraintWidgetContainer) {
            isInRtl = (parent as ConstraintWidgetContainer).isRtl();
        }
        let distance = this.end.value - this.start.value;
        let size = 0;
        let numMatchConstraints = 0;
        let weights = 0;
        let numVisibleWidgets = 0;
        const count = this.mWidgets.length
        // let's find the first visible widget...
        let firstVisibleWidget = -1;
        for (let i = 0; i < count; i++) {
            let run = this.mWidgets[i]
            if (run.mWidget.getVisibility() == ConstraintWidget.GONE) {
                continue;
            }
            firstVisibleWidget = i;
            break;
        }
        // now the last visible widget...
        let lastVisibleWidget = -1;
        for (let i = count - 1; i >= 0; i--) {
            let run = this.mWidgets[i]
            if (run.mWidget.getVisibility() == ConstraintWidget.GONE) {
                continue;
            }
            lastVisibleWidget = i;
            break;
        }
        for (let j = 0; j < 2; j++) {
            for (let i = 0; i < count; i++) {
                let run = this.mWidgets[i]
                if (run.mWidget.getVisibility() == ConstraintWidget.GONE) {
                    continue;
                }
                numVisibleWidgets++;
                if (i > 0 && i >= firstVisibleWidget) {
                    size += run.start.mMargin;
                }
                let dimension = run.mDimension.value;
                let treatAsFixed = run.mDimensionBehavior != DimensionBehaviour.MATCH_CONSTRAINT;
                if (treatAsFixed) {
                    if (this.orientation == ConstraintWidget.HORIZONTAL
                        && !run.mWidget.mHorizontalRun!.mDimension.resolved) {
                        return;
                    }
                    if (this.orientation == ConstraintWidget.VERTICAL && !run.mWidget.mVerticalRun!.mDimension.resolved) {
                        return;
                    }
                } else if (run.matchConstraintsType == ConstraintWidget.MATCH_CONSTRAINT_WRAP && j == 0) {
                    treatAsFixed = true;
                    dimension = run.mDimension.wrapValue;
                    numMatchConstraints++;
                } else if (run.mDimension.resolved) {
                    treatAsFixed = true;
                }
                if (!treatAsFixed) { // only for the first pass
                    numMatchConstraints++;
                    let weight = run.mWidget.mWeight[this.orientation];
                    if (weight >= 0) {
                        weights += weight;
                    }
                } else {
                    size += dimension;
                }
                if (i < count - 1 && i < lastVisibleWidget) {
                    size += -run.end.mMargin;
                }
            }
            if (size < distance || numMatchConstraints == 0) {
                break; // we are good to go!
            }
            // otherwise, let's do another pass with using match_constraints
            numVisibleWidgets = 0;
            numMatchConstraints = 0;
            size = 0;
            weights = 0;
        }

        let position = this.start.value;
        if (isInRtl) {
            position = this.end.value;
        }
        if (size > distance) {
            if (isInRtl) {
                position += Math.round(0.5 + (size - distance) / 2);
            } else {
                position -= Math.round(0.5 + (size - distance) / 2);
            }
        }
        let matchConstraintsDimension = 0;
        if (numMatchConstraints > 0) {
            matchConstraintsDimension = Math.round(0.5 + (distance - size) / numMatchConstraints);

            let appliedLimits = 0;
            for (let i = 0; i < count; i++) {
                let run = this.mWidgets[i]
                if (run.mWidget.getVisibility() == ConstraintWidget.GONE) {
                    continue;
                }
                if (run.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT && !run.mDimension.resolved) {
                    let dimension = matchConstraintsDimension;
                    if (weights > 0) {
                        let weight = run.mWidget.mWeight[this.orientation];
                        dimension = Math.round(0.5 + weight * (distance - size) / weights);
                    }
                    let max;
                    let min;
                    let value = dimension;
                    if (this.orientation == ConstraintWidget.HORIZONTAL) {
                        max = run.mWidget.mMatchConstraintMaxWidth;
                        min = run.mWidget.mMatchConstraintMinWidth;
                    } else {
                        max = run.mWidget.mMatchConstraintMaxHeight;
                        min = run.mWidget.mMatchConstraintMinHeight;
                    }
                    if (run.matchConstraintsType == ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
                        value = Math.min(value, run.mDimension.wrapValue);
                    }
                    value = Math.max(min, value);
                    if (max > 0) {
                        value = Math.min(max, value);
                    }
                    if (value != dimension) {
                        appliedLimits++;
                        dimension = value;
                    }
                    run.mDimension.resolve(dimension);
                }
            }
            if (appliedLimits > 0) {
                numMatchConstraints -= appliedLimits;
                // we have to recompute the sizes
                size = 0;
                for (let i = 0; i < count; i++) {
                    let run = this.mWidgets[i]
                    if (run.mWidget.getVisibility() == ConstraintWidget.GONE) {
                        continue;
                    }
                    if (i > 0 && i >= firstVisibleWidget) {
                        size += run.start.mMargin;
                    }
                    size += run.mDimension.value;
                    if (i < count - 1 && i < lastVisibleWidget) {
                        size += -run.end.mMargin;
                    }
                }
            }
            if (this.mChainStyle == ConstraintWidget.CHAIN_PACKED && appliedLimits == 0) {
                this.mChainStyle = ConstraintWidget.CHAIN_SPREAD;
            }
        }

        if (size > distance) {
            this.mChainStyle = ConstraintWidget.CHAIN_PACKED;
        }

        if (numVisibleWidgets > 0 && numMatchConstraints == 0
            && firstVisibleWidget == lastVisibleWidget) {
            // only one widget of fixed size to display...
            this.mChainStyle = ConstraintWidget.CHAIN_PACKED;
        }

        if (this.mChainStyle == ConstraintWidget.CHAIN_SPREAD_INSIDE) {
            let gap = 0;
            if (numVisibleWidgets > 1) {
                gap = (distance - size) / (numVisibleWidgets - 1);
            } else if (numVisibleWidgets == 1) {
                gap = (distance - size) / 2;
            }
            if (numMatchConstraints > 0) {
                gap = 0;
            }
            for (let i = 0; i < count; i++) {
                let index = i;
                if (isInRtl) {
                    index = count - (i + 1);
                }
                let run = this.mWidgets[index]
                if (run.mWidget.getVisibility() == ConstraintWidget.GONE) {
                    run.start.resolve(position);
                    run.end.resolve(position);
                    continue;
                }
                if (i > 0) {
                    if (isInRtl) {
                        position -= gap;
                    } else {
                        position += gap;
                    }
                }
                if (i > 0 && i >= firstVisibleWidget) {
                    if (isInRtl) {
                        position -= run.start.mMargin;
                    } else {
                        position += run.start.mMargin;
                    }
                }

                if (isInRtl) {
                    run.end.resolve(position);
                } else {
                    run.start.resolve(position);
                }

                let dimension = run.mDimension.value;
                if (run.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT
                    && run.matchConstraintsType == ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
                    dimension = run.mDimension.wrapValue;
                }
                if (isInRtl) {
                    position -= dimension;
                } else {
                    position += dimension;
                }

                if (isInRtl) {
                    run.start.resolve(position);
                } else {
                    run.end.resolve(position);
                }
                run.mResolved = true;
                if (i < count - 1 && i < lastVisibleWidget) {
                    if (isInRtl) {
                        position -= -run.end.mMargin;
                    } else {
                        position += -run.end.mMargin;
                    }
                }
            }
        } else if (this.mChainStyle == ConstraintWidget.CHAIN_SPREAD) {
            let gap = (distance - size) / (numVisibleWidgets + 1);
            if (numMatchConstraints > 0) {
                gap = 0;
            }
            for (let i = 0; i < count; i++) {
                let index = i;
                if (isInRtl) {
                    index = count - (i + 1);
                }
                let run = this.mWidgets[index]
                if (run.mWidget.getVisibility() == ConstraintWidget.GONE) {
                    run.start.resolve(position);
                    run.end.resolve(position);
                    continue;
                }
                if (isInRtl) {
                    position -= gap;
                } else {
                    position += gap;
                }
                if (i > 0 && i >= firstVisibleWidget) {
                    if (isInRtl) {
                        position -= run.start.mMargin;
                    } else {
                        position += run.start.mMargin;
                    }
                }

                if (isInRtl) {
                    run.end.resolve(position);
                } else {
                    run.start.resolve(position);
                }

                let dimension = run.mDimension.value;
                if (run.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT
                    && run.matchConstraintsType == ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
                    dimension = Math.min(dimension, run.mDimension.wrapValue);
                }

                if (isInRtl) {
                    position -= dimension;
                } else {
                    position += dimension;
                }

                if (isInRtl) {
                    run.start.resolve(position);
                } else {
                    run.end.resolve(position);
                }
                if (i < count - 1 && i < lastVisibleWidget) {
                    if (isInRtl) {
                        position -= -run.end.mMargin;
                    } else {
                        position += -run.end.mMargin;
                    }
                }
            }
        } else if (this.mChainStyle == ConstraintWidget.CHAIN_PACKED) {
            let bias = (this.orientation == ConstraintWidget.HORIZONTAL) ? this.mWidget.getHorizontalBiasPercent()
                : this.mWidget.getVerticalBiasPercent();
            if (isInRtl) {
                bias = 1 - bias;
            }
            let gap = Math.round(0.5 + (distance - size) * bias);
            if (gap < 0 || numMatchConstraints > 0) {
                gap = 0;
            }
            if (isInRtl) {
                position -= gap;
            } else {
                position += gap;
            }
            for (let i = 0; i < count; i++) {
                let index = i;
                if (isInRtl) {
                    index = count - (i + 1);
                }
                let run = this.mWidgets[index]
                if (run.mWidget.getVisibility() == ConstraintWidget.GONE) {
                    run.start.resolve(position);
                    run.end.resolve(position);
                    continue;
                }
                if (i > 0 && i >= firstVisibleWidget) {
                    if (isInRtl) {
                        position -= run.start.mMargin;
                    } else {
                        position += run.start.mMargin;
                    }
                }
                if (isInRtl) {
                    run.end.resolve(position);
                } else {
                    run.start.resolve(position);
                }

                let dimension = run.mDimension.value;
                if (run.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT
                    && run.matchConstraintsType == ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
                    dimension = run.mDimension.wrapValue;
                }
                if (isInRtl) {
                    position -= dimension;
                } else {
                    position += dimension;
                }

                if (isInRtl) {
                    run.start.resolve(position);
                } else {
                    run.end.resolve(position);
                }
                if (i < count - 1 && i < lastVisibleWidget) {
                    if (isInRtl) {
                        position -= -run.end.mMargin;
                    } else {
                        position += -run.end.mMargin;
                    }
                }
            }
        }
    }

    applyToWidget() {
        for (let i = 0; i < this.mWidgets.length; i++) {
            let run = this.mWidgets[i]
            run.applyToWidget!();
        }
    }

    getFirstVisibleWidget () {
        for (let i = 0; i < this.mWidgets.length; i++) {
            let run = this.mWidgets[i]
            if (run.mWidget.getVisibility() != ConstraintWidget.GONE) {
                return run.mWidget;
            }
        }
        return null;
    }

    getLastVisibleWidget () {
        for (let i = this.mWidgets.length - 1; i >= 0; i--) {
            let run = this.mWidgets[i]
            if (run.mWidget.getVisibility() != ConstraintWidget.GONE) {
                return run.mWidget;
            }
        }
        return null;
    }

    apply() {
        for (let run of this.mWidgets) {
            run.apply!();
        }
        let count = this.mWidgets.length
        if (count < 1) {
            return;
        }

        // get the first and last element of the chain
        let firstWidget = this.mWidgets[0].mWidget;
        let lastWidget = this.mWidgets[count - 1].mWidget;

        if (this.orientation == ConstraintWidget.HORIZONTAL) {
            let startAnchor = firstWidget.mLeft;
            let endAnchor = lastWidget.mRight;
            let startTarget = this.getTargetWithOrientation(startAnchor, ConstraintWidget.HORIZONTAL);
            let startMargin = startAnchor.getMargin();
            let firstVisibleWidget = this.getFirstVisibleWidget();
            if (firstVisibleWidget != null) {
                startMargin = firstVisibleWidget.mLeft.getMargin();
            }
            if (startTarget != null) {
                this.addTarget(this.start, startTarget, startMargin);
            }
            let endTarget = this.getTargetWithOrientation(endAnchor, ConstraintWidget.HORIZONTAL);
            let endMargin = endAnchor.getMargin();
            let lastVisibleWidget = this.getLastVisibleWidget();
            if (lastVisibleWidget != null) {
                endMargin = lastVisibleWidget.mRight.getMargin();
            }
            if (endTarget != null) {
                this.addTarget(this.end, endTarget, -endMargin);
            }
        } else {
            let startAnchor = firstWidget.mTop;
            let endAnchor = lastWidget.mBottom;
            let startTarget = this.getTargetWithOrientation(startAnchor, ConstraintWidget.VERTICAL);
            let startMargin = startAnchor.getMargin();
            let firstVisibleWidget = this.getFirstVisibleWidget();
            if (firstVisibleWidget != null) {
                startMargin = firstVisibleWidget.mTop.getMargin();
            }
            if (startTarget != null) {
                this.addTarget(this.start, startTarget, startMargin);
            }
            let endTarget = this.getTargetWithOrientation(endAnchor, ConstraintWidget.VERTICAL);
            let endMargin = endAnchor.getMargin();
            let lastVisibleWidget = this.getLastVisibleWidget();
            if (lastVisibleWidget != null) {
                endMargin = lastVisibleWidget.mBottom.getMargin();
            }
            if (endTarget != null) {
                this.addTarget(this.end, endTarget, -endMargin);
            }
        }
        this.start.updateDelegate = this;
        this.end.updateDelegate = this;
    }
}

//

export enum DependencyNodeType {
    UNKNOWN, HORIZONTAL_DIMENSION, VERTICAL_DIMENSION,
    LEFT, RIGHT, TOP, BOTTOM, BASELINE
}

export class DependencyNode implements Dependency{
    updateDelegate: Dependency | null = null
    delegateToWidgetRun = false
    readyToSolve = false

    mRun: WidgetRun
    mType = DependencyNodeType.UNKNOWN

    mMargin: number = 0
    value: number = 0
    mMarginFactor = 1

    mMarginDependency: DimensionDependency | null = null

    resolved = false

    constructor(run: WidgetRun) {
        this.mRun = run
    }

    mDependencies: Dependency[] = []
    mTargets: DependencyNode[] = []

    toString () {
        return this.mRun.mWidget.getDebugName() + ":" + this.mType + "("
            + (this.resolved ? this.value : "unresolved") + ") <t="
            + this.mTargets.length + ":d=" + this.mDependencies.length+ ">";
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

    update(node: Dependency) {
        for (let target of this.mTargets) {
            if (!target.resolved) {
                return;
            }
        }
        this.readyToSolve = true;
        if (this.updateDelegate != null) {
            this.updateDelegate.update(this);
        }
        if (this.delegateToWidgetRun) {
            this.mRun.update(this);
            return;
        }
        let target: DependencyNode | null = null;
        let numTargets = 0;
        for (let t of this.mTargets) {
            if (t instanceof DimensionDependency) {
                continue;
            }
            target = t;
            numTargets++;
        }

        if (target != null && numTargets == 1 && target.resolved) {
            if (this.mMarginDependency != null) {
                if (this.mMarginDependency.resolved) {
                    this.mMargin = this.mMarginFactor * this.mMarginDependency.value;
                } else {
                    return;
                }
            }
            this.resolve(target.value + this.mMargin);
        }
        if (this.updateDelegate != null) {
            this.updateDelegate.update(this);
        }
    }

    addDependency (dependency: Dependency) {
        this.mDependencies.push(dependency);
        if (this.resolved) {
            dependency.update(dependency);
        }
    }

    name () {
        let definition = this.mRun.mWidget.getDebugName();
        if (this.mType == DependencyNodeType.LEFT
            || this.mType == DependencyNodeType.RIGHT) {
            definition += "_HORIZONTAL";
        } else {
            definition += "_VERTICAL";
        }
        definition += ":" + this.mType;
        return definition;
    }

    clear () {
        this.mTargets = []
        this.mDependencies = []
        this.resolved = false;
        this.value = 0;
        this.readyToSolve = false;
        this.delegateToWidgetRun = false;
    }


}

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

//

export class ConstraintWidget {
    private static readonly AUTOTAG_CENTER = false;
    private static readonly DO_NOT_USE = false;
    static readonly SOLVER = 1;
    static readonly DIRECT = 2;

    // apply an intrinsic size when wrap content for spread dimensions
    private static readonly USE_WRAP_DIMENSION_FOR_SPREAD = false

    ////////////////////////////////////////////////////////////////////////////////////////////////
    // Graph measurements
    ////////////////////////////////////////////////////////////////////////////////////////////////

    public measured = false;
    public run = new Array<WidgetRun>(2);
    public horizontalChainRun: ChainRun | null = null
    public verticalChainRun: ChainRun | null = null

    public mHorizontalRun: HorizontalWidgetRun | null = null;
    public mVerticalRun: VerticalWidgetRun | null = null;

    public isTerminalWidget = [true, true];
    mResolvedHasRatio = false;
    private mMeasureRequested = true;
    private mOptimizeWrapO = false;
    private mOptimizeWrapOnResolved = true;

    private mWidthOverride = -1;
    private mHeightOverride = -1;

    // TODO for MotionLayout
    // public frame: WidgetFrame = new WidgetFrame(this);

    public stringId: string | null = null

    getRun(orientation: number): WidgetRun | null {
        if (orientation == ConstraintWidget.HORIZONTAL) {
            return this.mHorizontalRun
        } else if (orientation == ConstraintWidget.VERTICAL) {
            return this.mVerticalRun;
        }
        return null;
    }

    private mResolvedHorizontal = false;
    private mResolvedVertical = false;

    private mHorizontalSolvingPass = false;
    private mVerticalSolvingPass = false;

    setFinalFrame(left: number, top: number, right: number, bottom: number, baseline: number, orientation: number) {
        this.setFrameBounds(left, top, right, bottom);
        this.setBaselineDistance(baseline);
        if (orientation == ConstraintWidget.HORIZONTAL) {
            this.mResolvedHorizontal = true;
            this.mResolvedVertical = false;
        } else if (orientation == ConstraintWidget.VERTICAL) {
            this.mResolvedHorizontal = false;
            this.mResolvedVertical = true;
        } else if (orientation == ConstraintWidget.BOTH) {
            this.mResolvedHorizontal = true;
            this.mResolvedVertical = true;
        } else {
            this.mResolvedHorizontal = false;
            this.mResolvedVertical = false;
        }
    }

    public setFinalLeft(x1: number) {
        this.mLeft.setFinalValue(x1);
        this.mX = x1;
    }

    public setFinalTop(y1: number) {
        this.mTop.setFinalValue(y1);
        this.mY = y1;
    }

// @TODO: add description
    public resetSolvingPassFlag() {
        this.mHorizontalSolvingPass = false;
        this.mVerticalSolvingPass = false;
    }

    public isHorizontalSolvingPassDone() {
        return this.mHorizontalSolvingPass;
    }

    public isVerticalSolvingPassDone() {
        return this.mVerticalSolvingPass;
    }

// @TODO: add description
    public markHorizontalSolvingPassDone() {
        this.mHorizontalSolvingPass = true;
    }

    public markVerticalSolvingPassDone() {
        this.mVerticalSolvingPass = true;
    }

    // @TODO: add description
    public setFinalHorizontal(x1: number, x2: number) {
        if (this.mResolvedHorizontal) {
            return;
        }
        this.mLeft.setFinalValue(x1);
        this.mRight.setFinalValue(x2);
        this.mX = x1;
        this.mWidth = x2 - x1;
        this.mResolvedHorizontal = true;
    }

    public setFinalVertical(y1: number, y2: number) {
        if (this.mResolvedVertical) {
            return;
        }
        this.mTop.setFinalValue(y1);
        this.mBottom.setFinalValue(y2);
        this.mY = y1;
        this.mHeight = y2 - y1;
        if (this.mHasBaseline) {
            this.mBaseline.setFinalValue(y1 + this.mBaselineDistance);
        }
        this.mResolvedVertical = true;
    }

    public setFinalBaseline(baselineValue: number) {
        if (!this.mHasBaseline) {
            return;
        }
        let y1 = baselineValue - this.mBaselineDistance;
        let y2 = y1 + this.mHeight;
        this.mY = y1;
        this.mTop.setFinalValue(y1);
        this.mBottom.setFinalValue(y2);
        this.mBaseline.setFinalValue(baselineValue);
        this.mResolvedVertical = true;
    }

    public isResolvedHorizontally() {
        return this.mResolvedHorizontal || (this.mLeft.hasFinalValue() && this.mRight.hasFinalValue());
    }

    public isResolvedVertically() {
        return this.mResolvedVertical || (this.mTop.hasFinalValue() && this.mBottom.hasFinalValue());
    }

    public resetFinalResolution() {
        this.mResolvedHorizontal = false;
        this.mResolvedVertical = false;
        this.mHorizontalSolvingPass = false;
        this.mVerticalSolvingPass = false;
        for (let i = 0, mAnchorsSize = this.mAnchors.length;
             i < mAnchorsSize;
             i++
        ) {
            let anchor = this.mAnchors[i]!
            anchor.resetFinalResolution();
        }
    }

    // @TODO: add description
    public ensureMeasureRequested() {
        this.mMeasureRequested = true;
    }

    // @TODO: add description
    public hasDependencies() {
        for (let i = 0, mAnchorsSize = this.mAnchors.length; i < mAnchorsSize; i++) {
            const anchor = this.mAnchors[i]!
            if (anchor.hasDependents()) {
                return true;
            }
        }
        return false;
    }

    public hasDanglingDimension(orientation: number) {
        if (orientation == ConstraintWidget.HORIZONTAL) {
            let horizontalTargets = (this.mLeft.mTarget != null ? 1 : 0) + (this.mRight.mTarget != null ? 1 : 0);
            return horizontalTargets < 2;
        } else {
            let verticalTargets = (this.mTop.mTarget != null ? 1 : 0) + (this.mBottom.mTarget != null ? 1 : 0) + (this.mBaseline.mTarget != null ? 1 : 0);
            return verticalTargets < 2;
        }
    }

    public hasResolvedTargets(orientation: number, size: number) {
        if (orientation == ConstraintWidget.HORIZONTAL) {
            if (this.mLeft.mTarget != null && this.mLeft.mTarget.hasFinalValue()
                && this.mRight.mTarget != null && this.mRight.mTarget.hasFinalValue()) {
                return ((this.mRight.mTarget.getFinalValue() - this.mRight.getMargin())
                    - (this.mLeft.mTarget.getFinalValue() + this.mLeft.getMargin())) >= size;
            }
        } else {
            if (this.mTop.mTarget != null && this.mTop.mTarget.hasFinalValue()
                && this.mBottom.mTarget != null && this.mBottom.mTarget.hasFinalValue()) {
                return ((this.mBottom.mTarget.getFinalValue() - this.mBottom.getMargin())
                    - (this.mTop.mTarget.getFinalValue() + this.mTop.getMargin())) >= size;
            }
        }
        return false;
    }

    public static readonly MATCH_CONSTRAINT_SPREAD = 0;
    public static readonly MATCH_CONSTRAINT_WRAP = 1;
    public static readonly MATCH_CONSTRAINT_PERCENT = 2;
    public static readonly MATCH_CONSTRAINT_RATIO = 3;
    public static readonly MATCH_CONSTRAINT_RATIO_RESOLVED = 4;

    public static readonly UNKNOWN = -1;
    public static readonly HORIZONTAL = 0;
    public static readonly VERTICAL = 1;
    public static readonly BOTH = 2;

    public static readonly VISIBLE = 0;
    public static readonly INVISIBLE = 4;
    public static readonly GONE = 8;

    // Values of the chain styles
    public static readonly CHAIN_SPREAD = 0;
    public static readonly CHAIN_SPREAD_INSIDE = 1;
    public static readonly CHAIN_PACKED = 2;

    // Values of the wrap behavior in parent
    public static readonly WRAP_BEHAVIOR_INCLUDED = 0; // default
    public static readonly WRAP_BEHAVIOR_HORIZONTAL_ONLY = 1;
    public static readonly WRAP_BEHAVIOR_VERTICAL_ONLY = 2;
    public static readonly WRAP_BEHAVIOR_SKIPPED = 3;

    public mHorizontalResolution = ConstraintWidget.UNKNOWN;
    public mVerticalResolution = ConstraintWidget.UNKNOWN;

    private static readonly WRAP = -2;

    private mWrapBehaviorInParent = ConstraintWidget.WRAP_BEHAVIOR_INCLUDED;

    public mMatchConstraintDefaultWidth = ConstraintWidget.MATCH_CONSTRAINT_SPREAD;
    public mMatchConstraintDefaultHeight = ConstraintWidget.MATCH_CONSTRAINT_SPREAD;
    public mResolvedMatchConstraintDefault = new Array<number>(2);

    public mMatchConstraintMinWidth = 0;
    public mMatchConstraintMaxWidth = 0;
    public mMatchConstraintPercentWidth = 1;
    public mMatchConstraintMinHeight = 0;
    public mMatchConstraintMaxHeight = 0;
    public mMatchConstraintPercentHeight = 1;
    public mIsWidthWrapContent: boolean = false
    public mIsHeightWrapContent: boolean = false

    mResolvedDimensionRatioSide = ConstraintWidget.UNKNOWN;
    mResolvedDimensionRatio = 1.0

    private mMaxDimension = [Number.MAX_VALUE, Number.MAX_VALUE]
    public mCircleConstraintAngle = Number.NaN;
    private mHasBaseline = false;
    private mInPlaceholder = false

    private mInVirtualLayout = false;

    public isInVirtualLayout() {
        return this.mInVirtualLayout;
    }

    public setInVirtualLayout(inVirtualLayout: boolean) {
        this.mInVirtualLayout = inVirtualLayout;
    }

    public getMaxHeight() {
        return this.mMaxDimension[ConstraintWidget.VERTICAL]
    }

    public getMaxWidth() {
        return this.mMaxDimension[ConstraintWidget.HORIZONTAL];
    }

    public setMaxWidth(maxWidth: number) {
        this.mMaxDimension[ConstraintWidget.HORIZONTAL] = maxWidth;
    }

    public setMaxHeight(maxHeight: number) {
        this.mMaxDimension[ConstraintWidget.VERTICAL] = maxHeight;
    }

    public isSpreadWidth() {
        return this.mMatchConstraintDefaultWidth == ConstraintWidget.MATCH_CONSTRAINT_SPREAD
            && this.mDimensionRatio == 0
            && this.mMatchConstraintMinWidth == 0
            && this.mMatchConstraintMaxWidth == 0
            && this.mListDimensionBehaviors[ConstraintWidget.HORIZONTAL] == DimensionBehaviour.MATCH_CONSTRAINT;
    }

    public isSpreadHeight() {
        return this.mMatchConstraintDefaultHeight == ConstraintWidget.MATCH_CONSTRAINT_SPREAD
            && this.mDimensionRatio == 0
            && this.mMatchConstraintMinHeight == 0
            && this.mMatchConstraintMaxHeight == 0
            && this.mListDimensionBehaviors[ConstraintWidget.VERTICAL] == DimensionBehaviour.MATCH_CONSTRAINT;
    }

    public setHasBaseline(hasBaseline: boolean) {
        this.mHasBaseline = hasBaseline;
    }

    public getHasBaseline() {
        return this.mHasBaseline;
    }

    public isInPlaceholder() {
        return this.mInPlaceholder;
    }

    public setInPlaceholder(inPlaceholder: boolean) {
        this.mInPlaceholder = inPlaceholder;
    }

    setInBarrier(orientation: number, value: boolean) {
        this.mIsInBarrier[orientation] = value;
    }

// @TODO: add description
    public isInBarrier(orientation: number) {
        return this.mIsInBarrier[orientation];
    }

    public setMeasureRequested(measureRequested: boolean) {
        this.mMeasureRequested = measureRequested;
    }

    public isMeasureRequested() {
        return this.mMeasureRequested && this.mVisibility != ConstraintWidget.GONE;
    }

    // @TODO: add description
    public setWrapBehaviorInParent(behavior: number) {
        if (behavior >= 0 && behavior <= ConstraintWidget.WRAP_BEHAVIOR_SKIPPED) {
            this.mWrapBehaviorInParent = behavior;
        }
    }

    public getWrapBehaviorInParent() {
        return this.mWrapBehaviorInParent;
    }

    /**
     * Keep a cache of the last measure cache as we can bypass remeasures during the onMeasure...
     * the View's measure cache will only be reset in onLayout, so too late for us.
     */
    private mLastHorizontalMeasureSpec = 0;
    private mLastVerticalMeasureSpec = 0;

    public getLastHorizontalMeasureSpec() {
        return this.mLastHorizontalMeasureSpec;
    }

    public getLastVerticalMeasureSpec() {
        return this.mLastVerticalMeasureSpec;
    }

    // @TODO: add description
    public setLastMeasureSpec(horizontal: number, vertical: number) {
        this.mLastHorizontalMeasureSpec = horizontal;
        this.mLastVerticalMeasureSpec = vertical;
        this.setMeasureRequested(false);
    }

    public mLeft = new ConstraintAnchor(this, ConstraintAnchorType.LEFT);
    public mTop = new ConstraintAnchor(this, ConstraintAnchorType.TOP);
    public mRight = new ConstraintAnchor(this, ConstraintAnchorType.RIGHT);
    public mBottom = new ConstraintAnchor(this, ConstraintAnchorType.BOTTOM);
    public mBaseline = new ConstraintAnchor(this, ConstraintAnchorType.BASELINE);
    mCenterX = new ConstraintAnchor(this, ConstraintAnchorType.CENTER_X);
    mCenterY = new ConstraintAnchor(this, ConstraintAnchorType.CENTER_Y);
    public mCenter = new ConstraintAnchor(this, ConstraintAnchorType.CENTER);

    public static readonly ANCHOR_LEFT = 0;
    public static readonly ANCHOR_RIGHT = 1;
    public static readonly ANCHOR_TOP = 2;
    public static readonly ANCHOR_BOTTOM = 3;
    public static readonly ANCHOR_BASELINE = 4;

    public mListAnchors = [this.mLeft, this.mRight, this.mTop, this.mBottom, this.mBaseline, this.mCenter]
    mAnchors: ConstraintAnchor[] = []

    private mIsInBarrier = new Array<boolean>(2)

    static readonly DIMENSION_HORIZONTAL = 0;
    static readonly DIMENSION_VERTICAL = 1;
    public mListDimensionBehaviors = [DimensionBehaviour.FIXED, DimensionBehaviour.FIXED]

    // Parent of this widget
    public mParent: ConstraintWidget | null = null;

    // Dimensions of the widget
    mWidth = 0;
    mHeight = 0;
    public mDimensionRatio = 0;
    mDimensionRatioSide = ConstraintWidget.UNKNOWN;

    // Origin of the widget
    mX = 0;
    mY = 0;
    mRelX = 0;
    mRelY = 0;

    // Root offset
    mOffsetX = 0;
    mOffsetY = 0;

    mBaselineDistance = 0;

    // Minimum sizes for the widget
    mMinWidth: number = 0
    mMinHeight: number = 0

    // Percentages used for biasing one connection over another when dual connections
    // of the same strength exist
    public static DEFAULT_BIAS = 0.5
    mHorizontalBiasPercent = ConstraintWidget.DEFAULT_BIAS
    mVerticalBiasPercent = ConstraintWidget.DEFAULT_BIAS

    // The companion widget (typically, the real widget we represent)
    private mCompanionWidget: object | null = null

    // This is used to possibly "skip" a position while inside a container. For example,
    // a container like Table can use this to implement empty cells
    // (the item positioned after the empty cell will have a skip value of 1)
    private mContainerItemSkip = 0;

    // Contains the visibility status of the widget (VISIBLE, INVISIBLE, or GONE)
    private mVisibility = ConstraintWidget.VISIBLE;
    // Contains if this widget is animated. Currently only affects gone behaviour
    private mAnimated = false;
    private mDebugName: string | null = null;
    private mType: string | null = null;

    mDistToTop: number = 0
    mDistToLeft: number = 0
    mDistToRight: number = 0
    mDistToBottom: number = 0
    mLeftHasCentered: boolean = false
    mRightHasCentered: boolean = false
    mTopHasCentered: boolean = false
    mBottomHasCentered: boolean = false
    mHorizontalWrapVisited: boolean = false
    mVerticalWrapVisited: boolean = false
    mGroupsToSolver = false;

    // Chain support
    mHorizontalChainStyle = ConstraintWidget.CHAIN_SPREAD;
    mVerticalChainStyle = ConstraintWidget.CHAIN_SPREAD;
    mHorizontalChainFixedPosition: boolean = false
    mVerticalChainFixedPosition: boolean = false

    mWeight = [ConstraintWidget.UNKNOWN, ConstraintWidget.UNKNOWN]

    mListNextMatchConstraintsWidget: (ConstraintWidget | null) [] = [null, null]
    mNextChainWidget: (ConstraintWidget | null)[] = [null, null]

    mHorizontalNextWidget: ConstraintWidget | null = null;
    mVerticalNextWidget: ConstraintWidget | null = null;

    reset() {
        this.mLeft.reset();
        this.mTop.reset();
        this.mRight.reset();
        this.mBottom.reset();
        this.mBaseline.reset();
        this.mCenterX.reset();
        this.mCenterY.reset();
        this.mCenter.reset();
        this.mParent = null;
        this.mCircleConstraintAngle = Number.NaN;
        this.mWidth = 0;
        this.mHeight = 0;
        this.mDimensionRatio = 0;
        this.mDimensionRatioSide = ConstraintWidget.UNKNOWN;
        this.mX = 0;
        this.mY = 0;
        this.mOffsetX = 0;
        this.mOffsetY = 0;
        this.mBaselineDistance = 0;
        this.mMinWidth = 0;
        this.mMinHeight = 0;
        this.mHorizontalBiasPercent = ConstraintWidget.DEFAULT_BIAS;
        this.mVerticalBiasPercent = ConstraintWidget.DEFAULT_BIAS;
        this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_HORIZONTAL] = DimensionBehaviour.FIXED;
        this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_VERTICAL] = DimensionBehaviour.FIXED;
        this.mCompanionWidget = null;
        this.mContainerItemSkip = 0;
        this.mVisibility = ConstraintWidget.VISIBLE;
        this.mType = null;
        this.mHorizontalWrapVisited = false;
        this.mVerticalWrapVisited = false;
        this.mHorizontalChainStyle = ConstraintWidget.CHAIN_SPREAD;
        this.mVerticalChainStyle = ConstraintWidget.CHAIN_SPREAD;
        this.mHorizontalChainFixedPosition = false;
        this.mVerticalChainFixedPosition = false;
        this.mWeight[ConstraintWidget.DIMENSION_HORIZONTAL] = ConstraintWidget.UNKNOWN;
        this.mWeight[ConstraintWidget.DIMENSION_VERTICAL] = ConstraintWidget.UNKNOWN;
        this.mHorizontalResolution = ConstraintWidget.UNKNOWN;
        this.mVerticalResolution = ConstraintWidget.UNKNOWN;
        this.mMaxDimension[ConstraintWidget.HORIZONTAL] = Number.MAX_SAFE_INTEGER;
        this.mMaxDimension[ConstraintWidget.VERTICAL] = Number.MAX_SAFE_INTEGER;
        this.mMatchConstraintDefaultWidth = ConstraintWidget.MATCH_CONSTRAINT_SPREAD;
        this.mMatchConstraintDefaultHeight = ConstraintWidget.MATCH_CONSTRAINT_SPREAD;
        this.mMatchConstraintPercentWidth = 1;
        this.mMatchConstraintPercentHeight = 1;
        this.mMatchConstraintMaxWidth = Number.MAX_SAFE_INTEGER;
        this.mMatchConstraintMaxHeight = Number.MAX_SAFE_INTEGER;
        this.mMatchConstraintMinWidth = 0;
        this.mMatchConstraintMinHeight = 0;
        this.mResolvedHasRatio = false;
        this.mResolvedDimensionRatioSide = ConstraintWidget.UNKNOWN;
        this.mResolvedDimensionRatio = 1
        this.mGroupsToSolver = false;
        this.isTerminalWidget[ConstraintWidget.HORIZONTAL] = true;
        this.isTerminalWidget[ConstraintWidget.VERTICAL] = true;
        this.mInVirtualLayout = false;
        this.mIsInBarrier[ConstraintWidget.HORIZONTAL] = false;
        this.mIsInBarrier[ConstraintWidget.VERTICAL] = false;
        this.mMeasureRequested = true;
        this.mResolvedMatchConstraintDefault[ConstraintWidget.HORIZONTAL] = 0;
        this.mResolvedMatchConstraintDefault[ConstraintWidget.VERTICAL] = 0;
        this.mWidthOverride = -1;
        this.mHeightOverride = -1;
    }

    private serializeAnchor(ret: string[], side: string, a: ConstraintAnchor) {
        if (a.mTarget == null) {
            return;
        }

        ret.push(side);
        ret.push(" : [ '");
        ret.push(a.mTarget.toString());
        ret.push("',");
        ret.push(a.mMargin.toString());
        ret.push(",");
        ret.push(a.mGoneMargin.toString());
        ret.push(",");
        ret.push(" ] ,\n");
    }

    private serializeCircle(ret: string[], a: ConstraintAnchor, angle: number) {
        if (a.mTarget == null || Number.isNaN(angle)) {
            return;
        }

        ret.push("circle : [ '");
        ret.push(a.mTarget.toString());
        ret.push("',");
        ret.push(a.mMargin.toString());
        ret.push(",");
        ret.push(angle.toString());
        ret.push(",");
        ret.push(" ] ,\n");
    }

    private serializeNumberAttribute(ret: string[], type: string, value: number, def: number) {
        if (value == def) {
            return;
        }
        ret.push(type);
        ret.push(" :   ");
        ret.push(value.toString());
        ret.push(",\n");
    }

    private serializeStringAttribute(ret: string[], type: string, value: string, def: string) {
        if (def == value) {
            return;
        }
        ret.push(type);
        ret.push(" :   ");
        ret.push(value);
        ret.push(",\n");
    }

    private serializeDimensionRatio(ret: string[],
                                    type: string,
                                    value: number,
                                    whichSide: number) {
        if (value == 0) {
            return;
        }
        ret.push(type);
        ret.push(" :  [");
        ret.push(value.toString());
        ret.push(",");
        ret.push(whichSide.toString());
        ret.push("");
        ret.push("],\n");
    }

    private serializeSize(ret: string[], type: string, size: number,
                          min: number, max: number, override: number,
                          matchConstraintMin: number, matchConstraintDefault: number,
                          matchConstraintPercent: number,
                          weight: number) {
        ret.push(type);
        ret.push(" :  {\n");
        this.serializeNumberAttribute(ret, "size", size, Number.MIN_SAFE_INTEGER);
        this.serializeNumberAttribute(ret, "min", min, 0);
        this.serializeNumberAttribute(ret, "max", max, Number.MIN_SAFE_INTEGER);
        this.serializeNumberAttribute(ret, "matchMin", matchConstraintMin, 0);
        this.serializeNumberAttribute(ret, "matchDef", matchConstraintDefault, ConstraintWidget.MATCH_CONSTRAINT_SPREAD);
        this.serializeNumberAttribute(ret, "matchPercent", matchConstraintDefault, 1);
        this.serializeNumberAttribute(ret, "matchConstraintPercent", matchConstraintPercent, 1);
        this.serializeNumberAttribute(ret, "weight", weight, 1);
        this.serializeNumberAttribute(ret, "override", override, 1);

        ret.push("},\n");
    }

    public serialize(ret: string[]): string[] {
        ret.push("{\n");
        this.serializeAnchor(ret, "left", this.mLeft);
        this.serializeAnchor(ret, "top", this.mTop);
        this.serializeAnchor(ret, "right", this.mRight);
        this.serializeAnchor(ret, "bottom", this.mBottom);
        this.serializeAnchor(ret, "baseline", this.mBaseline);
        this.serializeAnchor(ret, "centerX", this.mCenterX);
        this.serializeAnchor(ret, "centerY", this.mCenterY);
        this.serializeCircle(ret, this.mCenter, this.mCircleConstraintAngle);

        this.serializeSize(ret, "width",
            this.mWidth,
            this.mMinWidth,
            this.mMaxDimension[ConstraintWidget.HORIZONTAL],
            this.mWidthOverride,
            this.mMatchConstraintMinWidth,
            this.mMatchConstraintDefaultWidth,
            this.mMatchConstraintPercentWidth,
            this.mWeight[ConstraintWidget.DIMENSION_HORIZONTAL]
        );

        this.serializeSize(ret, "height",
            this.mHeight,
            this.mMinHeight,
            this.mMaxDimension[ConstraintWidget.VERTICAL],
            this.mHeightOverride,
            this.mMatchConstraintMinHeight,
            this.mMatchConstraintDefaultHeight,
            this.mMatchConstraintPercentHeight,
            this.mWeight[ConstraintWidget.DIMENSION_VERTICAL]);

        this.serializeDimensionRatio(ret, "dimensionRatio", this.mDimensionRatio, this.mDimensionRatioSide);
        this.serializeNumberAttribute(ret, "horizontalBias", this.mHorizontalBiasPercent, ConstraintWidget.DEFAULT_BIAS);
        this.serializeNumberAttribute(ret, "verticalBias", this.mVerticalBiasPercent, ConstraintWidget.DEFAULT_BIAS);
        ret.push("}\n");

        return ret;
    }

    public horizontalGroup = -1;
    public verticalGroup = -1;

    // @TODO: add description
    public oppositeDimensionDependsOn(orientation: number) {
        let oppositeOrientation = (orientation == ConstraintWidget.HORIZONTAL) ? ConstraintWidget.VERTICAL : ConstraintWidget.HORIZONTAL;
        let dimensionBehaviour = this.mListDimensionBehaviors[orientation];
        let oppositeDimensionBehaviour =
            this.mListDimensionBehaviors[oppositeOrientation];
        return dimensionBehaviour == DimensionBehaviour.MATCH_CONSTRAINT
            && oppositeDimensionBehaviour == DimensionBehaviour.MATCH_CONSTRAINT;
        //&& mDimensionRatio != 0;
    }

    public oppositeDimensionsTied() {
        return (this.mListDimensionBehaviors[ConstraintWidget.HORIZONTAL] == DimensionBehaviour.MATCH_CONSTRAINT
            && this.mListDimensionBehaviors[ConstraintWidget.VERTICAL] == DimensionBehaviour.MATCH_CONSTRAINT);
    }

    // @TODO: add description
    public hasDimensionOverride() {
        return this.mWidthOverride != -1 || this.mHeightOverride != -1;
    }

    /*-----------------------------------------------------------------------*/
    // Creation
    /*-----------------------------------------------------------------------*/

    /**
     * Default constructor
     */
    constructor(x?: number, y?: number, width?: number, height?: number,
                debugName?: string) {
        this.addAnchors()

        if (width && height) {
            this.mX = x!
            this.mY = y!
            this.mWidth = width
            this.mHeight = height
        } else {
            // this.constructor(0, 0, x, y, debugName)
            this.mWidth = x!
            this.mHeight = y!
        }

        if (debugName) {
            this.setDebugName(debugName)
        }
    }


    public ensureWidgetRuns() {
        if (this.mHorizontalRun == null) {
            this.mHorizontalRun = new HorizontalWidgetRun(this);
        }
        if (this.mVerticalRun == null) {
            this.mVerticalRun = new VerticalWidgetRun(this);
        }
    }

    public resetSolverVariables(cache: Cache) {
        this.mLeft.resetSolverVariable(cache);
        this.mTop.resetSolverVariable(cache);
        this.mRight.resetSolverVariable(cache);
        this.mBottom.resetSolverVariable(cache);
        this.mBaseline.resetSolverVariable(cache);
        this.mCenter.resetSolverVariable(cache);
        this.mCenterX.resetSolverVariable(cache);
        this.mCenterY.resetSolverVariable(cache);
    }

    private addAnchors() {
        this.mAnchors.push(this.mLeft);
        this.mAnchors.push(this.mTop);
        this.mAnchors.push(this.mRight);
        this.mAnchors.push(this.mBottom);
        this.mAnchors.push(this.mCenterX);
        this.mAnchors.push(this.mCenterY);
        this.mAnchors.push(this.mCenter);
        this.mAnchors.push(this.mBaseline);
    }

    public isRoot() {
        return this.mParent == null;
    }

    getParent() {
        return this.mParent
    }

    public setParent(widget: ConstraintWidget) {
        this.mParent = widget;
    }

    public setWidthWrapContent(widthWrapContent: boolean) {
        this.mIsWidthWrapContent = widthWrapContent;
    }

    /**
     * Returns true if width is set to wrap_content
     */
    public isWidthWrapContent() {
        return this.mIsWidthWrapContent;
    }

    /**
     * Keep track of wrap_content for height
     */
    public setHeightWrapContent(heightWrapContent: boolean) {
        this.mIsHeightWrapContent = heightWrapContent;
    }

    /**
     * Returns true if height is set to wrap_content
     */
    public isHeightWrapContent() {
        return this.mIsHeightWrapContent;
    }

    public connectCircularConstraint(target: ConstraintWidget, angle: number, radius: number) {
        this.immediateConnect(ConstraintAnchorType.CENTER, target, ConstraintAnchorType.CENTER,
            radius, 0);
        this.mCircleConstraintAngle = angle;
    }

    /**
     * Returns the type string if set
     *
     * @return type (null if not set)
     */
    public getType() {
        return this.mType;
    }

    /**
     * Set the type of the widget (as a String)
     *
     * @param type type of the widget
     */
    public setType(type: string) {
        this.mType = type;
    }

    public setVisibility(visibility: number) {
        this.mVisibility = visibility;
    }

    /**
     * Returns the current visibility value for this widget
     *
     * @return the visibility (VISIBLE, INVISIBLE, or GONE)
     */
    public getVisibility() {
        return this.mVisibility;
    }

    /**
     * Set if this widget is animated. Currently only affects gone behaviour
     *
     * @param animated if true the widget must be positioned correctly when not visible
     */
    public setAnimated(animated: boolean) {
        this.mAnimated = animated;
    }

    /**
     * Returns if this widget is animated. Currently only affects gone behaviour
     *
     * @return true if ConstraintWidget is used in Animation
     */
    public isAnimated() {
        return this.mAnimated;
    }

    public getDebugName() {
        return this.mDebugName;
    }

    setDebugName(name: string) {
        this.mDebugName = name;
    }

    public setDebugSolverName(system: LinearSystem, name: string) {
        this.mDebugName = name;
        let left = system.createObjectVariable(this.mLeft)!
        let top = system.createObjectVariable(this.mTop)!
        let right = system.createObjectVariable(this.mRight)!
        let bottom = system.createObjectVariable(this.mBottom)!
        left.setName(name + ".left");
        top.setName(name + ".top");
        right.setName(name + ".right");
        bottom.setName(name + ".bottom");
        let baseline = system.createObjectVariable(this.mBaseline)!
        baseline.setName(name + ".baseline");
    }

    public createObjectVariables(system: LinearSystem) {
        system.createObjectVariable(this.mLeft);
        system.createObjectVariable(this.mTop);
        system.createObjectVariable(this.mRight);
        system.createObjectVariable(this.mBottom);
        if (this.mBaselineDistance > 0) {
            system.createObjectVariable(this.mBaseline);
        }
    }

    toString() {
        return (this.mType != null ? "type: " + this.mType + " " : "")
            + (this.mDebugName != null ? "id: " + this.mDebugName + " " : "")
            + "(" + this.mX + ", " + this.mY + ") - (" + this.mWidth + " x " + this.mHeight + ")";
    }

    getX() {
        if (this.mParent != null && this.mParent instanceof ConstraintWidgetContainer) {
            return (this.mParent as ConstraintWidgetContainer).mPaddingLeft + this.mX;
        }
        return this.mX;
    }

    getY() {
        if (this.mParent != null && this.mParent instanceof ConstraintWidgetContainer) {
            return (this.mParent as ConstraintWidgetContainer).mPaddingTop + this.mY;
        }
        return this.mY;
    }

    getWidth() {
        if (this.mVisibility == ConstraintWidget.GONE) {
            return 0;
        }
        return this.mWidth;
    }

    getOptimizerWrapWidth() {
        let w = this.mWidth;
        if ((this.mListDimensionBehaviors)[ConstraintWidget.DIMENSION_HORIZONTAL] == DimensionBehaviour.MATCH_CONSTRAINT) {
            if (this.mMatchConstraintDefaultWidth == ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
                w = Math.max(this.mMatchConstraintMinWidth, w);
            } else if (this.mMatchConstraintMinWidth > 0) {
                w = this.mMatchConstraintMinWidth;
                this.mWidth = w;
            } else {
                w = 0;
            }
            if (this.mMatchConstraintMaxWidth > 0 && this.mMatchConstraintMaxWidth < w) {
                w = this.mMatchConstraintMaxWidth;
            }
        }
        return w;
    }

    getOptimizerWrapHeight() {
        let h = this.mHeight;
        if ((this.mListDimensionBehaviors)[ConstraintWidget.DIMENSION_VERTICAL] == DimensionBehaviour.MATCH_CONSTRAINT) {
            if (this.mMatchConstraintDefaultHeight == ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
                h = Math.max(this.mMatchConstraintMinHeight, h);
            } else if (this.mMatchConstraintMinHeight > 0) {
                h = this.mMatchConstraintMinHeight;
                this.mHeight = h;
            } else {
                h = 0;
            }
            if (this.mMatchConstraintMaxHeight > 0 && this.mMatchConstraintMaxHeight < h) {
                h = this.mMatchConstraintMaxHeight;
            }
        }
        return h;
    }

    getHeight() {
        if (this.mVisibility == ConstraintWidget.GONE) {
            return 0;
        }
        return this.mHeight;
    }

    getLength(orientation: number) {
        if (orientation == ConstraintWidget.HORIZONTAL) {
            return this.getWidth();
        } else if (orientation == ConstraintWidget.VERTICAL) {
            return this.getHeight();
        } else {
            return 0;
        }
    }

    getRootX() {
        return this.mX + this.mOffsetX
    }

    getRootY() {
        return this.mY + this.mOffsetY
    }

    getMinWidth() {
        return this.mMinWidth
    }

    getMinHeight() {
        return this.mMinHeight
    }

    getLeft() {
        return this.getX()
    }

    getTop() {
        return this.getY()
    }

    getRight() {
        return this.getX() + this.mWidth
    }

    getBottom() {
        return this.getY() + this.mHeight
    }

    getHorizontalMargin() {
        let margin = 0;
        if (this.mLeft != null) {
            margin += this.mLeft.mMargin;
        }
        if (this.mRight != null) {
            margin += this.mRight.mMargin;
        }
        return margin;
    }

    getVerticalMargin() {
        let margin = 0;
        if (this.mLeft != null) {
            margin += this.mTop.mMargin;
        }
        if (this.mRight != null) {
            margin += this.mBottom.mMargin;
        }
        return margin;
    }

    getHorizontalBiasPercent() {
        return this.mHorizontalBiasPercent
    }

    getVerticalBiasPercent() {
        return this.mVerticalBiasPercent
    }

    getBiasPercent(orientation: number) {
        if (orientation == ConstraintWidget.HORIZONTAL) {
            return this.mHorizontalBiasPercent;
        } else if (orientation == ConstraintWidget.VERTICAL) {
            return this.mVerticalBiasPercent;
        } else {
            return ConstraintWidget.UNKNOWN;
        }
    }

    public hasBaseline() {
        return this.mHasBaseline;
    }

    getBaselineDistance() {
        return this.mBaselineDistance
    }

    getCompanionWidget() {
        return this.mCompanionWidget
    }

    getAnchors() {
        return this.mAnchors
    }

    setX(x: number) {
        this.mX = x
    }

    setY(y: number) {
        this.mY = y
    }

    setOrigin(x: number, y: number) {
        this.mX = x
        this.mY = y
    }

    setOffset(x: number, y: number) {
        this.mOffsetX = x;
        this.mOffsetY = y;
    }

    setGoneMargin(type: ConstraintAnchorType, goneMargin: number) {
        switch (type) {
            case ConstraintAnchorType.LEFT: {
                this.mLeft.mGoneMargin = goneMargin;
            }
                break;
            case ConstraintAnchorType.TOP: {
                this.mTop.mGoneMargin = goneMargin;
            }
                break;
            case ConstraintAnchorType.RIGHT: {
                this.mRight.mGoneMargin = goneMargin;
            }
                break;
            case ConstraintAnchorType.BOTTOM: {
                this.mBottom.mGoneMargin = goneMargin;
            }
                break;
            case ConstraintAnchorType.BASELINE: {
                this.mBaseline.mGoneMargin = goneMargin;
            }
                break;
            case ConstraintAnchorType.CENTER:
            case ConstraintAnchorType.CENTER_X:
            case ConstraintAnchorType.CENTER_Y:
            case ConstraintAnchorType.NONE:
                break;
        }
    }

    setWidth(w: number) {
        this.mWidth = w;
        if (this.mWidth < this.mMinWidth) {
            this.mWidth = this.mMinWidth;
        }
    }

    setHeight(h: number) {
        this.mHeight = h;
        if (this.mHeight < this.mMinHeight) {
            this.mHeight = this.mMinHeight;
        }
    }

    setLength(length: number, orientation: number) {
        if (orientation == ConstraintWidget.HORIZONTAL) {
            this.setWidth(length);
        } else if (orientation == ConstraintWidget.VERTICAL) {
            this.setHeight(length);
        }
    }

    setHorizontalMatchStyle(horizontalMatchStyle: number, min: number, max: number, percent: number) {
        this.mMatchConstraintDefaultWidth = horizontalMatchStyle;
        this.mMatchConstraintMinWidth = min;
        this.mMatchConstraintMaxWidth = (max == Number.MAX_SAFE_INTEGER) ? 0 : max;
        this.mMatchConstraintPercentWidth = percent;
        if (percent > 0 && percent < 1 && this.mMatchConstraintDefaultWidth == ConstraintWidget.MATCH_CONSTRAINT_SPREAD) {
            this.mMatchConstraintDefaultWidth = ConstraintWidget.MATCH_CONSTRAINT_PERCENT;
        }
    }

    public setVerticalMatchStyle(verticalMatchStyle: number, min: number, max: number, percent: number) {
        this.mMatchConstraintDefaultHeight = verticalMatchStyle;
        this.mMatchConstraintMinHeight = min;
        this.mMatchConstraintMaxHeight = (max == Number.MAX_SAFE_INTEGER) ? 0 : max;
        this.mMatchConstraintPercentHeight = percent;
        if (percent > 0 && percent < 1
            && this.mMatchConstraintDefaultHeight == ConstraintWidget.MATCH_CONSTRAINT_SPREAD) {
            this.mMatchConstraintDefaultHeight = ConstraintWidget.MATCH_CONSTRAINT_PERCENT;
        }
    }

    setDimensionRatioString(ratio: string) {
        if (ratio == null || ratio.length == 0) {
            this.mDimensionRatio = 0;
            return;
        }
        let dimensionRatioSide = ConstraintWidget.UNKNOWN;
        let dimensionRatio = 0;
        let len = ratio.length
        let commaIndex = ratio.indexOf(',');
        if (commaIndex > 0 && commaIndex < len - 1) {
            let dimension = ratio.substring(0, commaIndex);
            if (dimension.toLowerCase() == "w") {//if (dimension.equalsIgnoreCase("W")) {
                dimensionRatioSide = ConstraintWidget.HORIZONTAL;
            } else if (dimension.toLowerCase() == "h") {//if (dimension.equalsIgnoreCase("H")) {
                dimensionRatioSide = ConstraintWidget.VERTICAL;
            }
            commaIndex++;
        } else {
            commaIndex = 0;
        }
        let colonIndex = ratio.indexOf(':');

        if (colonIndex >= 0 && colonIndex < len - 1) {
            let nominator = ratio.substring(commaIndex, colonIndex);
            let denominator = ratio.substring(colonIndex + 1);
            if (nominator.length > 0 && denominator.length > 0) {
                try {
                    let nominatorValue = Number.parseFloat(nominator);
                    let denominatorValue = Number.parseFloat(denominator);
                    if (nominatorValue > 0 && denominatorValue > 0) {
                        if (dimensionRatioSide == ConstraintWidget.VERTICAL) {
                            dimensionRatio = Math.abs(denominatorValue / nominatorValue);
                        } else {
                            dimensionRatio = Math.abs(nominatorValue / denominatorValue);
                        }
                    }
                } catch (e: any) {
                    // Ignore
                }
            }
        } else {
            let r = ratio.substring(commaIndex);
            if (r.length > 0) {
                try {
                    dimensionRatio = Number.parseFloat(r);
                } catch (e: any) {
                    // Ignore
                }
            }
        }

        if (dimensionRatio > 0) {
            this.mDimensionRatio = dimensionRatio;
            this.mDimensionRatioSide = dimensionRatioSide;
        }
    }

    setDimensionRatio(ratio: number, dimensionRatioSide: number) {
        this.mDimensionRatio = ratio
        this.mDimensionRatioSide = dimensionRatioSide
    }

    getDimensionRatio() {
        return this.mDimensionRatio
    }

    getDimensionRatioSide() {
        return this.mDimensionRatioSide
    }

    setHorizontalBiasPercent(horizontalBiasPercent: number) {
        this.mHorizontalBiasPercent = horizontalBiasPercent
    }

    setVerticalBiasPercent(verticalBiasPercent: number) {
        this.mVerticalBiasPercent = verticalBiasPercent;
    }

    setMinWidth(w: number) {
        if (w < 0) {
            this.mMinWidth = 0;
        } else {
            this.mMinWidth = w;
        }
    }

    setMinHeight(h: number) {
        if (h < 0) {
            this.mMinHeight = 0;
        } else {
            this.mMinHeight = h;
        }
    }

    setDimension(w: number, h: number) {
        this.mWidth = w
        if (this.mWidth < this.mMinWidth) {
            this.mWidth = this.mMinWidth;
        }
        this.mHeight = h;
        if (this.mHeight < this.mMinHeight) {
            this.mHeight = this.mMinHeight;
        }
    }


    setFrameBounds(left: number, top: number, right: number, bottom: number) {
        let w = right - left
        let h = bottom - top

        this.mX = left
        this.mY = top

        if (this.mVisibility == ConstraintWidget.GONE) {
            this.mWidth = 0
            this.mHeight = 0
            return
        }

        if ((this.mListDimensionBehaviors)[ConstraintWidget.DIMENSION_HORIZONTAL]
            == DimensionBehaviour.FIXED && w < this.mWidth) {
            w = this.mWidth;
        }
        if ((this.mListDimensionBehaviors)[ConstraintWidget.DIMENSION_VERTICAL]
            == DimensionBehaviour.FIXED && h < this.mHeight) {
            h = this.mHeight;
        }

        this.mWidth = w;
        this.mHeight = h;

        if (this.mHeight < this.mMinHeight) {
            this.mHeight = this.mMinHeight;
        }
        if (this.mWidth < this.mMinWidth) {
            this.mWidth = this.mMinWidth;
        }
        if (this.mMatchConstraintMaxWidth > 0
            && this.mListDimensionBehaviors[ConstraintWidget.HORIZONTAL] == DimensionBehaviour.MATCH_CONSTRAINT) {
            this.mWidth = Math.min(this.mWidth, this.mMatchConstraintMaxWidth);
        }

        if (this.mMatchConstraintMaxHeight > 0
            && this.mListDimensionBehaviors[ConstraintWidget.VERTICAL] == DimensionBehaviour.MATCH_CONSTRAINT) {
            this.mHeight = Math.min(this.mHeight, this.mMatchConstraintMaxHeight);
        }
        if (w != this.mWidth) {
            this.mWidthOverride = this.mWidth;
        }
        if (h != this.mHeight) {
            this.mHeightOverride = this.mHeight;
        }
    }

    public setFrame(start: number, end: number, orientation: number) {
        if (orientation == ConstraintWidget.HORIZONTAL) {
            this.setHorizontalDimension(start, end);
        } else if (orientation == ConstraintWidget.VERTICAL) {
            this.setVerticalDimension(start, end);
        }
    }

    public setHorizontalDimension(left: number, right: number) {
        this.mX = left;
        this.mWidth = right - left;
        if (this.mWidth < this.mMinWidth) {
            this.mWidth = this.mMinWidth;
        }
    }

    /**
     * Set the positions for the vertical dimension only
     *
     * @param top    top side position of the widget
     * @param bottom bottom side position of the widget
     */
    public setVerticalDimension(top: number, bottom: number) {
        this.mY = top;
        this.mHeight = bottom - top;
        if (this.mHeight < this.mMinHeight) {
            this.mHeight = this.mMinHeight;
        }
    }

    getRelativePositioning(orientation: number) {
        if (orientation == ConstraintWidget.HORIZONTAL) {
            return this.mRelX;
        } else if (orientation == ConstraintWidget.VERTICAL) {
            return this.mRelY;
        } else {
            return 0;
        }
    }

    /**
     * Set the left/top position of the widget relative to
     * the outer side of the container (right/bottom).
     *
     * @param offset      Offset of the relative position.
     * @param orientation Orientation of the offset being set.
     */
    setRelativePositioning(offset: number, orientation: number) {
        if (orientation == ConstraintWidget.HORIZONTAL) {
            this.mRelX = offset;
        } else if (orientation == ConstraintWidget.VERTICAL) {
            this.mRelY = offset;
        }
    }

    public setBaselineDistance(baseline: number) {
        this.mBaselineDistance = baseline;
        this.mHasBaseline = baseline > 0;
    }

    setCompanionWidget(companion: object) {
        this.mCompanionWidget = companion
    }

    public setContainerItemSkip(skip: number) {
        if (skip >= 0) {
            this.mContainerItemSkip = skip;
        } else {
            this.mContainerItemSkip = 0;
        }
    }

    getContainerItemSkip() {
        return this.mContainerItemSkip
    }

    setHorizontalWeight(horizontalWeight: number) {
        this.mWeight[ConstraintWidget.HORIZONTAL] = horizontalWeight
    }

    setVerticalWeight(verticalWeight: number) {
        this.mWeight[ConstraintWidget.DIMENSION_VERTICAL] = verticalWeight
    }

    setHorizontalChainStyle(horizontalChainStyle: number) {
        this.mHorizontalChainStyle = horizontalChainStyle
    }

    getHorizontalChainStyle() {
        return this.mHorizontalChainStyle
    }

    setVerticalChainStyle(verticalChainStyle: number) {
        this.mVerticalChainStyle = verticalChainStyle
    }

    getVerticalChainStyle() {
        return this.mVerticalChainStyle
    }

    allowedInBarrier() {
        return this.mVisibility != ConstraintWidget.GONE
    }

    ////

    immediateConnect(startType: ConstraintAnchorType, target: ConstraintWidget, endType: ConstraintAnchorType, margin: number, goneMargin: number) {
        console.log("immediate connect")

        let startAnchor = this.getAnchor(startType)
        let endAnchor = target.getAnchor(endType)
        startAnchor!.connectFull(endAnchor!, margin, goneMargin, true)
    }

    connect(from: ConstraintAnchor, to: ConstraintAnchor, margin: number) {
        if (from.getOwner() == this) {
            this.connectWithMargin(from.getType(), to.getOwner(), to.getType(), margin)
        }
    }

    connectAnchors(constraintFrom: ConstraintAnchorType, target: ConstraintWidget, constraintTo: ConstraintAnchorType) {
        this.connectWithMargin(constraintFrom, target, constraintTo, 0)
    }

    connectWithMargin(constraintFrom: ConstraintAnchorType, target: ConstraintWidget, constraintTo: ConstraintAnchorType, margin: number) {
        if (constraintFrom == ConstraintAnchorType.CENTER) {
            if (constraintTo == ConstraintAnchorType.CENTER) {
                let left = this.getAnchor(ConstraintAnchorType.LEFT)
                let right = this.getAnchor(ConstraintAnchorType.RIGHT)
                let top = this.getAnchor(ConstraintAnchorType.TOP)
                let bottom = this.getAnchor(ConstraintAnchorType.BOTTOM)

                let centerX = false
                let centerY = false

                if ((left != null && left.isConnected()) || (right != null && right.isConnected())) {

                } else {
                    this.connectWithMargin(ConstraintAnchorType.LEFT, target, ConstraintAnchorType.LEFT, 0)
                    this.connectWithMargin(ConstraintAnchorType.RIGHT, target, ConstraintAnchorType.RIGHT, 0)

                    centerX = true
                }

                if ((top != null && top.isConnected()) || (bottom != null && bottom.isConnected())) {

                } else {
                    this.connectWithMargin(ConstraintAnchorType.TOP, target, ConstraintAnchorType.TOP, 0)
                    this.connectWithMargin(ConstraintAnchorType.BOTTOM, target, ConstraintAnchorType.BOTTOM, 0)

                    centerY = true
                }

                if (centerX && centerY) {
                    let center = this.getAnchor(ConstraintAnchorType.CENTER)
                    center?.connect(target.getAnchor(ConstraintAnchorType.CENTER)!, 0)
                } else if (centerX) {
                    let center = this.getAnchor(ConstraintAnchorType.CENTER_X)
                    center?.connect(target.getAnchor(ConstraintAnchorType.CENTER_X)!, 0)
                } else if (centerY) {
                    let center = this.getAnchor(ConstraintAnchorType.CENTER_Y)
                    center?.connect(target.getAnchor(ConstraintAnchorType.CENTER_Y)!, 0)
                }
            } else if ((constraintTo == ConstraintAnchorType.LEFT)
                || (constraintTo == ConstraintAnchorType.RIGHT)) {
                this.connectWithMargin(ConstraintAnchorType.LEFT, target,
                    constraintTo, 0);
                this.connectWithMargin(ConstraintAnchorType.RIGHT, target,
                    constraintTo, 0);
                let center = this.getAnchor(ConstraintAnchorType.CENTER)!
                center.connect(target.getAnchor(constraintTo)!, 0);
            } else if ((constraintTo == ConstraintAnchorType.TOP)
                || (constraintTo == ConstraintAnchorType.BOTTOM)) {
                this.connectWithMargin(ConstraintAnchorType.TOP, target,
                    constraintTo, 0);
                this.connectWithMargin(ConstraintAnchorType.BOTTOM, target,
                    constraintTo, 0);
                let center = this.getAnchor(ConstraintAnchorType.CENTER)!
                center.connect(target.getAnchor(constraintTo)!, 0);
            }
        } else if (constraintFrom == ConstraintAnchorType.CENTER_X
            && (constraintTo == ConstraintAnchorType.LEFT
                || constraintTo == ConstraintAnchorType.RIGHT)) {
            let left = this.getAnchor(ConstraintAnchorType.LEFT)!
            let targetAnchor = target.getAnchor(constraintTo)!
            let right = this.getAnchor(ConstraintAnchorType.RIGHT)!
            left.connect(targetAnchor, 0)
            right.connect(targetAnchor, 0)
            let centerX = this.getAnchor(ConstraintAnchorType.CENTER_X)!
            centerX.connect(targetAnchor, 0)
        } else if (constraintFrom == ConstraintAnchorType.CENTER_Y
            && (constraintTo == ConstraintAnchorType.TOP
                || constraintTo == ConstraintAnchorType.BOTTOM)) {
            let targetAnchor = target.getAnchor(constraintTo)!
            let top = this.getAnchor(ConstraintAnchorType.TOP)!
            top.connect(targetAnchor, 0)
            let bottom = this.getAnchor(ConstraintAnchorType.BOTTOM)!
            bottom.connect(targetAnchor, 0)
            let centerY = this.getAnchor(ConstraintAnchorType.CENTER_Y)!
            centerY.connect(targetAnchor, 0)
        } else if (constraintFrom == ConstraintAnchorType.CENTER_X
            && constraintTo == ConstraintAnchorType.CENTER_X) {
            // Center X connection will connect left & right
            let left = this.getAnchor(ConstraintAnchorType.LEFT)!
            let leftTarget = target.getAnchor(ConstraintAnchorType.LEFT)!
            left.connect(leftTarget, 0)
            let right = this.getAnchor(ConstraintAnchorType.RIGHT)!
            let rightTarget = target.getAnchor(ConstraintAnchorType.RIGHT)!
            right.connect(rightTarget, 0)
            let centerX = this.getAnchor(ConstraintAnchorType.CENTER_X)!
            centerX.connect(target.getAnchor(constraintTo)!, 0)
        } else if (constraintFrom == ConstraintAnchorType.CENTER_Y
            && constraintTo == ConstraintAnchorType.CENTER_Y) {
            // Center Y connection will connect top & bottom.
            let top = this.getAnchor(ConstraintAnchorType.TOP)!
            let topTarget = target.getAnchor(ConstraintAnchorType.TOP)!
            top.connect(topTarget, 0)
            let bottom = this.getAnchor(ConstraintAnchorType.BOTTOM)!
            let bottomTarget = target.getAnchor(ConstraintAnchorType.BOTTOM)!
            bottom.connect(bottomTarget, 0)
            let centerY = this.getAnchor(ConstraintAnchorType.CENTER_Y)!
            centerY.connect(target.getAnchor(constraintTo)!, 0)
        } else {
            let fromAnchor = this.getAnchor(constraintFrom)!
            let toAnchor = this.getAnchor(constraintTo)!

            if (fromAnchor?.isValidConnection(toAnchor)) {
                if (constraintFrom == ConstraintAnchorType.BASELINE) {
                    let top = this.getAnchor(ConstraintAnchorType.TOP)
                    let bottom = this.getAnchor(ConstraintAnchorType.BOTTOM)
                    if (top != null) {
                        top.reset()
                    }
                    if (bottom != null) {
                        bottom.reset()
                    }
                } else if ((constraintFrom == ConstraintAnchorType.TOP)
                    || (constraintFrom == ConstraintAnchorType.BOTTOM)) {
                    let baseline = this.getAnchor(ConstraintAnchorType.BASELINE)
                    if (baseline != null) {
                        baseline.reset()
                    }
                    let center = this.getAnchor(ConstraintAnchorType.CENTER)!
                    if (center.getTarget() != toAnchor) {
                        center.reset()
                    }
                    let opposite = this.getAnchor(constraintFrom)!.getOpposite()!
                    let centerY = this.getAnchor(ConstraintAnchorType.CENTER_Y)!
                    if (centerY.isConnected()) {
                        opposite.reset()
                        centerY.reset()
                    } else {
                        if (ConstraintWidget.AUTOTAG_CENTER) {
                            // let's see if we need to mark center_y as connected
                            if (opposite.isConnected() && opposite.getTarget()!.getOwner() == toAnchor.getOwner()) {
                                let targetCenterY = toAnchor.getOwner().getAnchor(ConstraintAnchorType.CENTER_Y)!
                                centerY.connect(targetCenterY, 0)
                            }
                        }
                    }
                } else if ((constraintFrom == ConstraintAnchorType.LEFT)
                    || (constraintFrom == ConstraintAnchorType.RIGHT)) {
                    let center = this.getAnchor(ConstraintAnchorType.CENTER)!
                    if (center.getTarget() != toAnchor) {
                        center.reset()
                    }
                    let opposite = this.getAnchor(constraintFrom)!.getOpposite()!
                    let centerX = this.getAnchor(ConstraintAnchorType.CENTER_X)!
                    if (centerX.isConnected()) {
                        opposite.reset()
                        centerX.reset()
                    } else {
                        if (ConstraintWidget.AUTOTAG_CENTER) {
                            // let's see if we need to mark center_x as connected
                            if (opposite.isConnected() && opposite.getTarget()!.getOwner() == toAnchor.getOwner()) {
                                let targetCenterX = toAnchor.getOwner().getAnchor(ConstraintAnchorType.CENTER_X)!
                                centerX.connect(targetCenterX, 0)
                            }
                        }
                    }

                }
                fromAnchor.connect(toAnchor, margin)
            }
        }
    }

    resetAllConstraints() {
        this.resetAnchors()
        this.setVerticalBiasPercent(ConstraintWidget.DEFAULT_BIAS)
        this.setHorizontalBiasPercent(ConstraintWidget.DEFAULT_BIAS)
    }

    resetAnchor(anchor: ConstraintAnchor) {
        if (this.getParent() != null) {
            if (this.getParent() instanceof ConstraintWidgetContainer) {
                let parent = this.getParent() as ConstraintWidgetContainer

                if (parent.handlesInternalConstraints()) {
                    return
                }
            }
        }

        let left = this.getAnchor(ConstraintAnchorType.LEFT)!
        let right = this.getAnchor(ConstraintAnchorType.RIGHT)!
        let top = this.getAnchor(ConstraintAnchorType.TOP)!
        let bottom = this.getAnchor(ConstraintAnchorType.BOTTOM)!
        let center = this.getAnchor(ConstraintAnchorType.CENTER)!
        let centerX = this.getAnchor(ConstraintAnchorType.CENTER_X)!
        let centerY = this.getAnchor(ConstraintAnchorType.CENTER_Y)!

        if (anchor == center) {
            if (left.isConnected() && right.isConnected() && left.getTarget()!.getOwner() == right.getTarget()!.getOwner()) {
                left.reset()
                right.reset()
            }

            if (top.isConnected() && bottom.isConnected() && top.getTarget()!.getOwner() == bottom.getTarget()!.getOwner()) {
                top.reset()
                bottom.reset()
            }

            this.mHorizontalBiasPercent = 0.5
            this.mVerticalBiasPercent = 0.5
        } else if (anchor == centerX) {
            if (left.isConnected() && right.isConnected() && left.getTarget()!.getOwner() == right.getTarget()!.getOwner()) {
                left.reset();
                right.reset();
            }
            this.mHorizontalBiasPercent = 0.5
        } else if (anchor == centerY) {
            if (top.isConnected() && bottom.isConnected() && top.getTarget()!.getOwner() == bottom.getTarget()!.getOwner()) {
                top.reset();
                bottom.reset();
            }
            this.mVerticalBiasPercent = 0.5
        } else if (anchor == left || anchor == right) {
            if (left.isConnected() && left.getTarget() == right.getTarget()) {
                center.reset();
            }
        } else if (anchor == top || anchor == bottom) {
            if (top.isConnected() && top.getTarget() == bottom.getTarget()) {
                center.reset();
            }
        }

        anchor.reset()
    }

    resetAnchors() {
        let parent = this.getParent()

        if (parent != null && parent instanceof ConstraintWidgetContainer) {
            let parentContainer = this.getParent() as ConstraintWidgetContainer
            if (parentContainer.handlesInternalConstraints()) {
                return;
            }
        }

        for (let i = 0, mAnchorsSize = this.mAnchors.length; i < mAnchorsSize; i++) {
            const anchor = this.mAnchors[i]
            anchor.reset();
        }
    }

    getAnchor(anchorType: ConstraintAnchorType) {
        switch (anchorType) {
            case ConstraintAnchorType.LEFT: {
                return this.mLeft;
            }
            case ConstraintAnchorType.TOP: {
                return this.mTop;
            }
            case ConstraintAnchorType.RIGHT: {
                return this.mRight;
            }
            case ConstraintAnchorType.BOTTOM: {
                return this.mBottom;
            }
            case ConstraintAnchorType.BASELINE: {
                return this.mBaseline;
            }
            case ConstraintAnchorType.CENTER_X: {
                return this.mCenterX;
            }
            case ConstraintAnchorType.CENTER_Y: {
                return this.mCenterY;
            }
            case ConstraintAnchorType.CENTER: {
                return this.mCenter;
            }
            case ConstraintAnchorType.NONE:
                return null;
        }
        throw new Error(anchorType);
    }

    getHorizontalDimensionBehaviour() {
        return this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_HORIZONTAL]
    }

    getVerticalDimensionBehaviour() {
        return this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_VERTICAL]
    }

    getDimensionBehaviour(orientation: number) {
        if (orientation == ConstraintWidget.HORIZONTAL) {
            return this.getHorizontalDimensionBehaviour();
        } else if (orientation == ConstraintWidget.VERTICAL) {
            return this.getVerticalDimensionBehaviour();
        } else {
            return null;
        }
    }

    setHorizontalDimensionBehaviour(behaviour: DimensionBehaviour) {
        this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_HORIZONTAL] = behaviour
    }

    setVerticalDimensionBehaviour(behaviour: DimensionBehaviour) {
        this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_VERTICAL] = behaviour
    }

    isInHorizontalChain() {
        if ((this.mLeft.mTarget != null && this.mLeft.mTarget.mTarget == this.mLeft) || (this.mRight.mTarget != null && this.mRight.mTarget.mTarget == this.mRight)) {
            return true;
        }
        return false
    }

    getPreviousChainMember(orientation: number) {
        if (orientation == ConstraintWidget.HORIZONTAL) {
            if (this.mLeft.mTarget != null && this.mLeft.mTarget.mTarget == this.mLeft) {
                return this.mLeft.mTarget.mOwner;
            }
        } else if (orientation == ConstraintWidget.VERTICAL) {
            if (this.mTop.mTarget != null && this.mTop.mTarget.mTarget == this.mTop) {
                return this.mTop.mTarget.mOwner;
            }
        }
        return null;
    }

    getNextChainMember(orientation: number) {
        if (orientation == ConstraintWidget.HORIZONTAL) {
            if (this.mRight.mTarget != null && this.mRight.mTarget.mTarget == this.mRight) {
                return this.mRight.mTarget.mOwner;
            }
        } else if (orientation == ConstraintWidget.VERTICAL) {
            if (this.mBottom.mTarget != null && this.mBottom.mTarget.mTarget == this.mBottom) {
                return this.mBottom.mTarget.mOwner;
            }
        }
        return null;
    }

    getHorizontalChainControlWidget() {
        let found: ConstraintWidget | null = null;
        if (this.isInHorizontalChain()) {
            let tmp: ConstraintWidget | null = this;

            while (found == null && tmp != null) {
                let anchor: ConstraintAnchor | null = tmp.getAnchor(ConstraintAnchorType.LEFT)
                let targetOwner: ConstraintAnchor | null = (anchor == null) ? null : anchor.getTarget();
                let target: ConstraintWidget | null = (targetOwner == null) ? null : targetOwner.getOwner();
                if (target == this.getParent()) {
                    found = tmp;
                    break;
                }
                let targetAnchor: ConstraintAnchor | null = (target == null)
                    ? null : target.getAnchor(ConstraintAnchorType.RIGHT)!.getTarget();
                if (targetAnchor != null && targetAnchor.getOwner() != tmp) {
                    found = tmp;
                } else {
                    tmp = target!
                }
            }
        }
        return found;
    }

    isInVerticalChain() {
        if ((this.mTop.mTarget != null && this.mTop.mTarget.mTarget == this.mTop) || (this.mBottom.mTarget != null && this.mBottom.mTarget.mTarget == this.mBottom)) {
            return true;
        }
        return false;
    }

    getVerticalChainControlWidget() {
        let found: ConstraintWidget | null = null;
        if (this.isInVerticalChain()) {
            let tmp: ConstraintWidget | null = this;
            while (found == null && tmp != null) {
                let anchor: ConstraintAnchor | null = tmp.getAnchor(ConstraintAnchorType.TOP);
                let targetOwner: ConstraintAnchor | null = (anchor == null) ? null : anchor.getTarget();
                let target: ConstraintWidget | null = (targetOwner == null) ? null : targetOwner.getOwner();
                if (target == this.getParent()) {
                    found = tmp;
                    break;
                }
                let targetAnchor: ConstraintAnchor | null = (target == null)
                    ? null : target.getAnchor(ConstraintAnchorType.BOTTOM)!.getTarget();
                if (targetAnchor != null && targetAnchor.getOwner() != tmp) {
                    found = tmp;
                } else {
                    tmp = target;
                }
            }

        }
        return found;
    }

    isChainHead(orientation: number) {
        let offset = orientation * 2;
        return ((this.mListAnchors)[offset].mTarget != null
                && (this.mListAnchors)[offset].mTarget!.mTarget != (this.mListAnchors)[offset])
            && ((this.mListAnchors)[offset + 1].mTarget != null
                && (this.mListAnchors)[offset + 1].mTarget!.mTarget == (this.mListAnchors)[offset + 1]);
    }

    addToSolver(system: LinearSystem, optimize: boolean) {
        let left = system.createObjectVariable(this.mLeft)!
        let right = system.createObjectVariable(this.mRight)!
        let top = system.createObjectVariable(this.mTop)!
        let bottom = system.createObjectVariable(this.mBottom)!
        let baseline = system.createObjectVariable(this.mBaseline)!

        console.log(`[ATS] created vars`)

        let horizontalParentWrapContent = false
        let verticalParentWrapContent = false

        if (this.mParent != null) {
            horizontalParentWrapContent = this.mParent != null ? this.mParent.mListDimensionBehaviors[ConstraintWidget.DIMENSION_HORIZONTAL] == DimensionBehaviour.WRAP_CONTENT : false;
            verticalParentWrapContent = this.mParent != null
                ? this.mParent.mListDimensionBehaviors[ConstraintWidget.DIMENSION_VERTICAL] == DimensionBehaviour.WRAP_CONTENT : false;

            switch (this.mWrapBehaviorInParent) {
                case ConstraintWidget.WRAP_BEHAVIOR_SKIPPED: {
                    horizontalParentWrapContent = false;
                    verticalParentWrapContent = false;
                }
                    break;
                case ConstraintWidget.WRAP_BEHAVIOR_HORIZONTAL_ONLY: {
                    verticalParentWrapContent = false;
                }
                    break;
                case ConstraintWidget.WRAP_BEHAVIOR_VERTICAL_ONLY: {
                    horizontalParentWrapContent = false;
                }
                    break;
            }
        }

        if (!(this.mVisibility != ConstraintWidget.GONE || this.mAnimated || this.hasDependencies()
            || this.mIsInBarrier[ConstraintWidget.HORIZONTAL] || this.mIsInBarrier[ConstraintWidget.VERTICAL])) {
            return;
        }

        console.log(`[ATS] CP1`)

        if (this.mResolvedHorizontal || this.mResolvedVertical) {
            // For now apply all, but that won't work for wrap/wrap layouts.
            if (this.mResolvedHorizontal) {
                system.addEqualityConstant(left!, this.mX);
                system.addEqualityConstant(right!, this.mX + this.mWidth);
                if (horizontalParentWrapContent && this.mParent != null) {
                    if (this.mOptimizeWrapOnResolved) {
                        let container = this.mParent as ConstraintWidgetContainer
                        container.addHorizontalWrapMinVariable(this.mLeft);
                        container.addHorizontalWrapMaxVariable(this.mRight);
                    } else {
                        let wrapStrength = SolverVariable.STRENGTH_EQUALITY;
                        system.addGreaterThan(system.createObjectVariable(this.mParent.mRight)!, right!, 0, wrapStrength);
                    }
                }
            }
            if (this.mResolvedVertical) {
                system.addEqualityConstant(top!, this.mY);
                system.addEqualityConstant(bottom!, this.mY + this.mHeight);
                if (this.mBaseline.hasDependents()) {
                    system.addEqualityConstant(baseline!, this.mY + this.mBaselineDistance);
                }
                if (verticalParentWrapContent && this.mParent != null) {
                    if (this.mOptimizeWrapOnResolved) {
                        let container = this.mParent as ConstraintWidgetContainer
                        container.addVerticalWrapMinVariable(this.mTop);
                        container.addVerticalWrapMaxVariable(this.mBottom);
                    } else {
                        let wrapStrength = SolverVariable.STRENGTH_EQUALITY;
                        system.addGreaterThan(system.createObjectVariable(this.mParent.mBottom)!, bottom!, 0, wrapStrength);
                    }
                }
            }

            if (this.mResolvedHorizontal && this.mResolvedVertical) {
                this.mResolvedHorizontal = false;
                this.mResolvedVertical = false;
                return;
            }
        }

        console.log(`[ATS] CP2`)

        if (optimize && this.mHorizontalRun != null && this.mVerticalRun != null
            && this.mHorizontalRun.start.resolved && this.mHorizontalRun.end.resolved
            && this.mVerticalRun.start.resolved && this.mVerticalRun.end.resolved) {

            system.addEqualityConstant(left!, this.mHorizontalRun.start.value);
            system.addEqualityConstant(right!, this.mHorizontalRun.end.value);
            system.addEqualityConstant(top!, this.mVerticalRun.start.value);
            system.addEqualityConstant(bottom!, this.mVerticalRun.end.value);
            system.addEqualityConstant(baseline!, this.mVerticalRun.baseline.value);
            if (this.mParent != null) {
                if (horizontalParentWrapContent
                    && this.isTerminalWidget[ConstraintWidget.HORIZONTAL] && !this.isInHorizontalChain()) {
                    let parentMax = system.createObjectVariable(this.mParent.mRight)!
                    system.addGreaterThan(parentMax, right!, 0, SolverVariable.STRENGTH_FIXED);
                }
                if (verticalParentWrapContent
                    && this.isTerminalWidget[ConstraintWidget.VERTICAL] && !this.isInVerticalChain()) {
                    let parentMax = system.createObjectVariable(this.mParent.mBottom)!
                    system.addGreaterThan(parentMax, bottom!, 0, SolverVariable.STRENGTH_FIXED);
                }
            }
            this.mResolvedHorizontal = false;
            this.mResolvedVertical = false;
            return; // we are done here
        }

        console.log(`[ATS] CP3`)

        let inHorizontalChain = false;
        let inVerticalChain = false;

        if (this.mParent != null) {
            if (this.isChainHead(ConstraintWidget.HORIZONTAL)) {
                (this.mParent as ConstraintWidgetContainer).addChain(this, ConstraintWidget.HORIZONTAL);
                inHorizontalChain = true;
            } else {
                inHorizontalChain = this.isInHorizontalChain();
            }

            // Add this widget to a vertical chain if it is the Head of it.
            if (this.isChainHead(ConstraintWidget.VERTICAL)) {
                (this.mParent as ConstraintWidgetContainer).addChain(this, ConstraintWidget.VERTICAL);
                inVerticalChain = true;
            } else {
                inVerticalChain = this.isInVerticalChain();
            }

            if (!inHorizontalChain && horizontalParentWrapContent && this.mVisibility != ConstraintWidget.GONE
                && this.mLeft.mTarget == null && this.mRight.mTarget == null) {
                let parentRight = system.createObjectVariable(this.mParent.mRight)!
                system.addGreaterThan(parentRight, right!, 0, SolverVariable.STRENGTH_LOW);
            }

            if (!inVerticalChain && verticalParentWrapContent && this.mVisibility != ConstraintWidget.GONE
                && this.mTop.mTarget == null && this.mBottom.mTarget == null && this.mBaseline == null) {
                let parentBottom = system.createObjectVariable(this.mParent.mBottom)!
                system.addGreaterThan(parentBottom, bottom!, 0, SolverVariable.STRENGTH_LOW);
            }
        }

        console.log(`[ATS] CP4`)

        let width = this.mWidth;
        if (width < this.mMinWidth) {
            width = this.mMinWidth;
        }
        let height = this.mHeight;
        if (height < this.mMinHeight) {
            height = this.mMinHeight;
        }

        let horizontalDimensionFixed =
            this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_HORIZONTAL] != DimensionBehaviour.MATCH_CONSTRAINT;
        let verticalDimensionFixed =
            this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_VERTICAL] != DimensionBehaviour.MATCH_CONSTRAINT;

        // We evaluate the dimension ratio here as the connections can change.
        // TODO: have a validation pass after connection instead
        let useRatio = false;
        this.mResolvedDimensionRatioSide = this.mDimensionRatioSide;
        this.mResolvedDimensionRatio = this.mDimensionRatio;

        let matchConstraintDefaultWidth = this.mMatchConstraintDefaultWidth;
        let matchConstraintDefaultHeight = this.mMatchConstraintDefaultHeight;

        if (this.mDimensionRatio > 0 && this.mVisibility != ConstraintWidget.GONE) {
            useRatio = true;
            if (this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_HORIZONTAL] == DimensionBehaviour.MATCH_CONSTRAINT
                && matchConstraintDefaultWidth == ConstraintWidget.MATCH_CONSTRAINT_SPREAD) {
                matchConstraintDefaultWidth = ConstraintWidget.MATCH_CONSTRAINT_RATIO;
            }
            if (this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_VERTICAL] == DimensionBehaviour.MATCH_CONSTRAINT
                && matchConstraintDefaultHeight == ConstraintWidget.MATCH_CONSTRAINT_SPREAD) {
                matchConstraintDefaultHeight = ConstraintWidget.MATCH_CONSTRAINT_RATIO;
            }

            if (this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_HORIZONTAL] == DimensionBehaviour.MATCH_CONSTRAINT
                && this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_VERTICAL] == DimensionBehaviour.MATCH_CONSTRAINT
                && matchConstraintDefaultWidth == ConstraintWidget.MATCH_CONSTRAINT_RATIO
                && matchConstraintDefaultHeight == ConstraintWidget.MATCH_CONSTRAINT_RATIO) {
                this.setupDimensionRatio(horizontalParentWrapContent, verticalParentWrapContent,
                    horizontalDimensionFixed, verticalDimensionFixed);
            } else if (this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_HORIZONTAL] == DimensionBehaviour.MATCH_CONSTRAINT
                && matchConstraintDefaultWidth == ConstraintWidget.MATCH_CONSTRAINT_RATIO) {
                this.mResolvedDimensionRatioSide = ConstraintWidget.HORIZONTAL;
                width = (this.mResolvedDimensionRatio * this.mHeight);
                if (this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_VERTICAL] != DimensionBehaviour.MATCH_CONSTRAINT) {
                    matchConstraintDefaultWidth = ConstraintWidget.MATCH_CONSTRAINT_RATIO_RESOLVED;
                    useRatio = false;
                }
            } else if (this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_VERTICAL] == DimensionBehaviour.MATCH_CONSTRAINT
                && matchConstraintDefaultHeight == ConstraintWidget.MATCH_CONSTRAINT_RATIO) {
                this.mResolvedDimensionRatioSide = ConstraintWidget.VERTICAL;
                if (this.mDimensionRatioSide == ConstraintWidget.UNKNOWN) {
                    // need to reverse the ratio as the parsing is done in horizontal mode
                    this.mResolvedDimensionRatio = 1 / this.mResolvedDimensionRatio;
                }
                height = (this.mResolvedDimensionRatio * this.mWidth);
                if (this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_HORIZONTAL] != DimensionBehaviour.MATCH_CONSTRAINT) {
                    matchConstraintDefaultHeight = ConstraintWidget.MATCH_CONSTRAINT_RATIO_RESOLVED;
                    useRatio = false;
                }
            }
        }

        this.mResolvedMatchConstraintDefault[ConstraintWidget.HORIZONTAL] = matchConstraintDefaultWidth;
        this.mResolvedMatchConstraintDefault[ConstraintWidget.VERTICAL] = matchConstraintDefaultHeight;
        this.mResolvedHasRatio = useRatio;

        let useHorizontalRatio = useRatio && (this.mResolvedDimensionRatioSide == ConstraintWidget.HORIZONTAL
            || this.mResolvedDimensionRatioSide == ConstraintWidget.UNKNOWN);

        let useVerticalRatio = useRatio && (this.mResolvedDimensionRatioSide == ConstraintWidget.VERTICAL
            || this.mResolvedDimensionRatioSide == ConstraintWidget.UNKNOWN);

        // Horizontal resolution
        let wrapContent = (this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_HORIZONTAL] == DimensionBehaviour.WRAP_CONTENT)
            && (this instanceof ConstraintWidgetContainer);
        if (wrapContent) {
            width = 0;
        }

        let applyPosition = true;
        if (this.mCenter.isConnected()) {
            applyPosition = false;
        }

        let isInHorizontalBarrier = this.mIsInBarrier[ConstraintWidget.HORIZONTAL];
        let isInVerticalBarrier = this.mIsInBarrier[ConstraintWidget.VERTICAL];

        console.log(`[ATS] CP5`)

        // TODO problem here
        if (this.mHorizontalResolution != ConstraintWidget.DIRECT && !this.mResolvedHorizontal) {
            if (!optimize || !(this.mHorizontalRun != null
                && this.mHorizontalRun.start.resolved && this.mHorizontalRun.end.resolved)) {
                let parentMax = this.mParent != null ? system.createObjectVariable(this.mParent.mRight) : null
                let parentMin = this.mParent != null ? system.createObjectVariable(this.mParent.mLeft) : null

                console.log(`[ATS]  ICP1`)

                // TODO problem here
                this.applyConstraints(system, true, horizontalParentWrapContent,
                    verticalParentWrapContent, this.isTerminalWidget[ConstraintWidget.HORIZONTAL], parentMin,
                    parentMax, this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_HORIZONTAL], wrapContent,
                    this.mLeft, this.mRight, this.mX, width,
                    this.mMinWidth, this.mMaxDimension[ConstraintWidget.HORIZONTAL],
                    this.mHorizontalBiasPercent, useHorizontalRatio,
                    this.mListDimensionBehaviors[ConstraintWidget.VERTICAL] == DimensionBehaviour.MATCH_CONSTRAINT,
                    inHorizontalChain, inVerticalChain, isInHorizontalBarrier,
                    matchConstraintDefaultWidth, matchConstraintDefaultHeight,
                    this.mMatchConstraintMinWidth, this.mMatchConstraintMaxWidth,
                    this.mMatchConstraintPercentWidth, applyPosition);

                console.log(`[ATS]  ICP2`)

            } else if (optimize) {
                console.log(`[ATS]  ICP3`)

                system.addEqualityConstant(left, this.mHorizontalRun.start.value);
                system.addEqualityConstant(right, this.mHorizontalRun.end.value);

                console.log(`[ATS]  ICP4`)

                if (this.mParent != null) {
                    if (horizontalParentWrapContent && this.isTerminalWidget[ConstraintWidget.HORIZONTAL] && !this.isInHorizontalChain()) {
                        let parentMax = system.createObjectVariable(this.mParent.mRight);
                        system.addGreaterThan(parentMax, right, 0, SolverVariable.STRENGTH_FIXED);
                    }
                }

                console.log(`[ATS]  ICP5`)
            }
        }

        console.log(`[ATS] CP6`)

        let applyVerticalConstraints = true;
        if (optimize && this.mVerticalRun != null
            && this.mVerticalRun.start.resolved && this.mVerticalRun.end.resolved) {
            system.addEqualityConstant(top, this.mVerticalRun.start.value);
            system.addEqualityConstant(bottom, this.mVerticalRun.end.value);
            system.addEqualityConstant(baseline, this.mVerticalRun.baseline.value);
            if (this.mParent != null) {
                if (!inVerticalChain && verticalParentWrapContent && this.isTerminalWidget[ConstraintWidget.VERTICAL]) {
                    let parentMax = system.createObjectVariable(this.mParent.mBottom);
                    system.addGreaterThan(parentMax, bottom, 0, SolverVariable.STRENGTH_FIXED);
                }
            }
            applyVerticalConstraints = false;
        }
        if (this.mVerticalResolution == ConstraintWidget.DIRECT) {
            applyVerticalConstraints = false;
        }
        if (applyVerticalConstraints && !this.mResolvedVertical) {
            // Vertical Resolution
            wrapContent = (this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_VERTICAL] == DimensionBehaviour.WRAP_CONTENT) && (this instanceof ConstraintWidgetContainer);
            if (wrapContent) {
                height = 0;
            }

            let parentMax = this.mParent != null
                ? system.createObjectVariable(this.mParent.mBottom) : null;
            let parentMin = this.mParent != null
                ? system.createObjectVariable(this.mParent.mTop) : null;

            if (this.mBaselineDistance > 0 || this.mVisibility == ConstraintWidget.GONE) {
                // if we are GONE we might still have to deal with baseline,
                // even if our baseline distance would be zero
                if (this.mBaseline.mTarget != null) {
                    system.addEquality(baseline, top, this.getBaselineDistance(), SolverVariable.STRENGTH_FIXED);
                    let baselineTarget = system.createObjectVariable(this.mBaseline.mTarget);
                    let baselineMargin = this.mBaseline.getMargin();
                    system.addEquality(baseline, baselineTarget, baselineMargin, SolverVariable.STRENGTH_FIXED);
                    applyPosition = false;
                    if (verticalParentWrapContent) {
                        let end = system.createObjectVariable(this.mBottom);
                        let wrapStrength = SolverVariable.STRENGTH_EQUALITY;
                        system.addGreaterThan(parentMax, end, 0, wrapStrength);
                    }
                } else if (this.mVisibility == ConstraintWidget.GONE) {
                    // TODO: use the constraints graph here to help
                    system.addEquality(baseline, top, this.mBaseline.getMargin(), SolverVariable.STRENGTH_FIXED);
                } else {
                    system.addEquality(baseline, top, this.getBaselineDistance(), SolverVariable.STRENGTH_FIXED);
                }
            }

            this.applyConstraints(system, false, verticalParentWrapContent,
                horizontalParentWrapContent, this.isTerminalWidget[ConstraintWidget.VERTICAL], parentMin,
                parentMax, this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_VERTICAL],
                wrapContent, this.mTop, this.mBottom, this.mY, height,
                this.mMinHeight, this.mMaxDimension[ConstraintWidget.VERTICAL], this.mVerticalBiasPercent, useVerticalRatio,
                this.mListDimensionBehaviors[ConstraintWidget.HORIZONTAL] == DimensionBehaviour.MATCH_CONSTRAINT,
                inVerticalChain, inHorizontalChain, isInVerticalBarrier,
                matchConstraintDefaultHeight, matchConstraintDefaultWidth,
                this.mMatchConstraintMinHeight, this.mMatchConstraintMaxHeight,
                this.mMatchConstraintPercentHeight, applyPosition);
        }

        if (useRatio) {
            let strength = SolverVariable.STRENGTH_FIXED;
            if (this.mResolvedDimensionRatioSide == ConstraintWidget.VERTICAL) {
                system.addRatio(bottom, top, right, left, this.mResolvedDimensionRatio, strength);
            } else {
                system.addRatio(right, left, bottom, top, this.mResolvedDimensionRatio, strength);
            }
        }

        if (this.mCenter.isConnected()) {
            system.addCenterPoint(this, this.mCenter.getTarget()!.getOwner(),
                MathUtils.toRadians(this.mCircleConstraintAngle + 90), this.mCenter.getMargin());
        }

        this.mResolvedHorizontal = false;
        this.mResolvedVertical = false;
    }

    addFirst() {
        return this instanceof VirtualLayout || this instanceof Guideline;
    }

    setupDimensionRatio(hParentWrapContent: boolean, vParentWrapContent: boolean,
                        horizontalDimensionFixed: boolean, verticalDimensionFixed: boolean) {
        if (this.mResolvedDimensionRatioSide == ConstraintWidget.UNKNOWN) {
            if (horizontalDimensionFixed && !verticalDimensionFixed) {
                this.mResolvedDimensionRatioSide = ConstraintWidget.HORIZONTAL;
            } else if (!horizontalDimensionFixed && verticalDimensionFixed) {
                this.mResolvedDimensionRatioSide = ConstraintWidget.VERTICAL;
                if (this.mDimensionRatioSide == ConstraintWidget.UNKNOWN) {
                    // need to reverse the ratio as the parsing is done in horizontal mode
                    this.mResolvedDimensionRatio = 1 / this.mResolvedDimensionRatio;
                }
            }
        }

        if (this.mResolvedDimensionRatioSide == ConstraintWidget.HORIZONTAL
            && !(this.mTop.isConnected() && this.mBottom.isConnected())) {
            this.mResolvedDimensionRatioSide = ConstraintWidget.VERTICAL;
        } else if (this.mResolvedDimensionRatioSide == ConstraintWidget.VERTICAL
            && !(this.mLeft.isConnected() && this.mRight.isConnected())) {
            this.mResolvedDimensionRatioSide = ConstraintWidget.HORIZONTAL;
        }

        if (this.mResolvedDimensionRatioSide == ConstraintWidget.UNKNOWN) {
            if (!(this.mTop.isConnected() && this.mBottom.isConnected()
                && this.mLeft.isConnected() && this.mRight.isConnected())) {
                // only do that if not all connections are set
                if (this.mTop.isConnected() && this.mBottom.isConnected()) {
                    this.mResolvedDimensionRatioSide = ConstraintWidget.HORIZONTAL;
                } else if (this.mLeft.isConnected() && this.mRight.isConnected()) {
                    this.mResolvedDimensionRatio = 1 / this.mResolvedDimensionRatio;
                    this.mResolvedDimensionRatioSide = ConstraintWidget.VERTICAL;
                }
            }
        }

        if (ConstraintWidget.DO_NOT_USE && this.mResolvedDimensionRatioSide == ConstraintWidget.UNKNOWN) {
            if (hParentWrapContent && !vParentWrapContent) {
                this.mResolvedDimensionRatioSide = ConstraintWidget.HORIZONTAL;
            } else if (!hParentWrapContent && vParentWrapContent) {
                this.mResolvedDimensionRatio = 1 / this.mResolvedDimensionRatio;
                this.mResolvedDimensionRatioSide = ConstraintWidget.VERTICAL;
            }
        }

        if (this.mResolvedDimensionRatioSide == ConstraintWidget.UNKNOWN) {
            if (this.mMatchConstraintMinWidth > 0 && this.mMatchConstraintMinHeight == 0) {
                this.mResolvedDimensionRatioSide = ConstraintWidget.HORIZONTAL;
            } else if (this.mMatchConstraintMinWidth == 0 && this.mMatchConstraintMinHeight > 0) {
                this.mResolvedDimensionRatio = 1 / this.mResolvedDimensionRatio;
                this.mResolvedDimensionRatioSide = ConstraintWidget.VERTICAL;
            }
        }

        if (ConstraintWidget.DO_NOT_USE && this.mResolvedDimensionRatioSide == ConstraintWidget.UNKNOWN
            && hParentWrapContent && vParentWrapContent) {
            this.mResolvedDimensionRatio = 1 / this.mResolvedDimensionRatio;
            this.mResolvedDimensionRatioSide = ConstraintWidget.VERTICAL;
        }
    }

    applyConstraints(system: LinearSystem, isHorizontal: boolean,
                     parentWrapContent: boolean, oppositeParentWrapContent: boolean,
                     isTerminal: boolean, parentMin: SolverVariable | null,
                     parentMax: SolverVariable | null,
                     dimensionBehaviour: DimensionBehaviour, wrapContent: boolean,
                     beginAnchor: ConstraintAnchor, endAnchor: ConstraintAnchor,
                     beginPosition: number, dimension: number, minDimension: number,
                     maxDimension: number, bias: number, useRatio: boolean,
                     oppositeVariable: boolean, inChain: boolean,
                     oppositeInChain: boolean, inBarrier: boolean,
                     matchConstraintDefault: number,
                     oppositeMatchConstraintDefault: number,
                     matchMinDimension: number, matchMaxDimension: number,
                     matchPercentDimension: number, applyPosition: boolean) {

        console.log(`[APC] START`)

        let begin = system.createObjectVariable(beginAnchor);
        let end = system.createObjectVariable(endAnchor);
        let beginTarget = system.createObjectVariable(beginAnchor.getTarget());
        let endTarget = system.createObjectVariable(endAnchor.getTarget());

        console.log(`[APC] create vars`)

        let isBeginConnected = beginAnchor.isConnected();
        let isEndConnected = endAnchor.isConnected();
        let isCenterConnected = this.mCenter.isConnected();

        console.log(`[APC] check conn`)

        let variableSize = false;

        let numConnections = 0;
        if (isBeginConnected) {
            numConnections++;
        }
        if (isEndConnected) {
            numConnections++;
        }
        if (isCenterConnected) {
            numConnections++;
        }

        if (useRatio) {
            matchConstraintDefault = ConstraintWidget.MATCH_CONSTRAINT_RATIO;
        }

        console.log(`[APC] switch start`)

        switch (dimensionBehaviour) {
            case DimensionBehaviour.FIXED: {
                variableSize = false;
            }
                break;
            case DimensionBehaviour.WRAP_CONTENT: {
                variableSize = false;
            }
                break;
            case DimensionBehaviour.MATCH_PARENT: {
                variableSize = false;
            }
                break;
            case DimensionBehaviour.MATCH_CONSTRAINT: {
                variableSize = matchConstraintDefault != ConstraintWidget.MATCH_CONSTRAINT_RATIO_RESOLVED;
            }
                break;
        }

        console.log(`[APC] switch end`)


        if (this.mWidthOverride != -1 && isHorizontal) {
            variableSize = false;
            dimension = this.mWidthOverride;
            this.mWidthOverride = -1;
        }
        if (this.mHeightOverride != -1 && !isHorizontal) {
            variableSize = false;
            dimension = this.mHeightOverride;
            this.mHeightOverride = -1;
        }

        if (this.mVisibility == ConstraintWidget.GONE) {
            dimension = 0;
            variableSize = false;
        }

        console.log(`[APC] set variable size`)

        // First apply starting direct connections (more solver-friendly)
        if (applyPosition) {
            if (!isBeginConnected && !isEndConnected && !isCenterConnected) {
                system.addEqualityConstant(begin!, beginPosition);
            } else if (isBeginConnected && !isEndConnected) {
                system.addEquality(begin, beginTarget, beginAnchor.getMargin(), SolverVariable.STRENGTH_FIXED);
            }
        }

        console.log(`[APC] applied position`)

        // Then apply the dimension
        if (!variableSize) {
            if (wrapContent) {
                system.addEquality(end, begin, 0, SolverVariable.STRENGTH_HIGH);
                if (minDimension > 0) {
                    system.addGreaterThan(end, begin, minDimension, SolverVariable.STRENGTH_FIXED);
                }
                if (maxDimension < Number.MAX_VALUE) {
                    system.addLowerThan(end, begin, maxDimension, SolverVariable.STRENGTH_FIXED);
                }
            } else {
                system.addEquality(end, begin, dimension, SolverVariable.STRENGTH_FIXED);
            }
        } else {
            if (numConnections != 2
                && !useRatio
                && ((matchConstraintDefault == ConstraintWidget.MATCH_CONSTRAINT_WRAP)
                    || (matchConstraintDefault == ConstraintWidget.MATCH_CONSTRAINT_SPREAD))) {
                variableSize = false;
                let d = Math.max(matchMinDimension, dimension);
                if (matchMaxDimension > 0) {
                    d = Math.min(matchMaxDimension, d);
                }
                system.addEquality(end, begin, d, SolverVariable.STRENGTH_FIXED);
            } else {
                if (matchMinDimension == ConstraintWidget.WRAP) {
                    matchMinDimension = dimension;
                }
                if (matchMaxDimension == ConstraintWidget.WRAP) {
                    matchMaxDimension = dimension;
                }
                if (dimension > 0
                    && matchConstraintDefault != ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
                    if (ConstraintWidget.USE_WRAP_DIMENSION_FOR_SPREAD
                        && (matchConstraintDefault == ConstraintWidget.MATCH_CONSTRAINT_SPREAD)) {
                        system.addGreaterThan(end, begin, dimension,
                            SolverVariable.STRENGTH_HIGHEST);
                    }
                    dimension = 0;
                }

                if (matchMinDimension > 0) {
                    system.addGreaterThan(end, begin, matchMinDimension,
                        SolverVariable.STRENGTH_FIXED);
                    dimension = Math.max(dimension, matchMinDimension);
                }
                if (matchMaxDimension > 0) {
                    let applyLimit = true;
                    if (parentWrapContent && matchConstraintDefault == ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
                        applyLimit = false;
                    }
                    if (applyLimit) {
                        system.addLowerThan(end, begin, matchMaxDimension, SolverVariable.STRENGTH_FIXED);
                    }
                    dimension = Math.min(dimension, matchMaxDimension);
                }
                if (matchConstraintDefault == ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
                    if (parentWrapContent) {
                        system.addEquality(end, begin, dimension, SolverVariable.STRENGTH_FIXED);
                    } else if (inChain) {
                        system.addEquality(end, begin, dimension, SolverVariable.STRENGTH_EQUALITY);
                        system.addLowerThan(end, begin, dimension, SolverVariable.STRENGTH_FIXED);
                    } else {
                        system.addEquality(end, begin, dimension, SolverVariable.STRENGTH_EQUALITY);
                        system.addLowerThan(end, begin, dimension, SolverVariable.STRENGTH_FIXED);
                    }
                } else if (matchConstraintDefault == ConstraintWidget.MATCH_CONSTRAINT_PERCENT) {
                    let percentBegin = null;
                    let percentEnd = null;
                    if (beginAnchor.getType() == ConstraintAnchorType.TOP
                        || beginAnchor.getType() == ConstraintAnchorType.BOTTOM) {
                        // vertical
                        percentBegin = system.createObjectVariable(this.mParent!.getAnchor(ConstraintAnchorType.TOP));
                        percentEnd = system.createObjectVariable(this.mParent!.getAnchor(ConstraintAnchorType.BOTTOM));
                    } else {
                        percentBegin = system.createObjectVariable(this.mParent!.getAnchor(ConstraintAnchorType.LEFT));
                        percentEnd = system.createObjectVariable(this.mParent!.getAnchor(ConstraintAnchorType.RIGHT));
                    }
                    system.addConstraint(system.createRow().createRowDimensionRatio(end!, begin!, percentEnd!, percentBegin!, matchPercentDimension));
                    if (parentWrapContent) {
                        variableSize = false;
                    }
                } else {
                    isTerminal = true;
                }
            }
        }

        console.log(`[APC] in chain`)

        if (!applyPosition || inChain) {
            // If we don't need to apply the position, let's finish now.
            if (numConnections < 2 && parentWrapContent && isTerminal) {
                system.addGreaterThan(begin, parentMin, 0, SolverVariable.STRENGTH_FIXED);
                let applyEnd = isHorizontal || (this.mBaseline.mTarget == null);
                if (!isHorizontal && this.mBaseline.mTarget != null) {
                    // generally we wouldn't take the current widget in the wrap content,
                    // but if the connected element is a ratio widget,
                    // then we can contribute (as the ratio widget may not be enough by itself)
                    // to it.
                    let target = this.mBaseline.mTarget.mOwner;
                    if (target.mDimensionRatio != 0
                        && target.mListDimensionBehaviors[0] == DimensionBehaviour.MATCH_CONSTRAINT
                        && target.mListDimensionBehaviors[1] == DimensionBehaviour.MATCH_CONSTRAINT) {
                        applyEnd = true;
                    } else {
                        applyEnd = false;
                    }
                }
                if (applyEnd) {
                    system.addGreaterThan(parentMax, end, 0, SolverVariable.STRENGTH_FIXED);
                }
            }
            return;
        }

        console.log(`[APC] in chain end`)

        // Ok, we are dealing with single or centered constraints, let's apply them

        let wrapStrength = SolverVariable.STRENGTH_EQUALITY;

        if (!isBeginConnected && !isEndConnected && !isCenterConnected) {
            console.log(`[APC]  BRANCH1`)
            // note we already applied the start position before, no need to redo it...
        } else if (isBeginConnected && !isEndConnected) {
            console.log(`[APC]  BRANCH2`)
            // note we already applied the start position before, no need to redo it...

            // If we are constrained to a barrier, make sure that we are not bypassed in the wrap
            let beginWidget = beginAnchor.mTarget!.mOwner;
            if (parentWrapContent && beginWidget instanceof Barrier) {
                wrapStrength = SolverVariable.STRENGTH_FIXED;
            }
        } else if (!isBeginConnected && isEndConnected) {
            console.log(`[APC]  BRANCH3`)

            system.addEquality(end, endTarget, -endAnchor.getMargin(), SolverVariable.STRENGTH_FIXED);
            if (parentWrapContent) {
                if (this.mOptimizeWrapO && begin!.isFinalValue && this.mParent != null) {
                    let container = this.mParent as ConstraintWidgetContainer
                    if (isHorizontal) {
                        container.addHorizontalWrapMinVariable(beginAnchor);
                    } else {
                        container.addVerticalWrapMinVariable(beginAnchor);
                    }
                } else {
                    system.addGreaterThan(begin, parentMin, 0, SolverVariable.STRENGTH_EQUALITY);
                }
            }
        } else if (isBeginConnected && isEndConnected) {
            console.log(`[APC]  BRANCH4`)

            let applyBoundsCheck = true;
            let applyCentering = false;
            let applyStrongChecks = false;
            let applyRangeCheck = false;
            let rangeCheckStrength = SolverVariable.STRENGTH_EQUALITY;

            // TODO: might not need it here (it's overridden)
            let boundsCheckStrength = SolverVariable.STRENGTH_HIGHEST;
            let centeringStrength = SolverVariable.STRENGTH_BARRIER;

            if (parentWrapContent) {
                rangeCheckStrength = SolverVariable.STRENGTH_EQUALITY;
            }
            let beginWidget = beginAnchor.mTarget!.mOwner;
            let endWidget = endAnchor.mTarget!.mOwner;
            let parent = this.getParent();

            console.log(`[APC]  SUB CHECK`)


            if (variableSize) {
                if (matchConstraintDefault == ConstraintWidget.MATCH_CONSTRAINT_SPREAD) {
                    if (matchMaxDimension == 0 && matchMinDimension == 0) {
                        applyStrongChecks = true;
                        rangeCheckStrength = SolverVariable.STRENGTH_FIXED;
                        boundsCheckStrength = SolverVariable.STRENGTH_FIXED;
                        // Optimization in case of centering in parent
                        if (beginTarget!.isFinalValue && endTarget!.isFinalValue) {
                            system.addEquality(begin!, beginTarget, beginAnchor.getMargin(), SolverVariable.STRENGTH_FIXED);
                            system.addEquality(end!, endTarget, -endAnchor.getMargin(), SolverVariable.STRENGTH_FIXED);
                            return;
                        }
                    } else {
                        applyCentering = true;
                        rangeCheckStrength = SolverVariable.STRENGTH_EQUALITY;
                        boundsCheckStrength = SolverVariable.STRENGTH_EQUALITY;
                        applyBoundsCheck = true;
                        applyRangeCheck = true;
                    }
                    if (beginWidget instanceof Barrier || endWidget instanceof Barrier) {
                        boundsCheckStrength = SolverVariable.STRENGTH_HIGHEST;
                    }
                } else if (matchConstraintDefault == ConstraintWidget.MATCH_CONSTRAINT_PERCENT) {
                    applyCentering = true;
                    rangeCheckStrength = SolverVariable.STRENGTH_EQUALITY;
                    boundsCheckStrength = SolverVariable.STRENGTH_EQUALITY;
                    applyBoundsCheck = true;
                    applyRangeCheck = true;
                    if (beginWidget instanceof Barrier || endWidget instanceof Barrier) {
                        boundsCheckStrength = SolverVariable.STRENGTH_HIGHEST;
                    }
                } else if (matchConstraintDefault == ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
                    applyCentering = true;
                    applyRangeCheck = true;
                    rangeCheckStrength = SolverVariable.STRENGTH_FIXED;
                } else if (matchConstraintDefault == ConstraintWidget.MATCH_CONSTRAINT_RATIO) {
                    if (this.mResolvedDimensionRatioSide == ConstraintWidget.UNKNOWN) {
                        applyCentering = true;
                        applyRangeCheck = true;
                        applyStrongChecks = true;
                        rangeCheckStrength = SolverVariable.STRENGTH_FIXED;
                        boundsCheckStrength = SolverVariable.STRENGTH_EQUALITY;
                        if (oppositeInChain) {
                            boundsCheckStrength = SolverVariable.STRENGTH_EQUALITY;
                            centeringStrength = SolverVariable.STRENGTH_HIGHEST;
                            if (parentWrapContent) {
                                centeringStrength = SolverVariable.STRENGTH_EQUALITY;
                            }
                        } else {
                            centeringStrength = SolverVariable.STRENGTH_FIXED;
                        }
                    } else {
                        applyCentering = true;
                        applyRangeCheck = true;
                        applyStrongChecks = true;
                        if (useRatio) {
                            // useRatio is true
                            // if the side we base ourselves on for the ratio is this one
                            // if that's not the case, we need to have a stronger constraint.
                            let otherSideInvariable =
                                oppositeMatchConstraintDefault == ConstraintWidget.MATCH_CONSTRAINT_PERCENT
                                || oppositeMatchConstraintDefault
                                == ConstraintWidget.MATCH_CONSTRAINT_WRAP;
                            if (!otherSideInvariable) {
                                rangeCheckStrength = SolverVariable.STRENGTH_FIXED;
                                boundsCheckStrength = SolverVariable.STRENGTH_EQUALITY;
                            }
                        } else {
                            rangeCheckStrength = SolverVariable.STRENGTH_EQUALITY;
                            if (matchMaxDimension > 0) {
                                boundsCheckStrength = SolverVariable.STRENGTH_EQUALITY;
                            } else if (matchMaxDimension == 0 && matchMinDimension == 0) {
                                if (!oppositeInChain) {
                                    boundsCheckStrength = SolverVariable.STRENGTH_FIXED;
                                } else {
                                    if (beginWidget != parent && endWidget != parent) {
                                        rangeCheckStrength = SolverVariable.STRENGTH_HIGHEST;
                                    } else {
                                        rangeCheckStrength = SolverVariable.STRENGTH_EQUALITY;
                                    }
                                    boundsCheckStrength = SolverVariable.STRENGTH_HIGHEST;
                                }
                            }
                        }
                    }
                }
            } else {
                applyCentering = true;
                applyRangeCheck = true;

                // Let's optimize away if we can...
                if (beginTarget!.isFinalValue && endTarget!.isFinalValue) {
                    system.addCentering(begin!, beginTarget!, beginAnchor.getMargin(),
                        bias, endTarget!, end!, endAnchor.getMargin(),
                        SolverVariable.STRENGTH_FIXED);
                    if (parentWrapContent && isTerminal) {
                        let margin = 0;
                        if (endAnchor.mTarget != null) {
                            margin = endAnchor.getMargin();
                        }
                        if (endTarget != parentMax) { // if not already applied
                            system.addGreaterThan(parentMax, end, margin, wrapStrength);
                        }
                    }
                    console.log(`[APC] return`)

                    return;
                }
            }

            console.log(`[APC]  SUB1`)

            if (applyRangeCheck && beginTarget == endTarget && beginWidget != parent) {
                // no need to apply range / bounds check if we are centered on the same anchor
                applyRangeCheck = false;
                applyBoundsCheck = false;
            }

            console.log(`[APC]  SUB2`)

            if (applyCentering) {
                if (!variableSize && !oppositeVariable && !oppositeInChain
                    && beginTarget == parentMin && endTarget == parentMax) {
                    // for fixed size widgets, we can simplify the constraints
                    centeringStrength = SolverVariable.STRENGTH_FIXED;
                    rangeCheckStrength = SolverVariable.STRENGTH_FIXED;
                    applyBoundsCheck = false;
                    parentWrapContent = false;
                }

                system.addCentering(begin!, beginTarget!, beginAnchor.getMargin(),
                    bias, endTarget!, end!, endAnchor.getMargin(), centeringStrength);
            }

            console.log(`[APC]  SUB3`)

            if (this.mVisibility == ConstraintWidget.GONE && !endAnchor.hasDependents()) {
                console.log(`[APC] return 2`)

                return;
            }

            console.log(`[APC]  SUB4`)

            if (applyRangeCheck) {
                if (parentWrapContent && beginTarget != endTarget
                    && !variableSize) {
                    if (beginWidget instanceof Barrier || endWidget instanceof Barrier) {
                        rangeCheckStrength = SolverVariable.STRENGTH_BARRIER;
                    }
                }
                system.addGreaterThan(begin, beginTarget,
                    beginAnchor.getMargin(), rangeCheckStrength);
                system.addLowerThan(end, endTarget, -endAnchor.getMargin(), rangeCheckStrength);
            }

            console.log(`[APC]  SUB5`)

            if (parentWrapContent && inBarrier // if we are referenced by a barrier
                && !(beginWidget instanceof Barrier || endWidget instanceof Barrier)
                && !(endWidget == parent)) {
                // ... but not directly constrained by it
                // ... then make sure we can hold our own
                boundsCheckStrength = SolverVariable.STRENGTH_BARRIER;
                rangeCheckStrength = SolverVariable.STRENGTH_BARRIER;
                applyBoundsCheck = true;
            }

            console.log(`[APC]  SUB6`)

            // TODO problem here
            if (applyBoundsCheck) {
                console.log(`[APC]  SUB--CHECK`)

                if (applyStrongChecks && (!oppositeInChain || oppositeParentWrapContent)) {
                    let strength = boundsCheckStrength;
                    if (beginWidget == parent || endWidget == parent) {
                        strength = SolverVariable.STRENGTH_BARRIER;
                    }
                    if (beginWidget instanceof Guideline || endWidget instanceof Guideline) {
                        strength = SolverVariable.STRENGTH_EQUALITY;
                    }
                    if (beginWidget instanceof Barrier || endWidget instanceof Barrier) {
                        strength = SolverVariable.STRENGTH_EQUALITY;
                    }
                    if (oppositeInChain) {
                        strength = SolverVariable.STRENGTH_EQUALITY;
                    }
                    boundsCheckStrength = Math.max(strength, boundsCheckStrength);
                }

                console.log(`[APC]  SUB--A`)

                if (parentWrapContent) {
                    boundsCheckStrength = Math.min(rangeCheckStrength, boundsCheckStrength);
                    if (useRatio && !oppositeInChain
                        && (beginWidget == parent || endWidget == parent)) {
                        // When using ratio, relax some strength to allow other parts of the system
                        // to take precedence rather than driving it
                        boundsCheckStrength = SolverVariable.STRENGTH_HIGHEST;
                    }
                }

                console.log(`[APC]  SUB--B`)

                system.addEquality(begin, beginTarget, beginAnchor.getMargin(), boundsCheckStrength);

                console.log(`[APC]  SUB--C`)

                // TODO problem here
                console.log("[APC] PI", end, endTarget, -endAnchor.getMargin(), boundsCheckStrength)
                system.addEquality(end, endTarget, -endAnchor.getMargin(), boundsCheckStrength);

                console.log(`[APC]  SUB--D`)
            }

            console.log(`[APC]  SUB7`)

            if (parentWrapContent) {
                let margin = 0;
                if (parentMin == beginTarget) {
                    margin = beginAnchor.getMargin();
                }
                if (beginTarget != parentMin) { // already done otherwise
                    system.addGreaterThan(begin, parentMin, margin, wrapStrength);
                }
            }

            console.log(`[APC]  SUB8`)

            if (parentWrapContent && variableSize && minDimension == 0 && matchMinDimension == 0) {
                if (variableSize && matchConstraintDefault == ConstraintWidget.MATCH_CONSTRAINT_RATIO) {
                    system.addGreaterThan(end, begin, 0, SolverVariable.STRENGTH_FIXED);
                } else {
                    system.addGreaterThan(end, begin, 0, wrapStrength);
                }
            }
        }

        console.log(`[APC] CP`)

        if (parentWrapContent && isTerminal) {
            let margin = 0;
            if (endAnchor.mTarget != null) {
                margin = endAnchor.getMargin();
            }
            if (endTarget !== parentMax) { // if not already applied
                if (this.mOptimizeWrapO && end!.isFinalValue && this.mParent != null) {
                    let container = this.mParent as ConstraintWidgetContainer
                    if (isHorizontal) {
                        container.addHorizontalWrapMaxVariable(endAnchor);
                    } else {
                        container.addVerticalWrapMaxVariable(endAnchor);
                    }
                    return;
                }
                system.addGreaterThan(parentMax, end, margin, wrapStrength);
            }
        }
    }

    updateFromSolver(system: LinearSystem, optimize: boolean) {
        let left = system.getObjectVariableValue(this.mLeft);
        let top = system.getObjectVariableValue(this.mTop);
        let right = system.getObjectVariableValue(this.mRight);
        let bottom = system.getObjectVariableValue(this.mBottom);

        if (optimize && this.mHorizontalRun != null
            && this.mHorizontalRun.start.resolved && this.mHorizontalRun.end.resolved) {
            left = this.mHorizontalRun.start.value;
            right = this.mHorizontalRun.end.value;
        }
        if (optimize && this.mVerticalRun != null
            && this.mVerticalRun.start.resolved && this.mVerticalRun.end.resolved) {
            top = this.mVerticalRun.start.value;
            bottom = this.mVerticalRun.end.value;
        }

        let w = right - left;
        let h = bottom - top;
        if (w < 0 || h < 0
            || left == Number.MIN_VALUE || left == Number.MAX_VALUE
            || top == Number.MIN_VALUE || top == Number.MAX_VALUE
            || right == Number.MIN_VALUE || right == Number.MAX_VALUE
            || bottom == Number.MIN_VALUE || bottom == Number.MAX_VALUE) {
            left = 0;
            top = 0;
            right = 0;
            bottom = 0;
        }
        this.setFrameBounds(left, top, right, bottom);
    }

    copy(src: ConstraintWidget, map: Map<ConstraintWidget, ConstraintWidget>) {
        this.mHorizontalResolution = src.mHorizontalResolution;
        this.mVerticalResolution = src.mVerticalResolution;

        this.mMatchConstraintDefaultWidth = src.mMatchConstraintDefaultWidth;
        this.mMatchConstraintDefaultHeight = src.mMatchConstraintDefaultHeight;

        this.mResolvedMatchConstraintDefault[0] = src.mResolvedMatchConstraintDefault[0];
        this.mResolvedMatchConstraintDefault[1] = src.mResolvedMatchConstraintDefault[1];

        this.mMatchConstraintMinWidth = src.mMatchConstraintMinWidth;
        this.mMatchConstraintMaxWidth = src.mMatchConstraintMaxWidth;
        this.mMatchConstraintMinHeight = src.mMatchConstraintMinHeight;
        this.mMatchConstraintMaxHeight = src.mMatchConstraintMaxHeight;
        this.mMatchConstraintPercentHeight = src.mMatchConstraintPercentHeight;
        this.mIsWidthWrapContent = src.mIsWidthWrapContent;
        this.mIsHeightWrapContent = src.mIsHeightWrapContent;

        this.mResolvedDimensionRatioSide = src.mResolvedDimensionRatioSide;
        this.mResolvedDimensionRatio = src.mResolvedDimensionRatio;

        this.mMaxDimension = Arrays.copyNumbers(src.mMaxDimension, src.mMaxDimension.length);
        this.mCircleConstraintAngle = src.mCircleConstraintAngle;

        this.mHasBaseline = src.mHasBaseline;
        this.mInPlaceholder = src.mInPlaceholder;

        // The anchors available on the widget
        // note: all anchors should be added to the mAnchors array (see addAnchors())

        this.mLeft.reset();
        this.mTop.reset();
        this.mRight.reset();
        this.mBottom.reset();
        this.mBaseline.reset();
        this.mCenterX.reset();
        this.mCenterY.reset();
        this.mCenter.reset();
        this.mListDimensionBehaviors = Arrays.copy(this.mListDimensionBehaviors, 2) as DimensionBehaviour[]
        this.mParent = (this.mParent == null) ? null : map.get(src.mParent!)!

        this.mWidth = src.mWidth;
        this.mHeight = src.mHeight;
        this.mDimensionRatio = src.mDimensionRatio;
        this.mDimensionRatioSide = src.mDimensionRatioSide;

        this.mX = src.mX;
        this.mY = src.mY;
        this.mRelX = src.mRelX;
        this.mRelY = src.mRelY;

        this.mOffsetX = src.mOffsetX;
        this.mOffsetY = src.mOffsetY;

        this.mBaselineDistance = src.mBaselineDistance;
        this.mMinWidth = src.mMinWidth;
        this.mMinHeight = src.mMinHeight;

        this.mHorizontalBiasPercent = src.mHorizontalBiasPercent;
        this.mVerticalBiasPercent = src.mVerticalBiasPercent;

        this.mCompanionWidget = src.mCompanionWidget;
        this.mContainerItemSkip = src.mContainerItemSkip;
        this.mVisibility = src.mVisibility;
        this.mAnimated = src.mAnimated;
        this.mDebugName = src.mDebugName;
        this.mType = src.mType;

        this.mDistToTop = src.mDistToTop;
        this.mDistToLeft = src.mDistToLeft;
        this.mDistToRight = src.mDistToRight;
        this.mDistToBottom = src.mDistToBottom;
        this.mLeftHasCentered = src.mLeftHasCentered;
        this.mRightHasCentered = src.mRightHasCentered;

        this.mTopHasCentered = src.mTopHasCentered;
        this.mBottomHasCentered = src.mBottomHasCentered;

        this.mHorizontalWrapVisited = src.mHorizontalWrapVisited;
        this.mVerticalWrapVisited = src.mVerticalWrapVisited;

        this.mHorizontalChainStyle = src.mHorizontalChainStyle;
        this.mVerticalChainStyle = src.mVerticalChainStyle;
        this.mHorizontalChainFixedPosition = src.mHorizontalChainFixedPosition;
        this.mVerticalChainFixedPosition = src.mVerticalChainFixedPosition;
        this.mWeight[0] = src.mWeight[0];
        this.mWeight[1] = src.mWeight[1];

        this.mListNextMatchConstraintsWidget[0] = src.mListNextMatchConstraintsWidget[0];
        this.mListNextMatchConstraintsWidget[1] = src.mListNextMatchConstraintsWidget[1];

        this.mNextChainWidget[0] = src.mNextChainWidget[0];
        this.mNextChainWidget[1] = src.mNextChainWidget[1];

        this.mHorizontalNextWidget = (src.mHorizontalNextWidget == null) ? null : map.get(src.mHorizontalNextWidget)!
        this.mVerticalNextWidget = (src.mVerticalNextWidget == null) ? null : map.get(src.mVerticalNextWidget)!
    }

    updateFromRuns(updateHorizontal: boolean, updateVertical: boolean) {
        updateHorizontal = updateHorizontal && this.mHorizontalRun!.isResolved();
        updateVertical = updateVertical && this.mVerticalRun!.isResolved();
        let left = this.mHorizontalRun!.start.value;
        let top = this.mVerticalRun!.start.value;
        let right = this.mHorizontalRun!.end.value;
        let bottom = this.mVerticalRun!.end.value;
        let w = right - left;
        let h = bottom - top;
        if (w < 0 || h < 0
            || left == Number.MIN_VALUE || left == Number.MAX_VALUE
            || top == Number.MIN_VALUE || top == Number.MAX_VALUE
            || right == Number.MIN_VALUE || right == Number.MAX_VALUE
            || bottom == Number.MIN_VALUE || bottom == Number.MAX_VALUE) {
            left = 0;
            top = 0;
            right = 0;
            bottom = 0;
        }

        w = right - left;
        h = bottom - top;

        if (updateHorizontal) {
            this.mX = left;
        }
        if (updateVertical) {
            this.mY = top;
        }

        if (this.mVisibility == ConstraintWidget.GONE) {
            this.mWidth = 0;
            this.mHeight = 0;
            return;
        }

        // correct dimensional instability caused by rounding errors
        if (updateHorizontal) {
            if ((this.mListDimensionBehaviors)[ConstraintWidget.DIMENSION_HORIZONTAL] == DimensionBehaviour.FIXED && w < this.mWidth) {
                w = this.mWidth;
            }
            this.mWidth = w;
            if (this.mWidth < this.mMinWidth) {
                this.mWidth = this.mMinWidth
            }
        }

        if (updateVertical) {
            if (this.mListDimensionBehaviors[ConstraintWidget.DIMENSION_VERTICAL]
                == DimensionBehaviour.FIXED && h < this.mHeight) {
                h = this.mHeight;
            }
            this.mHeight = h;
            if (this.mHeight < this.mMinHeight) {
                this.mHeight = this.mMinHeight;
            }
        }
    }

    addChildrenToSolverByDependency(container: ConstraintWidgetContainer,
                                    system: LinearSystem,
                                    widgets: Set<ConstraintWidget>,
                                    orientation: number,
                                    addSelf: boolean) {

        if (addSelf) {
            if (!widgets.has(this)) {
                return;
            }
            Optimizer.checkMatchParent(container, system, this);
            widgets.delete(this);
            this.addToSolver(system, container.optimizeFor(Optimizer.OPTIMIZATION_GRAPH));
        }
        if (orientation == ConstraintWidget.HORIZONTAL) {
            let dependents: Set<ConstraintAnchor> | null = this.mLeft.getDependents();
            if (dependents != null) {
                for (let anchor of dependents) {
                    anchor.mOwner.addChildrenToSolverByDependency(container,
                        system, widgets, orientation, true);
                }
            }
            dependents = this.mRight.getDependents();
            if (dependents != null) {
                for (let anchor of dependents) {
                    anchor.mOwner.addChildrenToSolverByDependency(container,
                        system, widgets, orientation, true);
                }
            }
        } else {
            let dependents: Set<ConstraintAnchor> | null = this.mTop.getDependents();
            if (dependents != null) {
                for (let anchor of dependents) {
                    anchor.mOwner.addChildrenToSolverByDependency(container,
                        system, widgets, orientation, true);
                }
            }
            dependents = this.mBottom.getDependents();
            if (dependents != null) {
                for (let anchor of dependents) {
                    anchor.mOwner.addChildrenToSolverByDependency(container,
                        system, widgets, orientation, true);
                }
            }
            dependents = this.mBaseline.getDependents();
            if (dependents != null) {
                for (let anchor of dependents) {
                    anchor.mOwner.addChildrenToSolverByDependency(container,
                        system, widgets, orientation, true);
                }
            }
        }
        // horizontal
    }
}

export class HelperWidget extends ConstraintWidget implements Helper {
    mWidgets: (ConstraintWidget | null)[] = new Array(4)
    mWidgetsCount = 0

    updateConstraints(container: ConstraintWidgetContainer) {

    }

    add(widget: ConstraintWidget) {
        if (widget == this || widget == null) {
            return;
        }
        if (this.mWidgetsCount + 1 > this.mWidgets.length) {
            this.mWidgets = Arrays.copy(this.mWidgets, this.mWidgets.length * 2);
        }
        this.mWidgets[this.mWidgetsCount] = widget;
        this.mWidgetsCount++;
    }

    copy(src: ConstraintWidget, map: Map<ConstraintWidget, ConstraintWidget>) {
        super.copy(src, map);

        let srcHelper = src as HelperWidget
        this.mWidgetsCount = 0;
        const count = srcHelper.mWidgetsCount;
        for (let i = 0; i < count; i++) {
            this.add(map.get(srcHelper.mWidgets[i]!)!);
        }
    }

    removeAllIds() {
        this.mWidgetsCount = 0
        this.mWidgets.fill(null)
    }

    addDependents(dependencyLists: WidgetGroup[], orientation: number, group: WidgetGroup) {
        for (let i = 0; i < this.mWidgetsCount; i++) {
            let widget = this.mWidgets[i]!
            group.add(widget);
        }
        for (let i = 0; i < this.mWidgetsCount; i++) {
            let widget = this.mWidgets[i]!
            Grouping.findDependents(widget, orientation, dependencyLists, group);
        }
    }

    findGroupInDependents(orientation: number) {
        for (let i = 0; i < this.mWidgetsCount; i++) {
            let widget = this.mWidgets[i]!
            if (orientation == ConstraintWidget.HORIZONTAL && widget.horizontalGroup != -1) {
                return widget.horizontalGroup;
            }
            if (orientation == ConstraintWidget.VERTICAL && widget.verticalGroup != -1) {
                return widget.verticalGroup;
            }
        }
        return -1;
    }
}

export class WidgetContainer extends ConstraintWidget{
    mChildren: ConstraintWidget[] = []

    constructor(x?: number, y?: number, width?: number, height?: number) {
        super(x, y, width, height);
    }

    reset() {
        this.mChildren = []

        super.reset()
    }

    add (widget: ConstraintWidget) {
        this.mChildren.push(widget);
        if (widget.getParent() != null) {
            let container = widget.getParent() as WidgetContainer
            container.remove(widget);
        }
        widget.setParent(this);
    }

    addAll (...widgets: ConstraintWidget[]) {
        const count = widgets.length

        for (let i = 0; i < count; i ++) {
            this.add(widgets[i])
        }
    }

    remove (widget : ConstraintWidget) {
        Arrays.remove(this.mChildren, widget) //mChildren.remove(widget);
        widget.reset();
    }

    public getChildren() {
        return this.mChildren;
    }

    /**
     * Return the top-level ConstraintWidgetContainer
     *
     * @return top-level ConstraintWidgetContainer
     */
    public getRootConstraintContainer() {
        let item: ConstraintWidget = this;
        let parent = item.getParent();
        let container = null;
        if (item instanceof ConstraintWidgetContainer) {
            container = this as unknown as ConstraintWidgetContainer
        }
        while (parent != null) {
            item = parent;
            parent = item.getParent();
            if (item instanceof ConstraintWidgetContainer) {
                container = item as ConstraintWidgetContainer
            }
        }
        return container;
    }

    setOffset(x: number, y: number) {
        super.setOffset(x, y);

        const count = this.mChildren.length
        for (let i = 0; i < count; i++) {
            let widget = this.mChildren[i]
            widget.setOffset(this.getRootX(), this.getRootY())
        }
    }

    layout () {
        if (this.mChildren == null) {
            return;
        }
        const count = this.mChildren.length
        for (let i = 0; i < count; i++) {
            let widget = this.mChildren[i]
            if (widget instanceof WidgetContainer) {
                (widget as WidgetContainer).layout();
            }
        }
    }

    resetSolverVariables(cache: Cache) {
        super.resetSolverVariables(cache);

        const count = this.mChildren.length
        for (let i = 0; i < count; i++) {
            let widget = this.mChildren[i]
            widget.resetSolverVariables(cache);
        }
    }

    public removeAllChildren() {
        this.mChildren = []
    }
}

export class ConstraintWidgetContainer extends WidgetContainer {
    private static readonly MAX_ITERATIONS = 8;

    private static readonly DEBUG_LAYOUT = false;
    static readonly DEBUG_GRAPH = false;

    mBasicMeasureSolver = new BasicMeasure(this);

    ////////////////////////////////////////////////////////////////////////////////////////////////
    // Graph measures
    ////////////////////////////////////////////////////////////////////////////////////////////////

    public mDependencyGraph = new DependencyGraph(this);
    private mPass = 0 // number of layout

    invalidateGraph() {
        this.mDependencyGraph.invalidateGraph()
    }

    invalidateMeasures() {
        this.mDependencyGraph.invalidateMeasures()
    }

    directMeasure(optimizeWrap: boolean) {
        return this.mDependencyGraph.directMeasure(optimizeWrap)
    }

    public directMeasureSetup(optimizeWrap: boolean) {
        return this.mDependencyGraph.directMeasureSetup(optimizeWrap);
    }

// @TODO: add description
    public directMeasureWithOrientation(optimizeWrap: boolean, orientation: number) {
        return this.mDependencyGraph.directMeasureWithOrientation(optimizeWrap, orientation);
    }

// @TODO: add description
    public defineTerminalWidgets() {
        this.mDependencyGraph.defineTerminalWidgets(this.getHorizontalDimensionBehaviour(), this.getVerticalDimensionBehaviour());
    }

    public measure(optimizationLevel: number, widthMode: number, widthSize: number,
                   heightMode: number, heightSize: number, lastMeasureWidth: number,
                   lastMeasureHeight: number, paddingX: number, paddingY: number) {
        this.mPaddingLeft = paddingX;
        this.mPaddingTop = paddingY;
        return this.mBasicMeasureSolver.solverMeasure(this, optimizationLevel, paddingX, paddingY,
            widthMode, widthSize, heightMode, heightSize,
            lastMeasureWidth, lastMeasureHeight);
    }

    public updateHierarchy() {
        this.mBasicMeasureSolver.updateHierarchy(this);
    }

    mMeasurer: Measurer | null = null;

    // @TODO: add description
    public setMeasurer(measurer: Measurer) {
        this.mMeasurer = measurer;
        this.mDependencyGraph.setMeasurer(measurer);
    }

    public getMeasurer() {
        return this.mMeasurer;
    }

    private mIsRtl = false;

// @TODO: add description

    mSystem = new LinearSystem();

    mPaddingLeft: number = 0
    mPaddingTop: number = 0
    mPaddingRight: number = 0
    mPaddingBottom: number = 0

    public mHorizontalChainsSize = 0;
    public mVerticalChainsSize = 0;

    mVerticalChainsArray: (ChainHead | null)[] = new Array<ChainHead>(4)
    mHorizontalChainsArray: (ChainHead | null)[] = new Array<ChainHead>(4)

    public mGroupsWrapOptimized = false;
    public mHorizontalWrapOptimized = false;
    public mVerticalWrapOptimized = false;
    public mWrapFixedWidth = 0;
    public mWrapFixedHeight = 0;

    private mOptimizationLevel = Optimizer.OPTIMIZATION_STANDARD;
    public mSkipSolver = false;

    private mWidthMeasuredTooSmall = false;
    private mHeightMeasuredTooSmall = false;

    constructor(x?: number, y?: number, width?: number, height?: number, debugName?: string) {
        super(x, y, width, height);

        if (debugName) {
            this.setDebugName(debugName)
        }
    }

    public setOptimizationLevel(value: number) {
        this.mOptimizationLevel = value;
        LinearSystem.USE_DEPENDENCY_ORDERING = this.optimizeFor(Optimizer.OPTIMIZATION_DEPENDENCY_ORDERING);
    }

    /**
     * Returns the current optimization level
     */
    public getOptimizationLevel() {
        return this.mOptimizationLevel;
    }

    /**
     * Returns true if the given feature should be optimized
     */
    public optimizeFor(feature: number) {
        return (this.mOptimizationLevel & feature) == feature;
    }

    /**
     * Specify the xml type for the container
     */
    public getType() {
        return "ConstraintLayout";
    }

    reset() {
        this.mSystem.reset();
        this.mPaddingLeft = 0;
        this.mPaddingRight = 0;
        this.mPaddingTop = 0;
        this.mPaddingBottom = 0;
        this.mSkipSolver = false;
        super.reset();
    }

    public isWidthMeasuredTooSmall() {
        return this.mWidthMeasuredTooSmall;
    }

    /**
     * Return true if the height given is too small for the content laid out
     */
    public isHeightMeasuredTooSmall() {
        return this.mHeightMeasuredTooSmall;
    }

    mDebugSolverPassCount = 0;

    mVerticalWrapMin: WeakRef<ConstraintAnchor> | null = null;
    mHorizontalWrapMin: WeakRef<ConstraintAnchor> | null = null;
    mVerticalWrapMax: WeakRef<ConstraintAnchor> | null = null;
    mHorizontalWrapMax: WeakRef<ConstraintAnchor> | null = null;

    addVerticalWrapMinVariable(top: ConstraintAnchor) {
        if (this.mVerticalWrapMin == null || Deref(this.mVerticalWrapMin) == null
            || top.getFinalValue() > Deref(this.mVerticalWrapMin)!.getFinalValue()) {
            this.mVerticalWrapMin = new WeakRef(top);
        }
    }

// @TODO: add description
    public addHorizontalWrapMinVariable(left: ConstraintAnchor) {
        if (this.mHorizontalWrapMin == null || Deref(this.mHorizontalWrapMin) == null
            || left.getFinalValue() > Deref(this.mHorizontalWrapMin)!.getFinalValue()) {
            this.mHorizontalWrapMin = new WeakRef(left)
        }
    }

    addVerticalWrapMaxVariable(bottom: ConstraintAnchor) {
        if (this.mVerticalWrapMax == null || Deref(this.mVerticalWrapMax) == null
            || bottom.getFinalValue() > Deref(this.mVerticalWrapMax)!.getFinalValue()) {
            this.mVerticalWrapMax = new WeakRef(bottom);
        }
    }

// @TODO: add description
    public addHorizontalWrapMaxVariable(right: ConstraintAnchor) {
        if (this.mHorizontalWrapMax == null || Deref(this.mHorizontalWrapMax) == null
            || right.getFinalValue() > Deref(this.mHorizontalWrapMax)!.getFinalValue()) {
            this.mHorizontalWrapMax = new WeakRef(right);
        }
    }

    private addMinWrap(constraintAnchor: ConstraintAnchor, parentMin: SolverVariable | null) {
        let variable = this.mSystem.createObjectVariable(constraintAnchor);
        let wrapStrength = SolverVariable.STRENGTH_EQUALITY;
        this.mSystem.addGreaterThan(variable, parentMin, 0, wrapStrength);
    }

    private addMaxWrap(constraintAnchor: ConstraintAnchor, parentMax: SolverVariable | null) {
        let variable = this.mSystem.createObjectVariable(constraintAnchor);
        let wrapStrength = SolverVariable.STRENGTH_EQUALITY;
        this.mSystem.addGreaterThan(parentMax, variable, 0, wrapStrength);
    }

    mWidgetsToAdd: Set<ConstraintWidget> = new Set();

    public addChildrenToSolver(system: LinearSystem) {
        console.log("[CALL]")

        let optimize = this.optimizeFor(Optimizer.OPTIMIZATION_GRAPH);
        this.addToSolver(system, optimize);
        const count = this.mChildren.length

        let hasBarriers = false;
        for (let i = 0; i < count; i++) {
            let widget = this.mChildren[i]
            console.log("child", i, widget)
            widget.setInBarrier(ConstraintWidgetContainer.HORIZONTAL, false);
            widget.setInBarrier(ConstraintWidgetContainer.VERTICAL, false);
            if (widget instanceof Barrier) {
                hasBarriers = true;
            }
        }

        if (hasBarriers) {
            for (let i = 0; i < count; i++) {
                let widget = this.mChildren[i]
                if (widget instanceof Barrier) {
                    (widget as Barrier).markWidgets();
                }
            }
        }

        this.mWidgetsToAdd.clear();

        console.log("CHILDREN", count, this.mChildren)

        for (let i = 0; i < count; i++) {
            let widget = this.mChildren[i]

            console.log ("[ADD_TO_SOLVER] widget", widget)

            if (widget.addFirst()) {
                // if (widget instanceof VirtualLayout) {
                //     mWidgetsToAdd.add(widget);
                // } else {
                widget.addToSolver(system, optimize);
                // }
            }
        }

        console.log("[C] 1S")

// If we have virtual layouts, we need to add them to the solver in the correct
// order (in case they reference one another)
        while (this.mWidgetsToAdd.size > 0) {
            let numLayouts = this.mWidgetsToAdd.size
            let layout = null;
            // for (let widget of this.mWidgetsToAdd) {
            //     // TODO add VirtualLayout support
            //     // break until added
            //
            //     layout = widget as VirtualLayout
            //
            //     // we'll go through the virtual layouts that references others first, to give
            //     // them a shot at setting their constraints.
            //     if (layout.contains(this.mWidgetsToAdd)) {
            //         layout.addToSolver(system, optimize);
            //         this.mWidgetsToAdd.delete(layout);
            //         break;
            //     }
            // }
            if (numLayouts === this.mWidgetsToAdd.size) {
                console.log("####adding widgets####")
                console.log("   toAdd:", this.mWidgetsToAdd)
                console.log("####              ####")
                // looks we didn't find anymore dependency, let's add everything.
                for (let widget of this.mWidgetsToAdd) {
                    widget.addToSolver(system, optimize);
                }
                this.mWidgetsToAdd.clear();
            }
        }

        console.log("[C] 1E")
        console.log("[C] 2S")

        if (LinearSystem.USE_DEPENDENCY_ORDERING) {
            console.log("[C] use DepOrdering")

            let widgetsToAdd = new Set<ConstraintWidget>();
            for (let i = 0; i < count; i++) {
                let widget = this.mChildren[i]
                if (!widget.addFirst()) {
                    widgetsToAdd.add(widget);
                }
            }
            let orientation = ConstraintWidgetContainer.VERTICAL;
            if (this.getHorizontalDimensionBehaviour() === DimensionBehaviour.WRAP_CONTENT) {
                orientation = ConstraintWidgetContainer.HORIZONTAL;
            }
            this.addChildrenToSolverByDependency(this, system, widgetsToAdd, orientation, false);
            for (let widget of widgetsToAdd) {
                Optimizer.checkMatchParent(this, system, widget);
                widget.addToSolver(system, optimize);
            }
        } else {
            console.log("[C] no DepOrdering => begin sublayout loop", count)

            for (let i = 0; i < count; i++) {

                let widget = this.mChildren[i]
                console.log(`[C]    ${i}/${count}`, widget)

                if (widget instanceof ConstraintWidgetContainer) {
                    let horizontalBehaviour =
                        widget.mListDimensionBehaviors[ConstraintWidgetContainer.DIMENSION_HORIZONTAL];
                    let verticalBehaviour =
                        widget.mListDimensionBehaviors[ConstraintWidgetContainer.DIMENSION_VERTICAL];
                    if (horizontalBehaviour === DimensionBehaviour.WRAP_CONTENT) {
                        widget.setHorizontalDimensionBehaviour(DimensionBehaviour.FIXED);
                    }

                    console.log(`[C]    set horizontal}`)


                    if (verticalBehaviour === DimensionBehaviour.WRAP_CONTENT) {
                        widget.setVerticalDimensionBehaviour(DimensionBehaviour.FIXED);
                    }
                    widget.addToSolver(system, optimize);
                    if (horizontalBehaviour === DimensionBehaviour.WRAP_CONTENT) {
                        widget.setHorizontalDimensionBehaviour(horizontalBehaviour);
                    }
                    if (verticalBehaviour === DimensionBehaviour.WRAP_CONTENT) {
                        widget.setVerticalDimensionBehaviour(verticalBehaviour);
                    }

                    console.log(`[C]    set vertical}`)
                } else {
                    console.log(`[C]    no sublayout}`)

                    Optimizer.checkMatchParent(this, system, widget);

                    console.log(`[C]    check match parent}`)

                    if (!widget.addFirst()) {
                        console.log(`[C]    try add to solver`)
                        widget.addToSolver(system, optimize);
                        console.log(`[C]    added to solver`)
                    }

                    console.log(`[C]    added first}`)
                }

                console.log("[C]    loop end")
            }
        }

        console.log("[C] 2E")

        if (this.mHorizontalChainsSize > 0) {
            Chain.applyChainConstraints(this, system, null, ConstraintWidgetContainer.HORIZONTAL);
        }
        if (this.mVerticalChainsSize > 0) {
            Chain.applyChainConstraints(this, system, null, ConstraintWidgetContainer.VERTICAL);
        }

        console.log("about to return true")

        return true;
    }

    public updateChildrenFromSolver(system: LinearSystem, flags: boolean[]) {
        flags[Optimizer.FLAG_RECOMPUTE_BOUNDS] = false;
        let optimize = this.optimizeFor(Optimizer.OPTIMIZATION_GRAPH);
        this.updateFromSolver(system, optimize);
        const count = this.mChildren.length
        let hasOverride = false;
        for (let i = 0; i < count; i++) {
            let widget = this.mChildren[i]
            widget.updateFromSolver(system, optimize);
            if (widget.hasDimensionOverride()) {
                hasOverride = true;
            }
        }
        return hasOverride;
    }

    public updateFromRuns(updateHorizontal: boolean, updateVertical: boolean) {
        super.updateFromRuns(updateHorizontal, updateVertical);
        const count = this.mChildren.length
        for (let i = 0; i < count; i++) {
            let widget = this.mChildren[i]
            widget.updateFromRuns(updateHorizontal, updateVertical);
        }
    }

    public setPadding(left: number, top: number, right: number, bottom: number) {
        this.mPaddingLeft = left;
        this.mPaddingTop = top;
        this.mPaddingRight = right;
        this.mPaddingBottom = bottom;
    }

    /**
     * Set the rtl status. This has implications for Chains.
     *
     * @param isRtl true if we are in RTL.
     */
    public setRtl(isRtl: boolean) {
        this.mIsRtl = isRtl;
    }

    /**
     * Returns the rtl status.
     *
     * @return true if in RTL, false otherwise.
     */
    public isRtl() {
        return this.mIsRtl;
    }

    mMeasure = new Measure()

    public static measure(level: number,
                          widget: ConstraintWidget,
                          measurer: Measurer | null,
                          measure: Measure,
                          measureStrategy: number) {

        console.log ("static measure")

        if (measurer == null) {
            return false;
        }
        if (widget.getVisibility() === ConstraintWidgetContainer.GONE
            || widget instanceof Guideline
            || widget instanceof Barrier) {
            measure.measuredWidth = 0;
            measure.measuredHeight = 0;
            return false;
        }

        measure.horizontalBehavior = widget.getHorizontalDimensionBehaviour();
        measure.verticalBehavior = widget.getVerticalDimensionBehaviour();
        measure.horizontalDimension = widget.getWidth();
        measure.verticalDimension = widget.getHeight();
        measure.measuredNeedsSolverPass = false;
        measure.measureStrategy = measureStrategy;

        let horizontalMatchConstraints = (measure.horizontalBehavior == DimensionBehaviour.MATCH_CONSTRAINT);
        let verticalMatchConstraints = (measure.verticalBehavior == DimensionBehaviour.MATCH_CONSTRAINT);

        let horizontalUseRatio = horizontalMatchConstraints && widget.mDimensionRatio > 0;
        let verticalUseRatio = verticalMatchConstraints && widget.mDimensionRatio > 0;

        if (horizontalMatchConstraints && widget.hasDanglingDimension(ConstraintWidgetContainer.HORIZONTAL)
            && widget.mMatchConstraintDefaultWidth == ConstraintWidgetContainer.MATCH_CONSTRAINT_SPREAD
            && !horizontalUseRatio) {
            horizontalMatchConstraints = false;
            measure.horizontalBehavior = DimensionBehaviour.WRAP_CONTENT;
            if (verticalMatchConstraints
                && widget.mMatchConstraintDefaultHeight == ConstraintWidgetContainer.MATCH_CONSTRAINT_SPREAD) {
                // if match x match, size would be zero.
                measure.horizontalBehavior = DimensionBehaviour.FIXED;
            }
        }

        if (verticalMatchConstraints && widget.hasDanglingDimension(ConstraintWidgetContainer.VERTICAL)
            && widget.mMatchConstraintDefaultHeight == ConstraintWidgetContainer.MATCH_CONSTRAINT_SPREAD
            && !verticalUseRatio) {
            verticalMatchConstraints = false;
            measure.verticalBehavior = DimensionBehaviour.WRAP_CONTENT;
            if (horizontalMatchConstraints
                && widget.mMatchConstraintDefaultWidth == ConstraintWidgetContainer.MATCH_CONSTRAINT_SPREAD) {
                // if match x match, size would be zero.
                measure.verticalBehavior = DimensionBehaviour.FIXED;
            }
        }

        if (widget.isResolvedHorizontally()) {
            horizontalMatchConstraints = false;
            measure.horizontalBehavior = DimensionBehaviour.FIXED;
        }
        if (widget.isResolvedVertically()) {
            verticalMatchConstraints = false;
            measure.verticalBehavior = DimensionBehaviour.FIXED;
        }

        if (horizontalUseRatio) {
            if (widget.mResolvedMatchConstraintDefault[ConstraintWidgetContainer.HORIZONTAL]
                == ConstraintWidget.MATCH_CONSTRAINT_RATIO_RESOLVED) {
                measure.horizontalBehavior = DimensionBehaviour.FIXED;
            } else if (!verticalMatchConstraints) {
                // let's measure here
                let measuredHeight;
                if (measure.verticalBehavior == DimensionBehaviour.FIXED) {
                    measuredHeight = measure.verticalDimension;
                } else {
                    measure.horizontalBehavior = DimensionBehaviour.WRAP_CONTENT;
                    measurer.measure(widget, measure);
                    measuredHeight = measure.measuredHeight;
                }
                measure.horizontalBehavior = DimensionBehaviour.FIXED;
                // regardless of which side we are using for the ratio, getDimensionRatio() already
                // made sure that it's expressed in WxH format, so we can simply go and multiply
                measure.horizontalDimension = Math.round(widget.getDimensionRatio() * measuredHeight);
            }
        }
        if (verticalUseRatio) {
            if (widget.mResolvedMatchConstraintDefault[ConstraintWidgetContainer.VERTICAL]
                == ConstraintWidget.MATCH_CONSTRAINT_RATIO_RESOLVED) {
                measure.verticalBehavior = DimensionBehaviour.FIXED;
            } else if (!horizontalMatchConstraints) {
                // let's measure here
                let measuredWidth;
                if (measure.horizontalBehavior == DimensionBehaviour.FIXED) {
                    measuredWidth = measure.horizontalDimension;
                } else {
                    measure.verticalBehavior = DimensionBehaviour.WRAP_CONTENT;
                    measurer.measure(widget, measure);
                    measuredWidth = measure.measuredWidth;
                }
                measure.verticalBehavior = DimensionBehaviour.FIXED;
                if (widget.getDimensionRatioSide() == -1) {
                    // regardless of which side we are using for the ratio,
                    //  getDimensionRatio() already
                    // made sure that it's expressed in WxH format,
                    //  so we can simply go and divide
                    measure.verticalDimension = Math.round(measuredWidth / widget.getDimensionRatio());
                } else {
                    // getDimensionRatio() already got reverted, so we can simply multiply
                    measure.verticalDimension = Math.round(widget.getDimensionRatio() * measuredWidth);
                }
            }
        }

        console.log ("measuring using provided measurer")
        measurer.measure(widget, measure);
        widget.setWidth(measure.measuredWidth);
        widget.setHeight(measure.measuredHeight);
        widget.setHasBaseline(measure.measuredHasBaseline);
        widget.setBaselineDistance(measure.measuredBaseline);
        measure.measureStrategy = Measure.SELF_DIMENSIONS;
        return measure.measuredNeedsSolverPass;
    }

    static sMyCounter = 0

    public layout() {
        console.log("calling container layout")

        this.mX = 0;
        this.mY = 0;

        this.mWidthMeasuredTooSmall = false;
        this.mHeightMeasuredTooSmall = false;
        const count = this.mChildren.length

        let preW = Math.max(0, this.getWidth());
        let preH = Math.max(0, this.getHeight());
        let originalVerticalDimensionBehaviour = this.mListDimensionBehaviors[ConstraintWidgetContainer.DIMENSION_VERTICAL];let originalHorizontalDimensionBehaviour = this.mListDimensionBehaviors[ConstraintWidgetContainer.DIMENSION_HORIZONTAL];

        console.log ("[pivoting]pre", preW)

        let wrap_override = false;

        // Only try the direct optimization in the first layout pass
        if (this.mPass === 0 && Optimizer.enabled(this.mOptimizationLevel, Optimizer.OPTIMIZATION_DIRECT)) {
            console.log("using optimizer")

            Direct.solvingPass(this, this.getMeasurer()!);

            for (let i = 0; i < count; i++) {
                let child = this.mChildren[i]

                if (child.isMeasureRequested()
                    && !(child instanceof Guideline)
                    && !(child instanceof Barrier)
                    && !(child instanceof VirtualLayout)
                    && !child.isInVirtualLayout()) {

                    console.log ("measure requested")

                    let widthBehavior = child.getDimensionBehaviour(ConstraintWidgetContainer.HORIZONTAL);
                    let heightBehavior = child.getDimensionBehaviour(ConstraintWidgetContainer.VERTICAL);

                    let skip = widthBehavior == DimensionBehaviour.MATCH_CONSTRAINT
                        && child.mMatchConstraintDefaultWidth != ConstraintWidgetContainer.MATCH_CONSTRAINT_WRAP
                        && heightBehavior == DimensionBehaviour.MATCH_CONSTRAINT
                        && child.mMatchConstraintDefaultHeight != ConstraintWidgetContainer.MATCH_CONSTRAINT_WRAP;

                    console.log ("should skip", skip)

                    if (!skip) {
                        let measure = new Measure();
                        ConstraintWidgetContainer.measure(0, child, this.mMeasurer,
                            measure, Measure.SELF_DIMENSIONS);
                    }
                }
            }
            // let's measure children
        } else {
        }

        if (count > 2 && (originalHorizontalDimensionBehaviour == DimensionBehaviour.WRAP_CONTENT
                || originalVerticalDimensionBehaviour == DimensionBehaviour.WRAP_CONTENT)
            && Optimizer.enabled(this.mOptimizationLevel, Optimizer.OPTIMIZATION_GROUPING)) {
            if (Grouping.simpleSolvingPass(this, this.getMeasurer())) {
                if (originalHorizontalDimensionBehaviour == DimensionBehaviour.WRAP_CONTENT) {
                    if (preW < this.getWidth() && preW > 0) {
                        this.setWidth(preW);
                        this.mWidthMeasuredTooSmall = true;
                    } else {
                        preW = this.getWidth();
                    }
                }
                if (originalVerticalDimensionBehaviour == DimensionBehaviour.WRAP_CONTENT) {
                    if (preH < this.getHeight() && preH > 0) {
                        this.setHeight(preH);
                        this.mHeightMeasuredTooSmall = true;
                    } else {
                        preH = this.getHeight();
                    }
                }
                wrap_override = true;
            }
        }
        let useGraphOptimizer = this.optimizeFor(Optimizer.OPTIMIZATION_GRAPH)
            || this.optimizeFor(Optimizer.OPTIMIZATION_GRAPH_WRAP);

        this.mSystem.graphOptimizer = false;
        this.mSystem.newgraphOptimizer = false;

        if (this.mOptimizationLevel != Optimizer.OPTIMIZATION_NONE
            && useGraphOptimizer) {
            this.mSystem.newgraphOptimizer = true;
        }

        let countSolve = 0;
        const allChildren: ConstraintWidget[] = this.mChildren;
        let hasWrapContent = this.getHorizontalDimensionBehaviour() == DimensionBehaviour.WRAP_CONTENT
            || this.getVerticalDimensionBehaviour() == DimensionBehaviour.WRAP_CONTENT;

        // Reset the chains before iterating on our children
        this.resetChains();
        countSolve = 0;

        // Before we solve our system, we should call layout() on any
        // of our children that is a container.
        for (let i = 0; i < count; i++) {
            let widget = this.mChildren[i]
            if (widget instanceof WidgetContainer) {
                (widget as WidgetContainer).layout();
            }
        }
        let optimize = this.optimizeFor(Optimizer.OPTIMIZATION_GRAPH);

        // Now let's solve our system as usual
        let needsSolving = true;
        while (needsSolving) {
            countSolve++;
            try {
                this.mSystem.reset();
                this.resetChains();
                // if (DEBUG) {
                //     String debugName = getDebugName();
                //     if (debugName == null) {
                //         debugName = "root";
                //     }
                //     setDebugSolverName(mSystem, debugName);
                //     for (let i = 0; i < count; i++) {
                //         let widget = mChildren.get(i);
                //         if (widget.getDebugName() != null) {
                //             widget.setDebugSolverName(mSystem, widget.getDebugName());
                //         }
                //     }
                // } else {
                this.createObjectVariables(this.mSystem);
                for (let i = 0; i < count; i++) {
                    let widget = this.mChildren[i]
                    widget.createObjectVariables(this.mSystem);
                    // }
                }
                needsSolving = this.addChildrenToSolver(this.mSystem);

                console.log("[SYSTEM]", this.mSystem)

                console.log("system needs solving", needsSolving)

                if (this.mVerticalWrapMin != null && Deref(this.mVerticalWrapMin) != null) {
                    this.addMinWrap(Deref(this.mVerticalWrapMin)!, this.mSystem.createObjectVariable(this.mTop));
                    this.mVerticalWrapMin = null;
                }
                if (this.mVerticalWrapMax != null && Deref(this.mVerticalWrapMax) != null) {
                    this.addMaxWrap(Deref(this.mVerticalWrapMax)!, this.mSystem.createObjectVariable(this.mBottom));
                    this.mVerticalWrapMax = null;
                }
                if (this.mHorizontalWrapMin != null && Deref(this.mHorizontalWrapMin) != null) {
                    this.addMinWrap(Deref(this.mHorizontalWrapMin)!, this.mSystem.createObjectVariable(this.mLeft));
                    this.mHorizontalWrapMin = null;
                }
                if (this.mHorizontalWrapMax != null && Deref(this.mHorizontalWrapMax) != null) {
                    this.addMaxWrap(Deref(this.mHorizontalWrapMax)!, this.mSystem.createObjectVariable(this.mRight));
                    this.mHorizontalWrapMax = null;
                }
                if (needsSolving) {
                    console.log("minimizing")
                    this.mSystem.minimize();
                }
            } catch (e: any) {
            }
            if (needsSolving) {
                needsSolving = this.updateChildrenFromSolver(this.mSystem, Optimizer.sFlags);
                console.log("system still needs solving", needsSolving)
            } else {
                this.updateFromSolver(this.mSystem, optimize);
                for (let i = 0; i < count; i++) {
                    let widget = this.mChildren[i]
                    widget.updateFromSolver(this.mSystem, optimize);
                }
                needsSolving = false;
            }

            if (hasWrapContent && countSolve < ConstraintWidgetContainer.MAX_ITERATIONS && Optimizer.sFlags[Optimizer.FLAG_RECOMPUTE_BOUNDS]) {
                // let's get the new bounds
                let maxX = 0;
                let maxY = 0;
                for (let i = 0; i < count; i++) {
                    let widget = this.mChildren[i]
                    maxX = Math.max(maxX, widget.mX + widget.getWidth());
                    maxY = Math.max(maxY, widget.mY + widget.getHeight());
                }
                maxX = Math.max(this.mMinWidth, maxX);
                maxY = Math.max(this.mMinHeight, maxY);
                if (originalHorizontalDimensionBehaviour == DimensionBehaviour.WRAP_CONTENT) {
                    if (this.getWidth() < maxX) {
                        this.setWidth(maxX);
                        // force using the solver
                        this.mListDimensionBehaviors[ConstraintWidgetContainer.DIMENSION_HORIZONTAL] = DimensionBehaviour.WRAP_CONTENT;
                        wrap_override = true;
                        needsSolving = true;
                    }
                }
                if (originalVerticalDimensionBehaviour == DimensionBehaviour.WRAP_CONTENT) {
                    if (this.getHeight() < maxY) {
                        this.setHeight(maxY);
                        // force using the solver
                        this.mListDimensionBehaviors[ConstraintWidgetContainer.DIMENSION_VERTICAL] = DimensionBehaviour.WRAP_CONTENT;
                        wrap_override = true;
                        needsSolving = true;
                    }
                }
            }
            if (true) {
                let width = Math.max(this.mMinWidth, this.getWidth());
                if (width > this.getWidth()) {
                    this.setWidth(width);
                    this.mListDimensionBehaviors[ConstraintWidgetContainer.DIMENSION_HORIZONTAL] = DimensionBehaviour.FIXED;
                    wrap_override = true;
                    needsSolving = true;
                }
                let height = Math.max(this.mMinHeight, this.getHeight());
                if (height > this.getHeight()) {
                    this.setHeight(height);
                    this.mListDimensionBehaviors[ConstraintWidgetContainer.DIMENSION_VERTICAL] = DimensionBehaviour.FIXED;
                    wrap_override = true;
                    needsSolving = true;
                }

                if (!wrap_override) {
                    if (this.mListDimensionBehaviors[ConstraintWidgetContainer.DIMENSION_HORIZONTAL] == DimensionBehaviour.WRAP_CONTENT
                        && preW > 0) {
                        if (this.getWidth() > preW) {
                            this.mWidthMeasuredTooSmall = true;
                            wrap_override = true;
                            this.mListDimensionBehaviors[ConstraintWidgetContainer.DIMENSION_HORIZONTAL] = DimensionBehaviour.FIXED;
                            this.setWidth(preW);
                            needsSolving = true;
                        }
                    }
                    if (this.mListDimensionBehaviors[ConstraintWidgetContainer.DIMENSION_VERTICAL] == DimensionBehaviour.WRAP_CONTENT
                        && preH > 0) {
                        if (this.getHeight() > preH) {
                            this.mHeightMeasuredTooSmall = true;
                            wrap_override = true;
                            this.mListDimensionBehaviors[ConstraintWidgetContainer.DIMENSION_VERTICAL] = DimensionBehaviour.FIXED;
                            this.setHeight(preH);
                            needsSolving = true;
                        }
                    }
                }

                if (countSolve > ConstraintWidgetContainer.MAX_ITERATIONS) {
                    needsSolving = false;
                }
            }
        }

        this.mChildren = allChildren as ConstraintWidget[]

        if (wrap_override) {
            this.mListDimensionBehaviors[ConstraintWidgetContainer.DIMENSION_HORIZONTAL] = originalHorizontalDimensionBehaviour;
            this.mListDimensionBehaviors[ConstraintWidgetContainer.DIMENSION_VERTICAL] = originalVerticalDimensionBehaviour;
        }

        this.resetSolverVariables(this.mSystem.getCache());
    }

    public handlesInternalConstraints() {
        return false;
    }

    /*-----------------------------------------------------------------------*/
    // Guidelines
    /*-----------------------------------------------------------------------*/

    /**
     * Accessor to the vertical guidelines contained in the table.
     *
     * @return array of guidelines
     */
    public getVerticalGuidelines() { // TODO potential error cause
        let guidelines: Guideline[] = []
        for (let i = 0, mChildrenSize = this.mChildren.length; i < mChildrenSize; i++) {
            const widget = this.mChildren[i]
            if (widget instanceof Guideline) {
                let guideline = widget as Guideline
                if (guideline.getOrientation() == Guideline.VERTICAL) {
                    guidelines.push(guideline);
                }
            }
        }
        return guidelines;
    }

    public getHorizontalGuidelines() {
        let guidelines: Guideline[] = []
        for (let i = 0, mChildrenSize = this.mChildren.length; i < mChildrenSize; i++) {
            const widget = this.mChildren[i]
            if (widget instanceof Guideline) {
                let guideline = widget as Guideline
                if (guideline.getOrientation() == Guideline.HORIZONTAL) {
                    guidelines.push(guideline);
                }
            }
        }
        return guidelines;
    }

    public getSystem() {
        return this.mSystem;
    }

    private resetChains() {
        this.mHorizontalChainsSize = 0;
        this.mVerticalChainsSize = 0;
    }

    /**
     * Add the chain which constraintWidget is part of. Called by ConstraintWidget::addToSolver()
     *
     * @param type HORIZONTAL or VERTICAL chain
     */
    addChain(constraintWidget: ConstraintWidget, type: number) {
        let widget = constraintWidget;
        if (type == ConstraintWidgetContainer.HORIZONTAL) {
            this.addHorizontalChain(widget);
        } else if (type == ConstraintWidgetContainer.VERTICAL) {
            this.addVerticalChain(widget);
        }
    }

    /**
     * Add a widget to the list of horizontal chains. The widget is the left-most widget
     * of the chain which doesn't have a left dual connection.
     *
     * @param widget widget starting the chain
     */
    private addHorizontalChain(widget: ConstraintWidget) {
        if (this.mHorizontalChainsSize + 1 >= this.mHorizontalChainsArray.length) {
            this.mHorizontalChainsArray = Arrays.copy(this.mHorizontalChainsArray, this.mHorizontalChainsArray.length * 2);
        }
        this.mHorizontalChainsArray[this.mHorizontalChainsSize] = new ChainHead(widget, ConstraintWidgetContainer.HORIZONTAL, this.isRtl());
        this.mHorizontalChainsSize++;
    }

    private addVerticalChain(widget: ConstraintWidget) {
        if (this.mVerticalChainsSize + 1 >= this.mVerticalChainsArray.length) {
            this.mVerticalChainsArray = Arrays.copy(this.mVerticalChainsArray, this.mVerticalChainsArray.length * 2);
        }
        this.mVerticalChainsArray[this.mVerticalChainsSize] = new ChainHead(widget, ConstraintWidgetContainer.VERTICAL, this.isRtl());
        this.mVerticalChainsSize++;
    }

    public setPass(pass: number) {
        this.mPass = pass;
    }
}

export class Barrier extends HelperWidget {
    public static readonly LEFT = 0;
    public static readonly RIGHT = 1;
    public static readonly TOP = 2;
    public static readonly BOTTOM = 3;
    private static readonly USE_RESOLUTION = true;
    private static readonly USE_RELAX_GONE = false;

    private mBarrierType = Barrier.LEFT;

    private mAllowsGoneWidget = true;
    private mMargin = 0;
    mResolved = false;

    constructor(debugName?: string) {
        super()

        if (debugName) {
            this.setDebugName(debugName)
        }
    }

    allowedInBarrier(): boolean {
        return true
    }

    getBarrierType() {
        return this.mBarrierType
    }

    public setBarrierType(barrierType: number) {
        this.mBarrierType = barrierType;
    }

    public setAllowsGoneWidget(allowsGoneWidget: boolean) {
        this.mAllowsGoneWidget = allowsGoneWidget;
    }

    public allowsGoneWidget() {
        return this.mAllowsGoneWidget;
    }

    public getAllowsGoneWidget() {
        return this.mAllowsGoneWidget;
    }

    public isResolvedHorizontally() {
        return this.mResolved;
    }

    public isResolvedVertically() {
        return this.mResolved;
    }

    public copy(src: ConstraintWidget, map: Map<ConstraintWidget, ConstraintWidget>) {
        super.copy(src, map);
        let srcBarrier = src as Barrier
        this.mBarrierType = srcBarrier.mBarrierType;
        this.mAllowsGoneWidget = srcBarrier.mAllowsGoneWidget;
        this.mMargin = srcBarrier.mMargin;
    }

    public toString() {
        let debug = "[Barrier] " + this.getDebugName() + " {";
        for (let i = 0; i < this.mWidgetsCount; i++) {
            let widget = this.mWidgets[i];
            if (i > 0) {
                debug += ", ";
            }
            debug += widget?.getDebugName();
        }
        debug += "}";
        return debug;
    }

    markWidgets() {
        for (let i = 0; i < this.mWidgetsCount; i++) {
            let widget = this.mWidgets[i]!
            if (!this.mAllowsGoneWidget && !widget.allowedInBarrier()) {
                continue;
            }
            if (this.mBarrierType == Barrier.LEFT || this.mBarrierType == Barrier.RIGHT) {
                widget.setInBarrier(ConstraintWidget.HORIZONTAL, true);
            } else if (this.mBarrierType == Barrier.TOP || this.mBarrierType == Barrier.BOTTOM) {
                widget.setInBarrier(ConstraintWidget.VERTICAL, true);
            }
        }
    }

    public addToSolver(system: LinearSystem, optimize: boolean) {

        let position
        this.mListAnchors[Barrier.LEFT] = this.mLeft;
        this.mListAnchors[Barrier.TOP] = this.mTop;
        this.mListAnchors[Barrier.RIGHT] = this.mRight;
        this.mListAnchors[Barrier.BOTTOM] = this.mBottom;
        for (let i = 0; i < this.mListAnchors.length; i++) {
            this.mListAnchors[i].mSolverVariable = system.createObjectVariable(this.mListAnchors[i])!
        }
        if (this.mBarrierType >= 0 && this.mBarrierType < 4) {
            position = this.mListAnchors[this.mBarrierType];
        } else {
            return;
        }

        if (Barrier.USE_RESOLUTION) {
            if (!this.mResolved) {
                this.allSolved();
            }
            if (this.mResolved) {
                this.mResolved = false;
                if (this.mBarrierType == Barrier.LEFT || this.mBarrierType == Barrier.RIGHT) {
                    system.addEqualityConstant(this.mLeft.mSolverVariable!, this.mX);
                    system.addEqualityConstant(this.mRight.mSolverVariable!, this.mX);
                } else if (this.mBarrierType == Barrier.TOP || this.mBarrierType == Barrier.BOTTOM) {
                    system.addEqualityConstant(this.mTop.mSolverVariable!, this.mY);
                    system.addEqualityConstant(this.mBottom.mSolverVariable!, this.mY);
                }
                return;
            }
        }

// We have to handle the case where some of the elements
//  referenced in the barrier are set as
// match_constraint; we have to take it in account to set the strength of the barrier.
        let hasMatchConstraintWidgets = false;
        for (let i = 0; i < this.mWidgetsCount; i++) {
            let widget = this.mWidgets[i]!
            if (!this.mAllowsGoneWidget && !widget.allowedInBarrier()) {
                continue;
            }
            if ((this.mBarrierType == Barrier.LEFT || this.mBarrierType == Barrier.RIGHT)
                && (widget.getHorizontalDimensionBehaviour()
                    == DimensionBehaviour.MATCH_CONSTRAINT)
                && widget.mLeft.mTarget != null && widget.mRight.mTarget != null) {
                hasMatchConstraintWidgets = true;
                break;
            } else if ((this.mBarrierType == Barrier.TOP || this.mBarrierType == Barrier.BOTTOM)
                && (widget.getVerticalDimensionBehaviour()
                    == DimensionBehaviour.MATCH_CONSTRAINT)
                && widget.mTop.mTarget != null && widget.mBottom.mTarget != null) {
                hasMatchConstraintWidgets = true;
                break;
            }
        }

        let mHasHorizontalCenteredDependents =
            this.mLeft.hasCenteredDependents() || this.mRight.hasCenteredDependents();
        let mHasVerticalCenteredDependents =
            this.mTop.hasCenteredDependents() || this.mBottom.hasCenteredDependents();
        let applyEqualityOnReferences = !hasMatchConstraintWidgets
            && ((this.mBarrierType == Barrier.LEFT && mHasHorizontalCenteredDependents)
                || (this.mBarrierType == Barrier.TOP && mHasVerticalCenteredDependents)
                || (this.mBarrierType == Barrier.RIGHT && mHasHorizontalCenteredDependents)
                || (this.mBarrierType == Barrier.BOTTOM && mHasVerticalCenteredDependents));

        let equalityOnReferencesStrength = SolverVariable.STRENGTH_EQUALITY;
        if (!applyEqualityOnReferences) {
            equalityOnReferencesStrength = SolverVariable.STRENGTH_HIGHEST;
        }
        for (let i = 0; i < this.mWidgetsCount; i++) {
            let widget = this.mWidgets[i]!
            if (!this.mAllowsGoneWidget && !widget.allowedInBarrier()) {
                continue;
            }
            let target = system.createObjectVariable(widget.mListAnchors[this.mBarrierType])!
            widget.mListAnchors[this.mBarrierType].mSolverVariable = target;
            let margin = 0;
            if (widget.mListAnchors[this.mBarrierType].mTarget != null
                && widget.mListAnchors[this.mBarrierType].mTarget!.mOwner == this) {
                margin += widget.mListAnchors[this.mBarrierType].mMargin;
            }
            if (this.mBarrierType == Barrier.LEFT || this.mBarrierType == Barrier.TOP) {
                system.addLowerBarrier(position.mSolverVariable!, target,
                    this.mMargin - margin, hasMatchConstraintWidgets);
            } else {
                system.addGreaterBarrier(position.mSolverVariable!, target,
                    this.mMargin + margin, hasMatchConstraintWidgets);
            }
            if (Barrier.USE_RELAX_GONE) {
                if (widget.getVisibility() != Barrier.GONE
                    || widget instanceof Guideline || widget instanceof Barrier) {
                    system.addEquality(position.mSolverVariable, target, this.mMargin + margin, equalityOnReferencesStrength);
                }
            } else {
                system.addEquality(position.mSolverVariable, target, this.mMargin + margin, equalityOnReferencesStrength);
            }
        }

        let barrierParentStrength = SolverVariable.STRENGTH_HIGHEST;
        let barrierParentStrengthOpposite = SolverVariable.STRENGTH_NONE;

        if (this.mBarrierType == Barrier.LEFT) {
            system.addEquality(this.mRight.mSolverVariable, this.mLeft.mSolverVariable, 0, SolverVariable.STRENGTH_FIXED);
            system.addEquality(this.mLeft.mSolverVariable, this.mParent!.mRight.mSolverVariable, 0, barrierParentStrength);
            system.addEquality(this.mLeft.mSolverVariable, this.mParent!.mLeft.mSolverVariable, 0, barrierParentStrengthOpposite);
        } else if (this.mBarrierType == Barrier.RIGHT) {
            system.addEquality(this.mLeft.mSolverVariable, this.mRight.mSolverVariable, 0, SolverVariable.STRENGTH_FIXED);
            system.addEquality(this.mLeft.mSolverVariable, this.mParent!.mLeft.mSolverVariable, 0, barrierParentStrength);
            system.addEquality(this.mLeft.mSolverVariable, this.mParent!.mRight.mSolverVariable, 0, barrierParentStrengthOpposite);
        } else if (this.mBarrierType == Barrier.TOP) {
            system.addEquality(this.mBottom.mSolverVariable, this.mTop.mSolverVariable, 0, SolverVariable.STRENGTH_FIXED);
            system.addEquality(this.mTop.mSolverVariable, this.mParent!.mBottom.mSolverVariable, 0, barrierParentStrength);
            system.addEquality(this.mTop.mSolverVariable, this.mParent!.mTop.mSolverVariable, 0, barrierParentStrengthOpposite);
        } else if (this.mBarrierType == Barrier.BOTTOM) {
            system.addEquality(this.mTop.mSolverVariable, this.mBottom.mSolverVariable, 0, SolverVariable.STRENGTH_FIXED);
            system.addEquality(this.mTop.mSolverVariable, this.mParent!.mTop.mSolverVariable, 0, barrierParentStrength);
            system.addEquality(this.mTop.mSolverVariable, this.mParent!.mBottom.mSolverVariable, 0, barrierParentStrengthOpposite);
        }
    }

    public setMargin(margin: number) {
        this.mMargin = margin;
    }

    public getMargin() {
        return this.mMargin;
    }

    // @TODO: add description
    public getOrientation() {
        switch (this.mBarrierType) {
            case Barrier.LEFT:
            case Barrier.RIGHT:
                return Barrier.HORIZONTAL;
            case Barrier.TOP:
            case Barrier.BOTTOM:
                return Barrier.VERTICAL;
        }
        return Barrier.UNKNOWN;
    }

    public allSolved() {
        if (!Barrier.USE_RESOLUTION) {
            return false;
        }
        let hasAllWidgetsResolved = true;
        for (let i = 0; i < this.mWidgetsCount; i++) {
            let widget = this.mWidgets[i]!
            if (!this.mAllowsGoneWidget && !widget.allowedInBarrier()) {
                continue;
            }
            if ((this.mBarrierType == Barrier.LEFT || this.mBarrierType == Barrier.RIGHT)
                && !widget.isResolvedHorizontally()) {
                hasAllWidgetsResolved = false;
            } else if ((this.mBarrierType == Barrier.TOP || this.mBarrierType == Barrier.BOTTOM)
                && !widget.isResolvedVertically()) {
                hasAllWidgetsResolved = false;
            }
        }

        if (hasAllWidgetsResolved && this.mWidgetsCount > 0) {
            // we're done!
            let barrierPosition = 0;
            let initialized = false;
            for (let i = 0; i < this.mWidgetsCount; i++) {
                let widget = this.mWidgets[i]!
                if (!this.mAllowsGoneWidget && !widget.allowedInBarrier()) {
                    continue;
                }
                if (!initialized) {
                    if (this.mBarrierType == Barrier.LEFT) {
                        barrierPosition = widget.getAnchor(ConstraintAnchorType.LEFT)!.getFinalValue();
                    } else if (this.mBarrierType == Barrier.RIGHT) {
                        barrierPosition = widget.getAnchor(ConstraintAnchorType.RIGHT)!.getFinalValue();
                    } else if (this.mBarrierType == Barrier.TOP) {
                        barrierPosition = widget.getAnchor(ConstraintAnchorType.TOP)!.getFinalValue();
                    } else if (this.mBarrierType == Barrier.BOTTOM) {
                        barrierPosition = widget.getAnchor(ConstraintAnchorType.BOTTOM)!.getFinalValue();
                    }
                    initialized = true;
                }
                if (this.mBarrierType == Barrier.LEFT) {
                    barrierPosition = Math.min(barrierPosition, widget.getAnchor(ConstraintAnchorType.LEFT)!.getFinalValue());
                } else if (this.mBarrierType == Barrier.RIGHT) {
                    barrierPosition = Math.max(barrierPosition, widget.getAnchor(ConstraintAnchorType.RIGHT)!.getFinalValue());
                } else if (this.mBarrierType == Barrier.TOP) {
                    barrierPosition = Math.min(barrierPosition, widget.getAnchor(ConstraintAnchorType.TOP)!.getFinalValue());
                } else if (this.mBarrierType == Barrier.BOTTOM) {
                    barrierPosition = Math.max(barrierPosition, widget.getAnchor(ConstraintAnchorType.BOTTOM)!.getFinalValue());
                }
            }
            barrierPosition += this.mMargin;
            if (this.mBarrierType == Barrier.LEFT || this.mBarrierType == Barrier.RIGHT) {
                this.setFinalHorizontal(barrierPosition, barrierPosition);
            } else {
                this.setFinalVertical(barrierPosition, barrierPosition);
            }
            this.mResolved = true;
            return true;
        }
        return false;
    }
}

export class Guideline extends ConstraintWidget {
    public static readonly HORIZONTAL = 0;
    public static readonly VERTICAL = 1;

    public static readonly RELATIVE_PERCENT = 0;
    public static readonly RELATIVE_BEGIN = 1;
    public static readonly RELATIVE_END = 2;
    public static readonly RELATIVE_UNKNOWN = -1;

    protected mRelativePercent = -1;
    protected mRelativeBegin = -1;
    protected mRelativeEnd = -1;
    protected mGuidelineUseRtl = true;

    private mAnchor = this.mTop;
    private mOrientation = Guideline.HORIZONTAL;
    private mMinimumPosition = 0;
    private mResolved = false

    constructor() {
        super();
        this.mAnchors = []
        this.mAnchors.push(this.mAnchor);
        const count = this.mListAnchors.length;
        for (let i = 0; i < count; i++) {
            this.mListAnchors[i] = this.mAnchor;
        }
    }

    copy(src: ConstraintWidget, map: Map<ConstraintWidget, ConstraintWidget>) {
        super.copy(src, map);

        let srcGuideline = src as Guideline
        this.mRelativePercent = srcGuideline.mRelativePercent;
        this.mRelativeBegin = srcGuideline.mRelativeBegin;
        this.mRelativeEnd = srcGuideline.mRelativeEnd;
        this.mGuidelineUseRtl = srcGuideline.mGuidelineUseRtl;
        this.setOrientation(srcGuideline.mOrientation);
    }

    allowedInBarrier(): boolean {
        return true
    }

    public setOrientation(orientation: number) {
        if (this.mOrientation == orientation) {
            return;
        }
        this.mOrientation = orientation;
        this.mAnchors = []
        if (this.mOrientation == ConstraintWidget.VERTICAL) {
            this.mAnchor = this.mLeft;
        } else {
            this.mAnchor = this.mTop;
        }
        this.mAnchors.push(this.mAnchor);
        const count = this.mListAnchors.length;
        for (let i = 0; i < count; i++) {
            this.mListAnchors[i] = this.mAnchor;
        }
    }

    public getGuidelineAnchor() {
        return this.mAnchor;
    }

    getType(): string | null {
        return "Guideline"
    }

    public getOrientation() {
        return this.mOrientation;
    }

    /**
     * set the minimum position
     * @param minimum
     */
    public setMinimumPosition(minimum: number) {
        this.mMinimumPosition = minimum;
    }

    /**
     * Get the Minimum Position
     * @return the Minimum Position
     */
    public getMinimumPosition() {
        return this.mMinimumPosition;
    }

    getAnchor(anchorType: ConstraintAnchorType) {
        switch (anchorType) {
            case ConstraintAnchorType.LEFT:
            case ConstraintAnchorType.RIGHT: {
                if (this.mOrientation == Guideline.VERTICAL) {
                    return this.mAnchor;
                }
            }
                break;
            case ConstraintAnchorType.TOP:
            case ConstraintAnchorType.BOTTOM: {
                if (this.mOrientation == Guideline.HORIZONTAL) {
                    return this.mAnchor;
                }
            }
                break;
            case ConstraintAnchorType.BASELINE:
            case ConstraintAnchorType.CENTER:
            case ConstraintAnchorType.CENTER_X:
            case ConstraintAnchorType.CENTER_Y:
            case ConstraintAnchorType.NONE:
                return null;
        }
        return null;
    }

    public setGuidePercentFromAbsoluteValue(value: number) {
        this.setGuidePercent(value / 100)
    }

// @TODO: add description
    public setGuidePercent(value: number) {
        if (value > -1) {
            this.mRelativePercent = value;
            this.mRelativeBegin = -1;
            this.mRelativeEnd = -1;
        }
    }

// @TODO: add description
    public setGuideBegin(value: number) {
        if (value > -1) {
            this.mRelativePercent = -1;
            this.mRelativeBegin = value;
            this.mRelativeEnd = -1;
        }
    }

// @TODO: add description
    public setGuideEnd(value: number) {
        if (value > -1) {
            this.mRelativePercent = -1;
            this.mRelativeBegin = -1;
            this.mRelativeEnd = value;
        }
    }

    public getRelativePercent() {
        return this.mRelativePercent;
    }

    public getRelativeBegin() {
        return this.mRelativeBegin;
    }

    public getRelativeEnd() {
        return this.mRelativeEnd;
    }

    public setFinalValue(position: number) {
        this.mAnchor.setFinalValue(position);
        this.mResolved = true;
    }

    public isResolvedHorizontally() {
        return this.mResolved;
    }

    public isResolvedVertically() {
        return this.mResolved;
    }

    addToSolver(system: LinearSystem, optimize: boolean) {
        let parent = this.getParent()  as ConstraintWidgetContainer
        if (parent == null) {
            return;
        }
        let  begin = parent.getAnchor(ConstraintAnchorType.LEFT);
        let end = parent.getAnchor(ConstraintAnchorType.RIGHT);
        let parentWrapContent = this.mParent != null
            ? this.mParent.mListDimensionBehaviors[Guideline.DIMENSION_HORIZONTAL] == DimensionBehaviour.WRAP_CONTENT : false;
        if (this.mOrientation == Guideline.HORIZONTAL) {
            begin = parent.getAnchor(ConstraintAnchorType.TOP);
            end = parent.getAnchor(ConstraintAnchorType.BOTTOM);
            parentWrapContent = this.mParent != null
                ? this.mParent.mListDimensionBehaviors[Guideline.DIMENSION_VERTICAL] == DimensionBehaviour.WRAP_CONTENT : false;
        }
        if (this.mResolved && this.mAnchor.hasFinalValue()) {
            let guide = system.createObjectVariable(this.mAnchor);
            system.addEqualityConstant(guide!, this.mAnchor.getFinalValue());
            if (this.mRelativeBegin != -1) {
                if (parentWrapContent) {
                    system.addGreaterThan(system.createObjectVariable(end), guide,
                        0, SolverVariable.STRENGTH_EQUALITY);
                }
            } else if (this.mRelativeEnd != -1) {
                if (parentWrapContent) {
                    let parentRight = system.createObjectVariable(end);
                    system.addGreaterThan(guide, system.createObjectVariable(begin),
                        0, SolverVariable.STRENGTH_EQUALITY);
                    system.addGreaterThan(parentRight, guide, 0, SolverVariable.STRENGTH_EQUALITY);
                }
            }
            this.mResolved = false;
            return;
        }
        if (this.mRelativeBegin != -1) {
            let guide = system.createObjectVariable(this.mAnchor);
            let parentLeft = system.createObjectVariable(begin);
            system.addEquality(guide, parentLeft, this.mRelativeBegin, SolverVariable.STRENGTH_FIXED);
            if (parentWrapContent) {
                system.addGreaterThan(system.createObjectVariable(end),
                    guide, 0, SolverVariable.STRENGTH_EQUALITY);
            }
        } else if (this.mRelativeEnd != -1) {
            let guide = system.createObjectVariable(this.mAnchor);
            let parentRight = system.createObjectVariable(end);
            system.addEquality(guide, parentRight, -this.mRelativeEnd, SolverVariable.STRENGTH_FIXED);

            if (parentWrapContent) {
                system.addGreaterThan(guide, system.createObjectVariable(begin),
                    0, SolverVariable.STRENGTH_EQUALITY);
                system.addGreaterThan(parentRight, guide, 0, SolverVariable.STRENGTH_EQUALITY);
            }
        } else if (this.mRelativePercent != -1) {
            let guide = system.createObjectVariable(this.mAnchor);
            let parentRight = system.createObjectVariable(end);
            system.addConstraint(LinearSystem.createRowDimensionPercent(system, guide!, parentRight!, this.mRelativePercent));
        }
    }

    updateFromSolver(system: LinearSystem, optimize: boolean) {
        if (this.getParent() == null) {
            return;
        }
        let value = system.getObjectVariableValue(this.mAnchor);
        if (this.mOrientation == Barrier.VERTICAL) {
            this.setX(value);
            this.setY(0);
            this.setHeight(this.getParent()!.getHeight());
            this.setWidth(0);
        } else {
            this.setX(0);
            this.setY(value);
            this.setWidth(this.getParent()!.getWidth());
            this.setHeight(0);
        }
    }

    inferRelativePercentPosition() {
        let percent = (this.getX() / this.getParent()!.getWidth())
        if (this.mOrientation == Guideline.HORIZONTAL) {
            percent = (this.getY() / this.getParent()!.getHeight());
        }
        this.setGuidePercent(percent);
    }

    inferRelativeBeginPosition() {
        let position = this.getX();
        if (this.mOrientation == Guideline.HORIZONTAL) {
            position = this.getY();
        }
        this.setGuideBegin(position);
    }

    inferRelativeEndPosition() {
        let position = this.getParent()!.getWidth() - this.getX();
        if (this.mOrientation == Barrier.HORIZONTAL) {
            position = this.getParent()!.getHeight() - this.getY();
        }
        this.setGuideEnd(position);
    }

    public cyclePosition() {
        if (this.mRelativeBegin != -1) {
            // cycle to percent-based position
            this.inferRelativePercentPosition();
        } else if (this.mRelativePercent != -1) {
            // cycle to end-based position
            this.inferRelativeEndPosition();
        } else if (this.mRelativeEnd != -1) {
            // cycle to begin-based position
            this.inferRelativeBeginPosition();
        }
    }

    public isPercent() {
        return this.mRelativePercent != -1 && this.mRelativeBegin == -1 && this.mRelativeEnd == -1;
    }
}