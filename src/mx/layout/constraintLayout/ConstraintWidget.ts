import {ConstraintAnchor, ConstraintAnchorType} from "./ConstraintAnchor";
import {LinearSystem} from "./LinearSystem";
import {Cache} from "./Cache";
import {SolverVariable} from "./SolverVariable";
import {AssertionError} from "assert";
import {Arrays, MathUtils} from "./utils";
import {HorizontalWidgetRun} from "./HorizontalWidgetRun";
import {VerticalWidgetRun} from "./VerticalWidgetRun";
import {WidgetRun} from "./WidgetRun";
import {ChainRun} from "./ChainRun";
import {ConstraintWidgetContainer} from "./ConstraintWidgetContainer";
import {VirtualLayout} from "./VirtualLayout";
import {Guideline} from "./Guideline";
import {Barrier} from "./Barrier";
import {Optimizer} from "./Optimizer";

export enum DimensionBehaviour {
    FIXED, WRAP_CONTENT, MATCH_CONSTRAINT, MATCH_PARENT
}

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
            this.constructor(0, 0, x, y, debugName)
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
        throw new AssertionError(anchorType);
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

        if (this.mHorizontalResolution != ConstraintWidget.DIRECT && !this.mResolvedHorizontal) {
            if (!optimize || !(this.mHorizontalRun != null
                && this.mHorizontalRun.start.resolved && this.mHorizontalRun.end.resolved)) {
                let parentMax = this.mParent != null ? system.createObjectVariable(this.mParent.mRight) : null
                let parentMin = this.mParent != null ? system.createObjectVariable(this.mParent.mLeft) : null
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
            } else if (optimize) {
                system.addEqualityConstant(left, this.mHorizontalRun.start.value);
                system.addEqualityConstant(right, this.mHorizontalRun.end.value);
                if (this.mParent != null) {
                    if (horizontalParentWrapContent && this.isTerminalWidget[ConstraintWidget.HORIZONTAL] && !this.isInHorizontalChain()) {
                        let parentMax = system.createObjectVariable(this.mParent.mRight);
                        system.addGreaterThan(parentMax, right, 0, SolverVariable.STRENGTH_FIXED);
                    }
                }
            }
        }

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

        let begin = system.createObjectVariable(beginAnchor);
        let end = system.createObjectVariable(endAnchor);
        let beginTarget = system.createObjectVariable(beginAnchor.getTarget());
        let endTarget = system.createObjectVariable(endAnchor.getTarget());

        let isBeginConnected = beginAnchor.isConnected();
        let isEndConnected = endAnchor.isConnected();
        let isCenterConnected = this.mCenter.isConnected();

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

        // First apply starting direct connections (more solver-friendly)
        if (applyPosition) {
            if (!isBeginConnected && !isEndConnected && !isCenterConnected) {
                system.addEqualityConstant(begin!, beginPosition);
            } else if (isBeginConnected && !isEndConnected) {
                system.addEquality(begin, beginTarget, beginAnchor.getMargin(), SolverVariable.STRENGTH_FIXED);
            }
        }

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

        // Ok, we are dealing with single or centered constraints, let's apply them

        let wrapStrength = SolverVariable.STRENGTH_EQUALITY;

        if (!isBeginConnected && !isEndConnected && !isCenterConnected) {
            // note we already applied the start position before, no need to redo it...
        } else if (isBeginConnected && !isEndConnected) {
            // note we already applied the start position before, no need to redo it...

            // If we are constrained to a barrier, make sure that we are not bypassed in the wrap
            let beginWidget = beginAnchor.mTarget!.mOwner;
            if (parentWrapContent && beginWidget instanceof Barrier) {
                wrapStrength = SolverVariable.STRENGTH_FIXED;
            }
        } else if (!isBeginConnected && isEndConnected) {
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
                    return;
                }
            }

            if (applyRangeCheck && beginTarget == endTarget && beginWidget != parent) {
                // no need to apply range / bounds check if we are centered on the same anchor
                applyRangeCheck = false;
                applyBoundsCheck = false;
            }

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

            if (this.mVisibility == ConstraintWidget.GONE && !endAnchor.hasDependents()) {
                return;
            }

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

            if (parentWrapContent && inBarrier // if we are referenced by a barrier
                && !(beginWidget instanceof Barrier || endWidget instanceof Barrier)
                && !(endWidget == parent)) {
                // ... but not directly constrained by it
                // ... then make sure we can hold our own
                boundsCheckStrength = SolverVariable.STRENGTH_BARRIER;
                rangeCheckStrength = SolverVariable.STRENGTH_BARRIER;
                applyBoundsCheck = true;
            }

            if (applyBoundsCheck) {
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

                if (parentWrapContent) {
                    boundsCheckStrength = Math.min(rangeCheckStrength, boundsCheckStrength);
                    if (useRatio && !oppositeInChain
                        && (beginWidget == parent || endWidget == parent)) {
                        // When using ratio, relax some strength to allow other parts of the system
                        // to take precedence rather than driving it
                        boundsCheckStrength = SolverVariable.STRENGTH_HIGHEST;
                    }
                }
                system.addEquality(begin, beginTarget, beginAnchor.getMargin(), boundsCheckStrength);
                system.addEquality(end, endTarget, -endAnchor.getMargin(), boundsCheckStrength);
            }

            if (parentWrapContent) {
                let margin = 0;
                if (parentMin == beginTarget) {
                    margin = beginAnchor.getMargin();
                }
                if (beginTarget != parentMin) { // already done otherwise
                    system.addGreaterThan(begin, parentMin, margin, wrapStrength);
                }
            }

            if (parentWrapContent && variableSize && minDimension == 0 && matchMinDimension == 0) {
                if (variableSize && matchConstraintDefault == ConstraintWidget.MATCH_CONSTRAINT_RATIO) {
                    system.addGreaterThan(end, begin, 0, SolverVariable.STRENGTH_FIXED);
                } else {
                    system.addGreaterThan(end, begin, 0, wrapStrength);
                }
            }
        }

        if (parentWrapContent && isTerminal) {
            let margin = 0;
            if (endAnchor.mTarget != null) {
                margin = endAnchor.getMargin();
            }
            if (endTarget != parentMax) { // if not already applied
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

        this.mMaxDimension = Arrays.copy(src.mMaxDimension, src.mMaxDimension.length);
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
        this.mListDimensionBehaviors = Arrays.copy(this.mListDimensionBehaviors, 2);
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