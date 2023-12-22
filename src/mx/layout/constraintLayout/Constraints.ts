import {ConstraintWidget, DimensionBehaviour} from "./ConstraintWidget";
import {ConstraintWidgetContainer} from "./ConstraintWidgetContainer"
import {Optimizer} from "./Optimizer"
import {BasicMeasure, Measure} from "./BasicMeasure"
import {Measurer as BasicMeasurer} from "./BasicMeasure"
import {lazy, ReactElement} from "react";
import {Guideline} from "./Guideline";
import {ConstraintAnchor, ConstraintAnchorType} from "./ConstraintAnchor"
import {AttrMap} from "../../styles/style";
import {ConstraintLayout} from "./constraint_layout";
import {Layout} from "../layout";

export class LayoutParams {
    static readonly MATCH_PARENT = -1
    static readonly WRAP_CONTENT = -2


    public static readonly MATCH_CONSTRAINT = 0;


    public static readonly PARENT_ID = 0;


    public static readonly UNSET = -1;


    public static readonly GONE_UNSET = Number.MIN_SAFE_INTEGER;


    public static readonly HORIZONTAL = ConstraintWidget.HORIZONTAL;


    public static readonly VERTICAL = ConstraintWidget.VERTICAL;


    public static readonly LEFT = 1;


    public static readonly RIGHT = 2;


    public static readonly TOP = 3;


    public static readonly BOTTOM = 4;


    public static readonly BASELINE = 5;


    public static readonly START = 6;


    public static readonly END = 7;


    public static readonly CIRCLE = 8;


    public static readonly MATCH_CONSTRAINT_WRAP = ConstraintWidget.MATCH_CONSTRAINT_WRAP;


    public static readonly MATCH_CONSTRAINT_SPREAD = ConstraintWidget.MATCH_CONSTRAINT_SPREAD;


    public static readonly MATCH_CONSTRAINT_PERCENT =
        ConstraintWidget.MATCH_CONSTRAINT_PERCENT;


    public static readonly CHAIN_SPREAD = ConstraintWidget.CHAIN_SPREAD;


    public static readonly CHAIN_SPREAD_INSIDE = ConstraintWidget.CHAIN_SPREAD_INSIDE;


    public static readonly CHAIN_PACKED = ConstraintWidget.CHAIN_PACKED;


    public guideBegin = LayoutParams.UNSET;


    public guideEnd = LayoutParams.UNSET;


    public guidePercent = LayoutParams.UNSET;


    public guidelineUseRtl = true;


    public leftToLeft = LayoutParams.UNSET;


    public leftToRight = LayoutParams.UNSET;


    public rightToLeft = LayoutParams.UNSET;


    public rightToRight = LayoutParams.UNSET;


    public topToTop = LayoutParams.UNSET;


    public topToBottom = LayoutParams.UNSET;


    public bottomToTop = LayoutParams.UNSET;


    public bottomToBottom = LayoutParams.UNSET;


    public baselineToBaseline = LayoutParams.UNSET;


    public baselineToTop = LayoutParams.UNSET;


    public baselineToBottom = LayoutParams.UNSET;


    public circleConstraint = LayoutParams.UNSET;


    public circleRadius = 0;


    public circleAngle = 0;


    public startToEnd = LayoutParams.UNSET;


    public startToStart = LayoutParams.UNSET;


    public endToStart = LayoutParams.UNSET;


    public endToEnd = LayoutParams.UNSET;


    public goneLeftMargin = LayoutParams.GONE_UNSET;


    public goneTopMargin = LayoutParams.GONE_UNSET;


    public goneRightMargin = LayoutParams.GONE_UNSET;


    public goneBottomMargin = LayoutParams.GONE_UNSET;


    public goneStartMargin = LayoutParams.GONE_UNSET;


    public goneEndMargin = LayoutParams.GONE_UNSET;


    public goneBaselineMargin = LayoutParams.GONE_UNSET;


    public baselineMargin = 0;

    mWidthSet = true;
    mHeightSet = true;


    public horizontalBias = 0.5;


    public verticalBias = 0.5;


    public dimensionRatio: string | null = null;


    mDimensionRatioValue = 0;


    mDimensionRatioSide = LayoutParams.VERTICAL;


    public horizontalWeight = LayoutParams.UNSET;


    public verticalWeight = LayoutParams.UNSET;


    public horizontalChainStyle = LayoutParams.CHAIN_SPREAD;


    public verticalChainStyle = LayoutParams.CHAIN_SPREAD;


    public matchConstraintDefaultWidth = LayoutParams.MATCH_CONSTRAINT_SPREAD;


    public matchConstraintDefaultHeight = LayoutParams.MATCH_CONSTRAINT_SPREAD;


    public matchConstraintMinWidth = 0;


    public matchConstraintMinHeight = 0;


    public matchConstraintMaxWidth = 0;


    public matchConstraintMaxHeight = 0;


    public matchConstraintPercentWidth = 1;


    public matchConstraintPercentHeight = 1;


    public editorAbsoluteX = LayoutParams.UNSET;


    public editorAbsoluteY = LayoutParams.UNSET;

    public orientation = LayoutParams.UNSET;


    public constrainedWidth = false;


    public constrainedHeight = false;


    public constraintTag: string | null = null;

    public static readonly WRAP_BEHAVIOR_INCLUDED = ConstraintWidget.WRAP_BEHAVIOR_INCLUDED;
    public static readonly WRAP_BEHAVIOR_HORIZONTAL_ONLY = ConstraintWidget.WRAP_BEHAVIOR_HORIZONTAL_ONLY;
    public static readonly WRAP_BEHAVIOR_VERTICAL_ONLY = ConstraintWidget.WRAP_BEHAVIOR_VERTICAL_ONLY;
    public static readonly WRAP_BEHAVIOR_SKIPPED = ConstraintWidget.WRAP_BEHAVIOR_SKIPPED;


    public wrapBehaviorInParent = LayoutParams.WRAP_BEHAVIOR_INCLUDED;


    mHorizontalDimensionFixed = true;
    mVerticalDimensionFixed = true;

    mNeedsBaseline = false;
    mIsGuideline = false;
    mIsHelper = false;
    mIsInPlaceholder = false;
    mIsVirtualGroup = false;

    mResolvedLeftToLeft = LayoutParams.UNSET;
    mResolvedLeftToRight = LayoutParams.UNSET;
    mResolvedRightToLeft = LayoutParams.UNSET;
    mResolvedRightToRight = LayoutParams.UNSET;
    mResolveGoneLeftMargin = LayoutParams.GONE_UNSET;
    mResolveGoneRightMargin = LayoutParams.GONE_UNSET;
    mResolvedHorizontalBias = 0.5;

    mResolvedGuideBegin: number = 0
    mResolvedGuideEnd: number = 0
    mResolvedGuidePercent: number = 0

    mWidget = new ConstraintWidget();

    width: number = 0
    height = 0

    leftMargin = 0
    topMargin = 0
    rightMargin = 0
    bottomMargin = 0


    public getConstraintWidget() {
        return this.mWidget;
    }


    public setWidgetDebugName(text: string) {
        this.mWidget.setDebugName(text);
    }


    public reset() {
        if (this.mWidget != null) {
            this.mWidget.reset();
        }
    }

    public helped = false;

    public constructor(params: ConstraintLayout.LayoutParams) {
        let source = params

        this.width = source.width as number
        this.height = source.height as number
        this.leftMargin = source.marginLeft as number
        this.rightMargin = source.marginRight as number
        this.topMargin = source.marginTop as number
        this.bottomMargin = source.marginBottom as number

        // this.guideBegin = source.guideBegin;
        // this.guideEnd = source.guideEnd;
        // this.guidePercent = source.guidePercent;
        // this.guidelineUseRtl = source.guidelineUseRtl;
        this.leftToLeft = source.leftToLeft;
        this.leftToRight = source.leftToRight;
        this.rightToLeft = source.rightToLeft;
        this.rightToRight = source.rightToRight;
        this.topToTop = source.topToTop;
        this.topToBottom = source.topToBottom;
        this.bottomToTop = source.bottomToTop;
        this.bottomToBottom = source.bottomToBottom;
        // this.baselineToBaseline = source.baselineToBaseline;
        // this.baselineToTop = source.baselineToTop;
        // this.baselineToBottom = source.baselineToBottom;
        // this.circleConstraint = source.circleConstraint;
        // this.circleRadius = source.circleRadius;
        // this.circleAngle = source.circleAngle;
        // this.startToEnd = source.startToEnd;
        // this.startToStart = source.startToStart;
        // this.endToStart = source.endToStart;
        // this.endToEnd = source.endToEnd;
        // this.goneLeftMargin = source.goneLeftMargin;
        // this.goneTopMargin = source.goneTopMargin;
        // this.goneRightMargin = source.goneRightMargin;
        // this.goneBottomMargin = source.goneBottomMargin;
        // this.goneStartMargin = source.goneStartMargin;
        // this.goneEndMargin = source.goneEndMargin;
        // this.goneBaselineMargin = source.goneBaselineMargin;
        // this.baselineMargin = source.baselineMargin;
        // this.horizontalBias = source.horizontalBias;
        // this.verticalBias = source.verticalBias;
        // this.dimensionRatio = source.dimensionRatio;
        // this.mDimensionRatioValue = source.mDimensionRatioValue;
        // this.mDimensionRatioSide = source.mDimensionRatioSide;
        // this.horizontalWeight = source.horizontalWeight;
        // this.verticalWeight = source.verticalWeight;
        // this.horizontalChainStyle = source.horizontalChainStyle;
        // this.verticalChainStyle = source.verticalChainStyle;
        // this.constrainedWidth = source.constrainedWidth;
        // this.constrainedHeight = source.constrainedHeight;
        // this.matchConstraintDefaultWidth = source.matchConstraintDefaultWidth;
        // this.matchConstraintDefaultHeight = source.matchConstraintDefaultHeight;
        // this.matchConstraintMinWidth = source.matchConstraintMinWidth;
        // this.matchConstraintMaxWidth = source.matchConstraintMaxWidth;
        // this.matchConstraintMinHeight = source.matchConstraintMinHeight;
        // this.matchConstraintMaxHeight = source.matchConstraintMaxHeight;
        // this.matchConstraintPercentWidth = source.matchConstraintPercentWidth;
        // this.matchConstraintPercentHeight = source.matchConstraintPercentHeight;
        // this.editorAbsoluteX = source.editorAbsoluteX;
        // this.editorAbsoluteY = source.editorAbsoluteY;
        // this.orientation = source.orientation;
        // this.mHorizontalDimensionFixed = source.mHorizontalDimensionFixed;
        // this.mVerticalDimensionFixed = source.mVerticalDimensionFixed;
        // this.mNeedsBaseline = source.mNeedsBaseline;
        // this.mIsGuideline = source.mIsGuideline;
        // this.mResolvedLeftToLeft = source.mResolvedLeftToLeft;
        // this.mResolvedLeftToRight = source.mResolvedLeftToRight;
        // this.mResolvedRightToLeft = source.mResolvedRightToLeft;
        // this.mResolvedRightToRight = source.mResolvedRightToRight;
        // this.mResolveGoneLeftMargin = source.mResolveGoneLeftMargin;
        // this.mResolveGoneRightMargin = source.mResolveGoneRightMargin;
        // this.mResolvedHorizontalBias = source.mResolvedHorizontalBias;
        // this.constraintTag = source.constraintTag;
        // this.wrapBehaviorInParent = source.wrapBehaviorInParent;
        // this.mWidget = source.mWidget;
        // this.mWidthSet = source.mWidthSet;
        // this.mHeightSet = source.mHeightSet;


        // let source = params as LayoutParams
        //
        // this.guideBegin = source.guideBegin;
        // this.guideEnd = source.guideEnd;
        // this.guidePercent = source.guidePercent;
        // this.guidelineUseRtl = source.guidelineUseRtl;
        // this.leftToLeft = source.leftToLeft;
        // this.leftToRight = source.leftToRight;
        // this.rightToLeft = source.rightToLeft;
        // this.rightToRight = source.rightToRight;
        // this.topToTop = source.topToTop;
        // this.topToBottom = source.topToBottom;
        // this.bottomToTop = source.bottomToTop;
        // this.bottomToBottom = source.bottomToBottom;
        // this.baselineToBaseline = source.baselineToBaseline;
        // this.baselineToTop = source.baselineToTop;
        // this.baselineToBottom = source.baselineToBottom;
        // this.circleConstraint = source.circleConstraint;
        // this.circleRadius = source.circleRadius;
        // this.circleAngle = source.circleAngle;
        // this.startToEnd = source.startToEnd;
        // this.startToStart = source.startToStart;
        // this.endToStart = source.endToStart;
        // this.endToEnd = source.endToEnd;
        // this.goneLeftMargin = source.goneLeftMargin;
        // this.goneTopMargin = source.goneTopMargin;
        // this.goneRightMargin = source.goneRightMargin;
        // this.goneBottomMargin = source.goneBottomMargin;
        // this.goneStartMargin = source.goneStartMargin;
        // this.goneEndMargin = source.goneEndMargin;
        // this.goneBaselineMargin = source.goneBaselineMargin;
        // this.baselineMargin = source.baselineMargin;
        // this.horizontalBias = source.horizontalBias;
        // this.verticalBias = source.verticalBias;
        // this.dimensionRatio = source.dimensionRatio;
        // this.mDimensionRatioValue = source.mDimensionRatioValue;
        // this.mDimensionRatioSide = source.mDimensionRatioSide;
        // this.horizontalWeight = source.horizontalWeight;
        // this.verticalWeight = source.verticalWeight;
        // this.horizontalChainStyle = source.horizontalChainStyle;
        // this.verticalChainStyle = source.verticalChainStyle;
        // this.constrainedWidth = source.constrainedWidth;
        // this.constrainedHeight = source.constrainedHeight;
        // this.matchConstraintDefaultWidth = source.matchConstraintDefaultWidth;
        // this.matchConstraintDefaultHeight = source.matchConstraintDefaultHeight;
        // this.matchConstraintMinWidth = source.matchConstraintMinWidth;
        // this.matchConstraintMaxWidth = source.matchConstraintMaxWidth;
        // this.matchConstraintMinHeight = source.matchConstraintMinHeight;
        // this.matchConstraintMaxHeight = source.matchConstraintMaxHeight;
        // this.matchConstraintPercentWidth = source.matchConstraintPercentWidth;
        // this.matchConstraintPercentHeight = source.matchConstraintPercentHeight;
        // this.editorAbsoluteX = source.editorAbsoluteX;
        // this.editorAbsoluteY = source.editorAbsoluteY;
        // this.orientation = source.orientation;
        // this.mHorizontalDimensionFixed = source.mHorizontalDimensionFixed;
        // this.mVerticalDimensionFixed = source.mVerticalDimensionFixed;
        // this.mNeedsBaseline = source.mNeedsBaseline;
        // this.mIsGuideline = source.mIsGuideline;
        // this.mResolvedLeftToLeft = source.mResolvedLeftToLeft;
        // this.mResolvedLeftToRight = source.mResolvedLeftToRight;
        // this.mResolvedRightToLeft = source.mResolvedRightToLeft;
        // this.mResolvedRightToRight = source.mResolvedRightToRight;
        // this.mResolveGoneLeftMargin = source.mResolveGoneLeftMargin;
        // this.mResolveGoneRightMargin = source.mResolveGoneRightMargin;
        // this.mResolvedHorizontalBias = source.mResolvedHorizontalBias;
        // this.constraintTag = source.constraintTag;
        // this.wrapBehaviorInParent = source.wrapBehaviorInParent;
        // this.mWidget = source.mWidget;
        // this.mWidthSet = source.mWidthSet;
        // this.mHeightSet = source.mHeightSet;
    }
}

const UNSET = LayoutParams.UNSET
const MATCH_PARENT = LayoutParams.MATCH_PARENT
const WRAP_CONTENT = LayoutParams.WRAP_CONTENT

export class ConstraintSystem {
    private id: number
    private layoutParams: ConstraintLayout.LayoutParams
    private children = new Array<ConstraintWidget>()
    private idMappedWidgets = new Map<number, ConstraintWidget>()
    private idMappedLayoutParams = new Map<number, LayoutParams>()

    private mLastMeasureWidth = 0
    private mLastMeasureHeight = 0


    mMeasurer: Measurer// = new Measurer(this)
    mLayoutWidget: ConstraintWidgetContainer = new ConstraintWidgetContainer()

    constructor(id: number, params: ConstraintLayout.LayoutParams, idMappedParams: Map<number, ConstraintLayout.LayoutParams>) {
        this.id = id
        this.layoutParams = params

        const ids = Array.from(idMappedParams.keys())

        const widgetToLayoutParams = new Map<ConstraintWidget, LayoutParams>()

        for (let i = 0; i < idMappedParams.size; i++) {
            const id = ids[i]
            const params = idMappedParams.get(id)!
            const lp = new LayoutParams(params)

            this.idMappedLayoutParams.set(id, lp)
            this.idMappedWidgets.set(id, lp.mWidget)
            widgetToLayoutParams.set(lp.mWidget, lp)
        }

        this.mMeasurer = new Measurer(this, this.layoutParams, widgetToLayoutParams)
    }

    applyConstraints() {
        for (let i = 0; i < this.idMappedWidgets.size; i++) {
            const widget = this.children[i]

            const layoutParams = this.getLayoutParams(widget)

            if (layoutParams == null) {
                continue
            }

            if (layoutParams.mIsGuideline) {
                let guideline = widget as Guideline
                let resolvedGuideBegin = layoutParams.mResolvedGuideBegin;
                let resolvedGuideEnd = layoutParams.mResolvedGuideEnd;
                let resolvedGuidePercent = layoutParams.mResolvedGuidePercent;

                if (resolvedGuidePercent != LayoutParams.UNSET) {
                    guideline.setGuidePercent(resolvedGuidePercent);
                } else if (resolvedGuideBegin != LayoutParams.UNSET) {
                    guideline.setGuideBegin(resolvedGuideBegin);
                } else if (resolvedGuideEnd != LayoutParams.UNSET) {
                    guideline.setGuideEnd(resolvedGuideEnd);
                }
            } else {
                let resolvedLeftToLeft = layoutParams.mResolvedLeftToLeft;
                let resolvedLeftToRight = layoutParams.mResolvedLeftToRight;
                let resolvedRightToLeft = layoutParams.mResolvedRightToLeft;
                let resolvedRightToRight = layoutParams.mResolvedRightToRight;
                let resolveGoneLeftMargin = layoutParams.mResolveGoneLeftMargin;
                let resolveGoneRightMargin = layoutParams.mResolveGoneRightMargin;
                let resolvedHorizontalBias = layoutParams.mResolvedHorizontalBias;

                if (layoutParams.circleConstraint != LayoutParams.UNSET) {
                    let target = this.idMappedWidgets.get(layoutParams.circleConstraint)
                    if (target != null) {
                        widget.connectCircularConstraint(target, layoutParams.circleAngle, layoutParams.circleRadius)
                    }
                } else {


                    if (resolvedLeftToLeft != LayoutParams.UNSET) {
                        let target = this.idMappedWidgets.get(resolvedLeftToLeft)
                        if (target != null) {
                            widget.immediateConnect(ConstraintAnchorType.LEFT, target,
                                ConstraintAnchorType.LEFT, layoutParams.leftMargin,
                                resolveGoneLeftMargin);
                        }
                    } else if (resolvedLeftToRight != UNSET) {
                        let target = this.idMappedWidgets.get(resolvedLeftToRight);
                        if (target != null) {
                            widget.immediateConnect(ConstraintAnchorType.LEFT, target,
                                ConstraintAnchorType.RIGHT, layoutParams.leftMargin,
                                resolveGoneLeftMargin);
                        }
                    }


                    if (resolvedRightToLeft != LayoutParams.UNSET) {
                        let target = this.idMappedWidgets.get(resolvedRightToLeft)
                        if (target != null) {
                            widget.immediateConnect(ConstraintAnchorType.RIGHT, target,
                                ConstraintAnchorType.LEFT, layoutParams.rightMargin,
                                resolveGoneRightMargin);
                        }
                    } else if (resolvedLeftToRight != UNSET) {
                        let target = this.idMappedWidgets.get(resolvedRightToRight);
                        if (target != null) {
                            widget.immediateConnect(ConstraintAnchorType.LEFT, target,
                                ConstraintAnchorType.RIGHT, layoutParams.rightMargin,
                                resolveGoneRightMargin);
                        }
                    }


                    if (layoutParams.topToTop != UNSET) {
                        let target = this.idMappedWidgets.get(layoutParams.topToTop);
                        if (target != null) {
                            widget.immediateConnect(ConstraintAnchorType.TOP, target,
                                ConstraintAnchorType.TOP, layoutParams.topMargin,
                                layoutParams.goneTopMargin);
                        }
                    } else if (layoutParams.topToBottom != UNSET) {
                        let target = this.idMappedWidgets.get(layoutParams.topToBottom);
                        if (target != null) {
                            widget.immediateConnect(ConstraintAnchorType.TOP, target,
                                ConstraintAnchorType.BOTTOM, layoutParams.topMargin,
                                layoutParams.goneTopMargin);
                        }
                    }


                    if (layoutParams.bottomToTop != UNSET) {
                        let target = this.idMappedWidgets.get(layoutParams.bottomToTop);
                        if (target != null) {
                            widget.immediateConnect(ConstraintAnchorType.BOTTOM, target,
                                ConstraintAnchorType.TOP, layoutParams.bottomMargin,
                                layoutParams.goneBottomMargin);
                        }
                    } else if (layoutParams.bottomToBottom != UNSET) {
                        let target = this.idMappedWidgets.get(layoutParams.bottomToBottom);
                        if (target != null) {
                            widget.immediateConnect(ConstraintAnchorType.BOTTOM, target,
                                ConstraintAnchorType.BOTTOM, layoutParams.bottomMargin,
                                layoutParams.goneBottomMargin);
                        }
                    }


                    if (resolvedHorizontalBias >= 0) {
                        widget.setHorizontalBiasPercent(resolvedHorizontalBias);
                    }
                    if (layoutParams.verticalBias >= 0) {
                        widget.setVerticalBiasPercent(layoutParams.verticalBias);
                    }

                    if (!layoutParams.mHorizontalDimensionFixed) {
                        if (layoutParams.width == MATCH_PARENT) {
                            if (layoutParams.constrainedWidth) {
                                widget.setHorizontalDimensionBehaviour(DimensionBehaviour.MATCH_CONSTRAINT);
                            } else {
                                widget.setHorizontalDimensionBehaviour(DimensionBehaviour.MATCH_PARENT);
                            }
                            widget.getAnchor(ConstraintAnchorType.LEFT)!.mMargin = layoutParams.leftMargin;
                            widget.getAnchor(ConstraintAnchorType.RIGHT)!.mMargin = layoutParams.rightMargin;
                        } else {
                            widget.setHorizontalDimensionBehaviour(DimensionBehaviour.MATCH_CONSTRAINT);
                            widget.setWidth(0);
                        }
                    } else {
                        widget.setHorizontalDimensionBehaviour(DimensionBehaviour.FIXED);
                        widget.setWidth(layoutParams.width);
                        if (layoutParams.width == WRAP_CONTENT) {
                            widget.setHorizontalDimensionBehaviour(DimensionBehaviour.WRAP_CONTENT);
                        }
                    }
                    if (!layoutParams.mVerticalDimensionFixed) {
                        if (layoutParams.height == MATCH_PARENT) {
                            if (layoutParams.constrainedHeight) {
                                widget.setVerticalDimensionBehaviour(DimensionBehaviour.MATCH_CONSTRAINT);
                            } else {
                                widget.setVerticalDimensionBehaviour(DimensionBehaviour.MATCH_PARENT);
                            }
                            widget.getAnchor(ConstraintAnchorType.TOP)!.mMargin = layoutParams.topMargin;
                            widget.getAnchor(ConstraintAnchorType.BOTTOM)!.mMargin = layoutParams.bottomMargin;
                        } else {
                            widget.setVerticalDimensionBehaviour(DimensionBehaviour.MATCH_CONSTRAINT);
                            widget.setHeight(0);
                        }
                    } else {
                        widget.setVerticalDimensionBehaviour(DimensionBehaviour.FIXED);
                        widget.setHeight(layoutParams.height);
                        if (layoutParams.height == WRAP_CONTENT) {
                            widget.setVerticalDimensionBehaviour(DimensionBehaviour.WRAP_CONTENT);
                        }
                    }

                    widget.setDimensionRatioString(layoutParams.dimensionRatio!);
                    widget.setHorizontalWeight(layoutParams.horizontalWeight);
                    widget.setVerticalWeight(layoutParams.verticalWeight);
                    widget.setHorizontalChainStyle(layoutParams.horizontalChainStyle);
                    widget.setVerticalChainStyle(layoutParams.verticalChainStyle);
                    widget.setWrapBehaviorInParent(layoutParams.wrapBehaviorInParent);
                    widget.setHorizontalMatchStyle(layoutParams.matchConstraintDefaultWidth,
                        layoutParams.matchConstraintMinWidth, layoutParams.matchConstraintMaxWidth,
                        layoutParams.matchConstraintPercentWidth);
                    widget.setVerticalMatchStyle(layoutParams.matchConstraintDefaultHeight,
                        layoutParams.matchConstraintMinHeight, layoutParams.matchConstraintMaxHeight,
                        layoutParams.matchConstraintPercentHeight);
                }
            }
        }
    }

    measure() {
        let widthMeasureSpec: number = 100
        let heightMeasureSpec: number = 100

        this.mLayoutWidget.setRtl(this.isRtl())

        this.resolveSystem(widthMeasureSpec, heightMeasureSpec)
        // this.resolveMeasuredDimension(widthMeasureSpec, heightMeasureSpec,
        //     this.mLayoutWidget.getWidth(), this.mLayoutWidget.getHeight(),
        //     this.mLayoutWidget.isWidthMeasuredTooSmall(), this.mLayoutWidget.isHeightMeasuredTooSmall())
    }

    resolveSystem(widthMeasureSpec: number, heightMeasureSpec: number) {
        let widthMode = MeasureSpec.getMode(widthMeasureSpec);
        let widthSize = MeasureSpec.getSize(widthMeasureSpec);
        let heightMode = MeasureSpec.getMode(heightMeasureSpec);
        let heightSize = MeasureSpec.getSize(heightMeasureSpec);

        let paddingY = Math.max(0, this.layoutParams.paddingTop as number);
        let paddingBottom = Math.max(0, this.layoutParams.paddingBottom as number);
        let paddingHeight = paddingY + paddingBottom;
        let paddingWidth = this.getPaddingWidth();
        let paddingX;
        this.mMeasurer.captureLayoutInfo(widthMeasureSpec, heightMeasureSpec, paddingY, paddingBottom,
            paddingWidth, paddingHeight);

        let paddingStart = Math.max(0, this.layoutParams.paddingStart);
        let paddingEnd = Math.max(0, this.layoutParams.paddingEnd);
        if (paddingStart > 0 || paddingEnd > 0) {
            if (this.isRtl()) {
                paddingX = paddingEnd;
            } else {
                paddingX = paddingStart;
            }
        } else {
            paddingX = Math.max(0, this.layoutParams.paddingLeft)
        }

        widthSize -= paddingWidth
        heightSize -= paddingHeight

        this.setSelfDimensionBehaviour(this.mLayoutWidget, widthMode, widthSize, heightMode, heightSize)

        this.mLayoutWidget.measure(Optimizer.OPTIMIZATION_STANDARD, widthMode, widthSize, heightMode, heightSize,
            this.mLastMeasureWidth, this.mLastMeasureHeight, paddingX, paddingY)
    }

    // protected resolveMeasuredDimension(widthMeasureSpec: number, heightMeasureSpec: number, measuredWidth: number, measuredHeight: number,
    //                                    isWidthMeasuredTooSmall: boolean, isHeightMeasuredTooSmall: boolean) {
    //     let childState = 0;
    //     let heightPadding = this.mMeasurer.mPaddingHeight;
    //     let widthPadding = this.mMeasurer.mPaddingWidth;
    //
    //     let androidLayoutWidth = measuredWidth + widthPadding;
    //     let androidLayoutHeight = measuredHeight + heightPadding;
    //
    //     let resolvedWidthSize = this.resolveSizeAndState(androidLayoutWidth,
    //         widthMeasureSpec, childState);
    //     let resolvedHeightSize = this.resolveSizeAndState(androidLayoutHeight, heightMeasureSpec,
    //         childState << MEASURED_HEIGHT_STATE_SHIFT);
    //     resolvedWidthSize &= MEASURED_SIZE_MASK;
    //     resolvedHeightSize &= MEASURED_SIZE_MASK;
    //     resolvedWidthSize = Math.min(this.layoutParams.maxWidth, resolvedWidthSize);
    //     resolvedHeightSize = Math.min(this.layoutParams.maxHeight, resolvedHeightSize);
    //     if (isWidthMeasuredTooSmall) {
    //         resolvedWidthSize ||= MEASURED_STATE_TOO_SMALL;
    //     }
    //     if (isHeightMeasuredTooSmall) {
    //         resolvedHeightSize ||= MEASURED_STATE_TOO_SMALL;
    //     }
    //     this.setMeasuredDimension(resolvedWidthSize, resolvedHeightSize);
    //     this.mLastMeasureWidth = resolvedWidthSize;
    //     this.mLastMeasureHeight = resolvedHeightSize;
    // }

    // resolveSizeAndState (size: number, measureSpec: number, childMeasuredState: number) {
    //     const specMode = MeasureSpec.getMode(measureSpec);
    //     const specSize = MeasureSpec.getSize(measureSpec);
    //     let result;
    //     switch (specMode) {
    //         case MeasureSpec.AT_MOST:
    //             if (specSize < size) {
    //                 result = specSize | MEASURED_STATE_TOO_SMALL;
    //             } else {
    //                 result = size;
    //             }
    //             break;
    //         case MeasureSpec.EXACTLY:
    //             result = specSize;
    //             break;
    //         case MeasureSpec.UNSPECIFIED:
    //         default:
    //             result = size;
    //     }
    //     return result | (childMeasuredState & MEASURED_STATE_MASK);
    // }

    setSelfDimensionBehaviour(layout: ConstraintWidgetContainer,
                              widthMode: number, widthSize: number,
                              heightMode: number, heightSize: number) {

        let heightPadding = this.mMeasurer.mPaddingHeight;
        let widthPadding = this.mMeasurer.mPaddingWidth;

        let widthBehaviour = DimensionBehaviour.FIXED;
        let heightBehaviour = DimensionBehaviour.FIXED;

        let desiredWidth = 0;
        let desiredHeight = 0;
        const childCount = this.getChildCount();

        switch (widthMode) {
            case MeasureSpec.AT_MOST: {
                widthBehaviour = DimensionBehaviour.WRAP_CONTENT;
                desiredWidth = widthSize;
                if (childCount == 0) {
                    desiredWidth = Math.max(0, this.layoutParams.minWidth);
                }
            }
                break;
            case MeasureSpec.UNSPECIFIED: {
                widthBehaviour = DimensionBehaviour.WRAP_CONTENT;
                if (childCount == 0) {
                    desiredWidth = Math.max(0, this.layoutParams.minWidth);
                }
            }
                break;
            case MeasureSpec.EXACTLY: {
                desiredWidth = Math.min(this.layoutParams.maxWidth - widthPadding, widthSize);
            }
        }

        switch (heightMode) {
            case MeasureSpec.AT_MOST: {
                heightBehaviour = DimensionBehaviour.WRAP_CONTENT;
                desiredHeight = heightSize;
                if (childCount == 0) {
                    desiredHeight = Math.max(0, this.layoutParams.minHeight);
                }
            }
                break;
            case MeasureSpec.UNSPECIFIED: {
                heightBehaviour = DimensionBehaviour.WRAP_CONTENT;
                if (childCount == 0) {
                    desiredHeight = Math.max(0, this.layoutParams.minHeight);
                }
            }
                break;
            case MeasureSpec.EXACTLY: {
                desiredHeight = Math.min(this.layoutParams.maxHeight - heightPadding, heightSize);
            }
        }

        if (desiredWidth != layout.getWidth() || desiredHeight != layout.getHeight()) {
            layout.invalidateMeasures();
        }
        layout.setX(0);
        layout.setY(0);
        layout.setMaxWidth(this.layoutParams.maxWidth - widthPadding);
        layout.setMaxHeight(this.layoutParams.maxHeight - heightPadding);
        layout.setMinWidth(0);
        layout.setMinHeight(0);
        layout.setHorizontalDimensionBehaviour(widthBehaviour);
        layout.setWidth(desiredWidth);
        layout.setVerticalDimensionBehaviour(heightBehaviour);
        layout.setHeight(desiredHeight);
        layout.setMinWidth(this.layoutParams.minWidth - widthPadding);
        layout.setMinHeight(this.layoutParams.minHeight - heightPadding);
    }

    isRtl() {
        return this.layoutParams.isRtl
    }

    getChildCount() {
        return this.idMappedWidgets.size
    }

    getPaddingWidth() {
        let widthPadding = Math.max(0, this.layoutParams.paddingLeft) + Math.max(0, this.layoutParams.paddingRight);
        let rtlPadding = 0;

        rtlPadding = Math.max(0, this.layoutParams.paddingStart) + Math.max(0, this.layoutParams.paddingEnd);
        if (rtlPadding > 0) {
            widthPadding = rtlPadding;
        }
        return widthPadding;
    }

    getWidget(id: number) {
        if (id == this.id) {
            return this.mLayoutWidget
        }

        return this.idMappedWidgets.get(id)!
    }

    getLayoutParams(child: ConstraintWidget) {
        const id = Array.from(this.idMappedWidgets.keys()).find(it => this.idMappedWidgets.get(it) == child)

        if (id) {
            const params = this.idMappedLayoutParams.get(id)!

            return params
        }

        return null
    }
}

export class MeasureSpec {
    static readonly MODE_SHIFT = 30;
    private static readonly MODE_MASK = 0x3 << MeasureSpec.MODE_SHIFT

    static UNSPECIFIED = 0 << MeasureSpec.MODE_SHIFT
    static EXACTLY = 1 << MeasureSpec.MODE_SHIFT
    static AT_MOST = 2 << MeasureSpec.MODE_SHIFT

    public static makeMeasureSpec(size: number, mode: number) {
        return (size & ~MeasureSpec.MODE_MASK) | (mode & MeasureSpec.MODE_MASK);
    }

    static getChildMeasureSpec(spec: number, padding: number, childDimension: number) {
        let specMode = MeasureSpec.getMode(spec);
        let specSize = MeasureSpec.getSize(spec);
        let size = Math.max(0, specSize - padding);

        let resultSize = 0;
        let resultMode = 0;

        switch (specMode) {
            // Parent has imposed an exact size on us
            case MeasureSpec.EXACTLY:
                if (childDimension >= 0) {
                    resultSize = childDimension;
                    resultMode = MeasureSpec.EXACTLY;
                } else if (childDimension == LayoutParams.MATCH_PARENT) {
                    // Child wants to be our size. So be it.
                    resultSize = size;
                    resultMode = MeasureSpec.EXACTLY;
                } else if (childDimension == LayoutParams.WRAP_CONTENT) {
                    // Child wants to determine its own size. It can't be
                    // bigger than us.
                    resultSize = size;
                    resultMode = MeasureSpec.AT_MOST;
                }
                break;
            // Parent has imposed a maximum size on us
            case MeasureSpec.AT_MOST:
                if (childDimension >= 0) {
                    // Child wants a specific size... so be it
                    resultSize = childDimension;
                    resultMode = MeasureSpec.EXACTLY;
                } else if (childDimension == LayoutParams.MATCH_PARENT) {
                    // Child wants to be our size, but our size is not fixed.
                    // Constrain child to not be bigger than us.
                    resultSize = size;
                    resultMode = MeasureSpec.AT_MOST;
                } else if (childDimension == LayoutParams.WRAP_CONTENT) {
                    // Child wants to determine its own size. It can't be
                    // bigger than us.
                    resultSize = size;
                    resultMode = MeasureSpec.AT_MOST;
                }
                break;
            // Parent asked to see how big we want to be
            case MeasureSpec.UNSPECIFIED:
                if (childDimension >= 0) {
                    // Child wants a specific size... let them have it
                    resultSize = childDimension;
                    resultMode = MeasureSpec.EXACTLY;
                } else if (childDimension == LayoutParams.MATCH_PARENT) {
                    // Child wants to be our size... find out how big it should
                    // be
                    resultSize = size //View.sUseZeroUnspecifiedMeasureSpec ? 0 : size;
                    resultMode = MeasureSpec.UNSPECIFIED;
                } else if (childDimension == LayoutParams.WRAP_CONTENT) {
                    // Child wants to determine its own size.... find out how
                    // big it should be
                    resultSize = size //View.sUseZeroUnspecifiedMeasureSpec ? 0 : size;
                    resultMode = MeasureSpec.UNSPECIFIED;
                }
                break;
        }
        //noinspection ResourceType
        return MeasureSpec.makeMeasureSpec(resultSize, resultMode);
    }

    public static makeSafeMeasureSpec(size: number, mode: number) {
        return this.makeMeasureSpec(size, mode);
    }

    public static getMode(measureSpec: number) {

        return (measureSpec & this.MODE_MASK);
    }

    public static getSize(measureSpec: number) {
        return (measureSpec & ~this.MODE_MASK);
    }

    static adjust(measureSpec: number, delta: number) {
        const mode = this.getMode(measureSpec);
        let size = this.getSize(measureSpec);
        if (mode == MeasureSpec.UNSPECIFIED) {

            return this.makeMeasureSpec(size, MeasureSpec.UNSPECIFIED);
        }
        size += delta;
        if (size < 0) {
            size = 0;
        }
        return this.makeMeasureSpec(size, mode);
    }
}

class Measurer implements BasicMeasurer {
    mLayout: ConstraintSystem
    mLayoutParams: ConstraintLayout.LayoutParams
    mPaddingTop: number = 0
    mPaddingBottom: number = 0
    mPaddingWidth: number = 0
    mPaddingHeight: number = 0
    mLayoutWidthSpec: number = 0
    mLayoutHeightSpec: number = 0
    private mWidgetToParams: Map<ConstraintWidget, LayoutParams>;

    public captureLayoutInfo(widthSpec: number, heightSpec: number, top: number, bottom: number, width: number, height: number) {
        this.mPaddingTop = top;
        this.mPaddingBottom = bottom;
        this.mPaddingWidth = width;
        this.mPaddingHeight = height;
        this.mLayoutWidthSpec = widthSpec;
        this.mLayoutHeightSpec = heightSpec;
    }

    constructor(l: ConstraintSystem, layoutParams: ConstraintLayout.LayoutParams, widgetMappedParams: Map<ConstraintWidget, LayoutParams>) {
        this.mLayout = l;
        this.mLayoutParams = layoutParams
        this.mWidgetToParams = widgetMappedParams
    }

    public measure(widget: ConstraintWidget, measure: Measure) {
        if (widget == null) {
            return;
        }
        if (widget.getVisibility() == View.GONE && !widget.isInPlaceholder()) {
            measure.measuredWidth = 0;
            measure.measuredHeight = 0;
            measure.measuredBaseline = 0;
            return;
        }
        if (widget.getParent() == null) {
            return;
        }

        let startMeasure = 0;
        let endMeasure: number

        let horizontalBehavior: DimensionBehaviour = measure.horizontalBehavior;
        let verticalBehavior: DimensionBehaviour = measure.verticalBehavior;

        let horizontalDimension = measure.horizontalDimension;
        let verticalDimension = measure.verticalDimension;

        let horizontalSpec = 0;
        let verticalSpec = 0;

        let heightPadding = this.mPaddingTop + this.mPaddingBottom;
        let widthPadding = this.mPaddingWidth;

        let child = widget.getCompanionWidget()

        switch (horizontalBehavior) {
            case DimensionBehaviour.FIXED: {
                horizontalSpec = MeasureSpec.makeMeasureSpec(horizontalDimension,
                    MeasureSpec.EXACTLY);
            }
                break;
            case DimensionBehaviour.WRAP_CONTENT: {
                horizontalSpec = MeasureSpec.getChildMeasureSpec(this.mLayoutWidthSpec,
                    widthPadding, DimensionBehaviour.WRAP_CONTENT);
            }
                break;
            case DimensionBehaviour.MATCH_PARENT: {

                horizontalSpec = MeasureSpec.getChildMeasureSpec(this.mLayoutWidthSpec,
                    widthPadding + widget.getHorizontalMargin(),
                    LayoutParams.MATCH_PARENT);
            }
                break;
            case DimensionBehaviour.MATCH_CONSTRAINT: {
                horizontalSpec = MeasureSpec.getChildMeasureSpec(this.mLayoutWidthSpec,
                    widthPadding, DimensionBehaviour.WRAP_CONTENT);
                let shouldDoWrap = widget.mMatchConstraintDefaultWidth == LayoutParams.MATCH_CONSTRAINT_WRAP;

                if (measure.measureStrategy == Measure.TRY_GIVEN_DIMENSIONS
                    || measure.measureStrategy == Measure.USE_GIVEN_DIMENSIONS) {


                    // added
                    let childMeasuredHeight = this.mLayoutParams.measuredHeight

                    let otherDimensionStable = childMeasuredHeight == widget.getHeight();
                    let useCurrent = measure.measureStrategy == Measure.USE_GIVEN_DIMENSIONS
                        || !shouldDoWrap
                        || (shouldDoWrap && otherDimensionStable)
                        // || child instanceof Placeholder
                        || widget.isResolvedHorizontally();
                    if (useCurrent) {
                        horizontalSpec = MeasureSpec.makeMeasureSpec(widget.getWidth(),
                            MeasureSpec.EXACTLY);
                    }
                }
            }
                break;
        }

        switch (verticalBehavior) {
            case DimensionBehaviour.FIXED: {
                verticalSpec = MeasureSpec.makeMeasureSpec(verticalDimension, MeasureSpec.EXACTLY);
            }
                break;
            case DimensionBehaviour.WRAP_CONTENT: {
                verticalSpec = MeasureSpec.getChildMeasureSpec(this.mLayoutHeightSpec, heightPadding, WRAP_CONTENT);
            }
                break;
            case DimensionBehaviour.MATCH_PARENT: {

                verticalSpec = MeasureSpec.getChildMeasureSpec(this.mLayoutHeightSpec, heightPadding + widget.getVerticalMargin(), LayoutParams.MATCH_PARENT);
            }
                break;
            case DimensionBehaviour.MATCH_CONSTRAINT: {
                verticalSpec = MeasureSpec.getChildMeasureSpec(this.mLayoutHeightSpec, heightPadding, WRAP_CONTENT);

                let shouldDoWrap = widget.mMatchConstraintDefaultHeight == LayoutParams.MATCH_CONSTRAINT_WRAP;

                if (measure.measureStrategy == Measure.TRY_GIVEN_DIMENSIONS
                    || measure.measureStrategy == Measure.USE_GIVEN_DIMENSIONS) {


                    let childMeasuredWidth = this.mLayoutParams.measuredWidth

                    let otherDimensionStable = childMeasuredWidth //child.getMeasuredWidth()== widget.getWidth();
                    let useCurrent = measure.measureStrategy == Measure.USE_GIVEN_DIMENSIONS
                        || !shouldDoWrap
                        || (shouldDoWrap && otherDimensionStable)
                        // || (child instanceof Placeholder)
                        || widget.isResolvedVertically();
                    if (useCurrent) {
                        verticalSpec = MeasureSpec.makeMeasureSpec(widget.getHeight(),
                            MeasureSpec.EXACTLY);
                    }
                }
            }
                break;
        }

        let childMeasuredWidth = this.mLayoutParams.measuredWidth
        let childMeasuredHeight = this.mLayoutParams.measuredHeight

        let container = widget.getParent() as ConstraintWidgetContainer
        if (container != null && Optimizer.enabled(Optimizer.OPTIMIZATION_STANDARD, Optimizer.OPTIMIZATION_CACHE_MEASURES)) {
            if (childMeasuredWidth == widget.getWidth()
                && childMeasuredWidth < container.getWidth()
                && childMeasuredHeight == widget.getHeight()
                && childMeasuredHeight < container.getHeight()
                // && childBaseline == widget.getBaselineDistance()
                && !widget.isMeasureRequested()
            ) {
                let similar = this.isSimilarSpec(widget.getLastHorizontalMeasureSpec(), horizontalSpec, widget.getWidth())
                    && this.isSimilarSpec(widget.getLastVerticalMeasureSpec(), verticalSpec, widget.getHeight());
                if (similar) {
                    measure.measuredWidth = widget.getWidth();
                    measure.measuredHeight = widget.getHeight();
                    measure.measuredBaseline = widget.getBaselineDistance();


                    return;
                }
            }
        }

        let horizontalMatchConstraints = (horizontalBehavior == DimensionBehaviour.MATCH_CONSTRAINT);
        let verticalMatchConstraints = (verticalBehavior == DimensionBehaviour.MATCH_CONSTRAINT);

        let verticalDimensionKnown = (verticalBehavior == DimensionBehaviour.MATCH_PARENT
            || verticalBehavior == DimensionBehaviour.FIXED);
        let horizontalDimensionKnown = (horizontalBehavior == DimensionBehaviour.MATCH_PARENT
            || horizontalBehavior == DimensionBehaviour.FIXED);
        let horizontalUseRatio = horizontalMatchConstraints && widget.mDimensionRatio > 0;
        let verticalUseRatio = verticalMatchConstraints && widget.mDimensionRatio > 0;

        if (child == null) {
            return;
        }

        let params = this.mWidgetToParams.get(widget)! //this.mLayoutParams//child.getLayoutParams() as LayoutParams

        let width = 0;
        let height = 0;
        let baseline = 0;

        if ((measure.measureStrategy == Measure.TRY_GIVEN_DIMENSIONS
                || measure.measureStrategy == Measure.USE_GIVEN_DIMENSIONS)
            || !(horizontalMatchConstraints
                && widget.mMatchConstraintDefaultWidth == LayoutParams.MATCH_CONSTRAINT_SPREAD
                && verticalMatchConstraints
                && widget.mMatchConstraintDefaultHeight == LayoutParams.MATCH_CONSTRAINT_SPREAD)) {

            // child.measure(horizontalSpec, verticalSpec);
            widget.setLastMeasureSpec(horizontalSpec, verticalSpec);

            let w = this.mLayoutParams.measuredWidth//child.getMeasuredWidth();
            let h = this.mLayoutParams.measuredHeight//child.getMeasuredHeight();
            baseline = this.mLayoutParams.baseline//child.getBaseline();

            width = w;
            height = h;

            if (widget.mMatchConstraintMinWidth > 0) {
                width = Math.max(widget.mMatchConstraintMinWidth, width);
            }
            if (widget.mMatchConstraintMaxWidth > 0) {
                width = Math.min(widget.mMatchConstraintMaxWidth, width);
            }
            if (widget.mMatchConstraintMinHeight > 0) {
                height = Math.max(widget.mMatchConstraintMinHeight, height);
            }
            if (widget.mMatchConstraintMaxHeight > 0) {
                height = Math.min(widget.mMatchConstraintMaxHeight, height);
            }

            let optimizeDirect = Optimizer.enabled(Optimizer.OPTIMIZATION_STANDARD, Optimizer.OPTIMIZATION_DIRECT);
            if (!optimizeDirect) {
                if (horizontalUseRatio && verticalDimensionKnown) {
                    let ratio = widget.mDimensionRatio;
                    width = Math.round(0.5 + height * ratio);
                } else if (verticalUseRatio && horizontalDimensionKnown) {
                    let ratio = widget.mDimensionRatio;
                    height = Math.round(0.5 + width / ratio);
                }
            }

            if (w != width || h != height) {
                if (w != width) {
                    horizontalSpec = MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY);
                }
                if (h != height) {
                    verticalSpec = MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY);
                }
                // child.measure(horizontalSpec, verticalSpec);

                widget.setLastMeasureSpec(horizontalSpec, verticalSpec);
                width = this.mLayoutParams.measuredWidth//child.getMeasuredWidth();
                height = this.mLayoutParams.measuredHeight//child.getMeasuredHeight();
                baseline = this.mLayoutParams.baseline//child.getBaseline();
            }

        }

        let hasBaseline = baseline != -1;

        measure.measuredNeedsSolverPass = (width != measure.horizontalDimension)
            || (height != measure.verticalDimension);
        if (params.mNeedsBaseline) {
            hasBaseline = true;
        }
        if (hasBaseline && baseline != -1 && widget.getBaselineDistance() != baseline) {
            measure.measuredNeedsSolverPass = true;
        }
        measure.measuredWidth = width;
        measure.measuredHeight = height;
        measure.measuredHasBaseline = hasBaseline;
        measure.measuredBaseline = baseline;
    }


    private isSimilarSpec(lastMeasureSpec: number, spec: number, widgetSize: number) {
        if (lastMeasureSpec == spec) {
            return true;
        }
        let lastMode = MeasureSpec.getMode(lastMeasureSpec);
        let mode = MeasureSpec.getMode(spec);
        let size = MeasureSpec.getSize(spec);
        return mode == MeasureSpec.EXACTLY
            && (lastMode == MeasureSpec.AT_MOST || lastMode == MeasureSpec.UNSPECIFIED)
            && widgetSize == size;
    }

    public didMeasures() {
        // const widgetsCount = this.mLayout.getChildCount();
        // for (let i = 0; i < widgetsCount; i++) {
        //     const child = this.mLayout.getChildAt(i);
        //     if (child instanceof Placeholder) {
        //         (child as Placeholder).updatePostMeasure(this.mLayout)
        //     }
        // }
        //
        // const helperCount = this.mLayout.mConstraintHelpers.length
        // if (helperCount > 0) {
        //     for (let i = 0; i < helperCount; i++) {
        //         let helper = this.mLayout.mConstraintHelpers[0]
        //         helper.updatePostMeasure(this.mLayout);
        //     }
        // }
    }
}

export class View {
    static readonly VISIBLE = 0
    static readonly INVISIBLE = 4
    static readonly GONE = 8
}