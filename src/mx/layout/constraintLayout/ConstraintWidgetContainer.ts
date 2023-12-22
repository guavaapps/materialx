import {WidgetContainer} from "./WidgetContainer";
import {BasicMeasure, Measure, Measurer} from "./BasicMeasure";
import {DependencyGraph} from "./DependencyGraph";
import {LinearSystem} from "./LinearSystem";
import {ConstraintAnchor} from "./ConstraintAnchor";
import {SolverVariable} from "./SolverVariable";
import {ConstraintWidget, DimensionBehaviour} from "./ConstraintWidget";
import {Barrier} from "./Barrier";
import {Guideline} from "./Guideline";
import {Direct} from "./Direct";
import {Grouping} from "./Grouping";
import {Arrays, Deref} from "./utils";
import {ChainHead} from "./ChainHead";
import {Optimizer} from "./Optimizer";
import {Chain} from "./Chain";
import {VirtualLayout} from "./VirtualLayout";

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

    mVerticalChainsArray: ChainHead[] = new Array<ChainHead>(4)
    mHorizontalChainsArray: ChainHead[] = new Array<ChainHead>(4)

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
        let optimize = this.optimizeFor(Optimizer.OPTIMIZATION_GRAPH);
        this.addToSolver(system, optimize);
        const count = this.mChildren.length

        let hasBarriers = false;
        for (let i = 0; i < count; i++) {
            let widget = this.mChildren[i]
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
        for (let i = 0; i < count; i++) {
            let widget = this.mChildren[i]
            if (widget.addFirst()) {
                // if (widget instanceof VirtualLayout) {
                //     mWidgetsToAdd.add(widget);
                // } else {
                widget.addToSolver(system, optimize);
                // }
            }
        }

// If we have virtual layouts, we need to add them to the solver in the correct
// order (in case they reference one another)
        while (this.mWidgetsToAdd.size > 0) {
            let numLayouts = this.mWidgetsToAdd.size
            let layout = null;
            for (let widget of this.mWidgetsToAdd) {
                // TODO add VirtualLayout support
                // break until added
                break

                layout = widget as VirtualLayout

                // we'll go through the virtual layouts that references others first, to give
                // them a shot at setting their constraints.
                if (layout.contains(this.mWidgetsToAdd)) {
                    layout.addToSolver(system, optimize);
                    this.mWidgetsToAdd.delete(layout);
                    break;
                }
            }
            if (numLayouts == this.mWidgetsToAdd.size) {
                // looks we didn't find anymore dependency, let's add everything.
                for (let widget of this.mWidgetsToAdd) {
                    widget.addToSolver(system, optimize);
                }
                this.mWidgetsToAdd.clear();
            }
        }

        if (LinearSystem.USE_DEPENDENCY_ORDERING) {
            let widgetsToAdd = new Set<ConstraintWidget>();
            for (let i = 0; i < count; i++) {
                let widget = this.mChildren[i]
                if (!widget.addFirst()) {
                    widgetsToAdd.add(widget);
                }
            }
            let orientation = ConstraintWidgetContainer.VERTICAL;
            if (this.getHorizontalDimensionBehaviour() == DimensionBehaviour.WRAP_CONTENT) {
                orientation = ConstraintWidgetContainer.HORIZONTAL;
            }
            this.addChildrenToSolverByDependency(this, system, widgetsToAdd, orientation, false);
            for (let widget of widgetsToAdd) {
                Optimizer.checkMatchParent(this, system, widget);
                widget.addToSolver(system, optimize);
            }
        } else {

            for (let i = 0; i < count; i++) {
                let widget = this.mChildren[i]
                if (widget instanceof ConstraintWidgetContainer) {
                    let horizontalBehaviour =
                        widget.mListDimensionBehaviors[ConstraintWidgetContainer.DIMENSION_HORIZONTAL];
                    let verticalBehaviour =
                        widget.mListDimensionBehaviors[ConstraintWidgetContainer.DIMENSION_VERTICAL];
                    if (horizontalBehaviour == DimensionBehaviour.WRAP_CONTENT) {
                        widget.setHorizontalDimensionBehaviour(DimensionBehaviour.FIXED);
                    }
                    if (verticalBehaviour == DimensionBehaviour.WRAP_CONTENT) {
                        widget.setVerticalDimensionBehaviour(DimensionBehaviour.FIXED);
                    }
                    widget.addToSolver(system, optimize);
                    if (horizontalBehaviour == DimensionBehaviour.WRAP_CONTENT) {
                        widget.setHorizontalDimensionBehaviour(horizontalBehaviour);
                    }
                    if (verticalBehaviour == DimensionBehaviour.WRAP_CONTENT) {
                        widget.setVerticalDimensionBehaviour(verticalBehaviour);
                    }
                } else {
                    Optimizer.checkMatchParent(this, system, widget);
                    if (!widget.addFirst()) {
                        widget.addToSolver(system, optimize);
                    }
                }
            }
        }

        if (this.mHorizontalChainsSize > 0) {
            Chain.applyChainConstraints(this, system, null, ConstraintWidgetContainer.HORIZONTAL);
        }
        if (this.mVerticalChainsSize > 0) {
            Chain.applyChainConstraints(this, system, null, ConstraintWidgetContainer.VERTICAL);
        }
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
        if (measurer == null) {
            return false;
        }
        if (widget.getVisibility() == ConstraintWidgetContainer.GONE
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

        let horizontalMatchConstraints =
            (measure.horizontalBehavior == DimensionBehaviour.MATCH_CONSTRAINT);
        let verticalMatchConstraints =
            (measure.verticalBehavior == DimensionBehaviour.MATCH_CONSTRAINT);

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
        this.mX = 0;
        this.mY = 0;

        this.mWidthMeasuredTooSmall = false;
        this.mHeightMeasuredTooSmall = false;
        const count = this.mChildren.length

        let preW = Math.max(0, this.getWidth());
        let preH = Math.max(0, this.getHeight());
        let originalVerticalDimensionBehaviour =
            this.mListDimensionBehaviors[ConstraintWidgetContainer.DIMENSION_VERTICAL];let originalHorizontalDimensionBehaviour = this.mListDimensionBehaviors[ConstraintWidgetContainer.DIMENSION_HORIZONTAL];

        let wrap_override = false;

        // Only try the direct optimization in the first layout pass
        if (this.mPass == 0 && Optimizer.enabled(this.mOptimizationLevel, Optimizer.OPTIMIZATION_DIRECT)) {
            Direct.solvingPass(this, this.getMeasurer()!);
            for (let i = 0; i < count; i++) {
                let child = this.mChildren[i]
                if (child.isMeasureRequested()
                    && !(child instanceof Guideline)
                    && !(child instanceof Barrier)
                    && !(child instanceof VirtualLayout)
                    && !child.isInVirtualLayout()) {
                    let widthBehavior = child.getDimensionBehaviour(ConstraintWidgetContainer.HORIZONTAL);
                    let heightBehavior = child.getDimensionBehaviour(ConstraintWidgetContainer.VERTICAL);

                    let skip = widthBehavior == DimensionBehaviour.MATCH_CONSTRAINT
                        && child.mMatchConstraintDefaultWidth != ConstraintWidgetContainer.MATCH_CONSTRAINT_WRAP
                        && heightBehavior == DimensionBehaviour.MATCH_CONSTRAINT
                        && child.mMatchConstraintDefaultHeight != ConstraintWidgetContainer.MATCH_CONSTRAINT_WRAP;
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
                    this.mSystem.minimize();
                }
            } catch (e: any) {
            }
            if (needsSolving) {
                needsSolving = this.updateChildrenFromSolver(this.mSystem, Optimizer.sFlags);
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