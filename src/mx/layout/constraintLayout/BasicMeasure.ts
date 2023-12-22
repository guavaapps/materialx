import {ConstraintWidget, DimensionBehaviour} from "./ConstraintWidget";
import {ConstraintWidgetContainer} from "./ConstraintWidgetContainer";
import {Guideline} from "./Guideline";
import {Barrier} from "./Barrier";
import {ConstraintAnchorType} from "./ConstraintAnchor";
import {Optimizer} from "./Optimizer";
import {Helper} from "./Helper";
import {VirtualLayout} from "./VirtualLayout";
import {Interfaces} from "./utils";

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
    measure (widgt: ConstraintWidget, measure: Measure): void

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
        let measurer = layout.getMeasurer();
        let layoutTime = 0;

        const childCount = layout.mChildren.length
        let startingWidth = layout.getWidth();
        let startingHeight = layout.getHeight();

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

        if (!allSolved || computations != 2) {
            let optimizations = layout.getOptimizationLevel();
            if (childCount > 0) {
                this.measureChildren(layout);
            }

            this.updateHierarchy(layout);

            // let's update the size dependent widgets if any...
            const sizeDependentWidgetsCount = this.mVariableDimensionsWidgets.length

            // let's solve the linear system.
            if (childCount > 0) {
                this.solveLinearSystem(layout, "First pass", 0, startingWidth, startingHeight);
            }

            if (sizeDependentWidgetsCount > 0) {
                let needSolverPass = false;
                let containerWrapWidth = layout.getHorizontalDimensionBehaviour()
                    == DimensionBehaviour.WRAP_CONTENT;
                let containerWrapHeight = layout.getVerticalDimensionBehaviour()
                    == DimensionBehaviour.WRAP_CONTENT;
                let minWidth = Math.max(layout.getWidth(),
                    this.mConstraintWidgetContainer.getMinWidth());
                let minHeight = Math.max(layout.getHeight(),
                    this.mConstraintWidgetContainer.getMinHeight());

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