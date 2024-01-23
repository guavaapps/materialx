import {ConstraintWidgetContainer} from "./ConstraintWidget";
import {LinearSystem} from "./SolverVariable";
import {ConstraintWidget, DimensionBehaviour} from "./ConstraintWidget";

export class Optimizer {
    public static readonly OPTIMIZATION_NONE = 0;
    public static readonly OPTIMIZATION_DIRECT = 1;
    public static readonly OPTIMIZATION_BARRIER = 1 << 1;
    public static readonly OPTIMIZATION_CHAIN = 1 << 2;
    public static readonly OPTIMIZATION_DIMENSIONS = 1 << 3;
    public static readonly OPTIMIZATION_RATIO = 1 << 4;
    public static readonly OPTIMIZATION_GROUPS = 1 << 5;
    public static readonly OPTIMIZATION_GRAPH = 1 << 6;
    public static readonly OPTIMIZATION_GRAPH_WRAP = 1 << 7;
    public static readonly OPTIMIZATION_CACHE_MEASURES = 1 << 8;
    public static readonly OPTIMIZATION_DEPENDENCY_ORDERING = 1 << 9;
    public static readonly OPTIMIZATION_GROUPING = 1 << 10;
    public static readonly OPTIMIZATION_STANDARD = Optimizer.OPTIMIZATION_DIRECT
        /* | OPTIMIZATION_GROUPING */
        /* | OPTIMIZATION_DEPENDENCY_ORDERING */
        | Optimizer.OPTIMIZATION_CACHE_MEASURES
        /* | OPTIMIZATION_GRAPH */
        /* | OPTIMIZATION_GRAPH_WRAP */
        /* | OPTIMIZATION_DIMENSIONS */;

    // Internal use.
    static sFlags: boolean[] = new Array(3)
    static readonly FLAG_USE_OPTIMIZE = 0; // simple enough to use optimizer
    static readonly FLAG_CHAIN_DANGLING = 1;
    static readonly FLAG_RECOMPUTE_BOUNDS = 2;

    static checkMatchParent(container: ConstraintWidgetContainer, system: LinearSystem, widget: ConstraintWidget) {
        widget.mHorizontalResolution = ConstraintWidget.UNKNOWN;
        widget.mVerticalResolution = ConstraintWidget.UNKNOWN;
        if (container.mListDimensionBehaviors[ConstraintWidget.DIMENSION_HORIZONTAL] != DimensionBehaviour.WRAP_CONTENT
            && widget.mListDimensionBehaviors[ConstraintWidget.DIMENSION_HORIZONTAL] == DimensionBehaviour.MATCH_PARENT) {

            let left = widget.mLeft.mMargin;
            let right = container.getWidth() - widget.mRight.mMargin;

            widget.mLeft.mSolverVariable = system.createObjectVariable(widget.mLeft)!
            widget.mRight.mSolverVariable = system.createObjectVariable(widget.mRight)!
            system.addEqualityConstant(widget.mLeft.mSolverVariable, left);
            system.addEqualityConstant(widget.mRight.mSolverVariable, right);
            widget.mHorizontalResolution = ConstraintWidget.DIRECT;
            widget.setHorizontalDimension(left, right);
        }
        if (container.mListDimensionBehaviors[ConstraintWidget.DIMENSION_VERTICAL] != DimensionBehaviour.WRAP_CONTENT
            && widget.mListDimensionBehaviors[ConstraintWidget.DIMENSION_VERTICAL] == DimensionBehaviour.MATCH_PARENT) {

            let top = widget.mTop.mMargin;
            let bottom = container.getHeight() - widget.mBottom.mMargin;

            widget.mTop.mSolverVariable = system.createObjectVariable(widget.mTop)!
            widget.mBottom.mSolverVariable = system.createObjectVariable(widget.mBottom)!
            system.addEqualityConstant(widget.mTop.mSolverVariable, top);
            system.addEqualityConstant(widget.mBottom.mSolverVariable, bottom);
            if (widget.mBaselineDistance > 0 || widget.getVisibility() == ConstraintWidget.GONE) {
                widget.mBaseline.mSolverVariable = system.createObjectVariable(widget.mBaseline)!
                system.addEqualityConstant(widget.mBaseline.mSolverVariable,
                    top + widget.mBaselineDistance);
            }
            widget.mVerticalResolution = ConstraintWidget.DIRECT;
            widget.setVerticalDimension(top, bottom);
        }
    }

// @TODO: add description
    public static enabled(optimizationLevel: number, optimization: number) {
        return (optimizationLevel & optimization) == optimization;
    }
}