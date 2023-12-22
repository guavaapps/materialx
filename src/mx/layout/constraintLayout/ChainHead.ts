import {ConstraintWidget, DimensionBehaviour} from "./ConstraintWidget";
import {ConstraintWidgetContainer} from "./ConstraintWidgetContainer";
import {Chain} from "./Chain";

export class ChainHead {
    mFirst: null | ConstraintWidget = null
    mFirstVisibleWidget: null | ConstraintWidget = null
    mLast: ConstraintWidget | null = null
    mLastVisibleWidget: ConstraintWidget | null = null
    mHead: ConstraintWidget | null = null
    mFirstMatchConstraintWidget: ConstraintWidget | null = null
    mLastMatchConstraintWidget: null | ConstraintWidget = null
    mWeightedMatchConstraintsWidgets: null | ConstraintWidget[] = null
    mWidgetsCount: number = 0
    mWidgetsMatchCount: number = 0
    mTotalWeight = 0;
    mVisibleWidgets: number = 0
    mTotalSize: number = 0
    mTotalMargins: number = 0
    mOptimizable = false
    private mOrientation: number = 0
    private mIsRtl = false;
    mHasUndefinedWeights: boolean = false
    mHasDefinedWeights: boolean = false
    mHasComplexMatchWeights: boolean = false
    mHasRatio: boolean = false
    private mDefined: boolean = false

    constructor(first: ConstraintWidget, orientation: number, isRtl: boolean) {
        this.mFirst = first
        this.mOrientation = orientation
        this.mIsRtl = isRtl
    }

    private static isMatchConstraintEqualityCandidate(widget: ConstraintWidget, orientation: number) {
        return widget.getVisibility() != ConstraintWidget.GONE
            && widget.mListDimensionBehaviors[orientation]
            == DimensionBehaviour.MATCH_CONSTRAINT
            && (widget.mResolvedMatchConstraintDefault[orientation] == ConstraintWidget.MATCH_CONSTRAINT_SPREAD
                || widget.mResolvedMatchConstraintDefault[orientation] == ConstraintWidget.MATCH_CONSTRAINT_RATIO);
    }

    private defineChainProperties() {
        let offset = this.mOrientation * 2;
        let lastVisited = this.mFirst;
        this.mOptimizable = true;

        // TraverseChain
        let widget = this.mFirst!
        let next: ConstraintWidget | null = this.mFirst;
        let done = false;
        while (!done) {
            this.mWidgetsCount++;
            widget.mNextChainWidget[this.mOrientation] = null;
            widget.mListNextMatchConstraintsWidget[this.mOrientation] = null;
            if (widget.getVisibility() != ConstraintWidget.GONE) {
                this.mVisibleWidgets++;
                if (widget.getDimensionBehaviour(this.mOrientation)
                    != DimensionBehaviour.MATCH_CONSTRAINT) {
                    this.mTotalSize += widget.getLength(this.mOrientation);
                }
                this.mTotalSize += widget.mListAnchors[offset].getMargin();
                this.mTotalSize += widget.mListAnchors[offset + 1].getMargin();
                this.mTotalMargins += widget.mListAnchors[offset].getMargin();
                this.mTotalMargins += widget.mListAnchors[offset + 1].getMargin();
                // Visible widgets linked list.
                if (this.mFirstVisibleWidget == null) {
                    this.mFirstVisibleWidget = widget;
                }
                this.mLastVisibleWidget = widget;

                // Match constraint linked list.
                if (widget.mListDimensionBehaviors[this.mOrientation]
                    == DimensionBehaviour.MATCH_CONSTRAINT) {
                    if (widget.mResolvedMatchConstraintDefault[this.mOrientation] == ConstraintWidget.MATCH_CONSTRAINT_SPREAD
                        || widget.mResolvedMatchConstraintDefault[this.mOrientation] == ConstraintWidget.MATCH_CONSTRAINT_RATIO
                        || widget.mResolvedMatchConstraintDefault[this.mOrientation] == ConstraintWidget.MATCH_CONSTRAINT_PERCENT) {
                        this.mWidgetsMatchCount++;
                        // Note: Might cause an issue if we support MATCH_CONSTRAINT_RATIO_RESOLVED
                        // in chain optimization. (we currently don't)
                        let weight = widget.mWeight[this.mOrientation];
                        if (weight > 0) {
                            this.mTotalWeight += widget.mWeight[this.mOrientation];
                        }

                        if (ChainHead.isMatchConstraintEqualityCandidate(widget, this.mOrientation)) {
                            if (weight < 0) {
                                this.mHasUndefinedWeights = true;
                            } else {
                                this.mHasDefinedWeights = true;
                            }
                            if (this.mWeightedMatchConstraintsWidgets == null) {
                                this.mWeightedMatchConstraintsWidgets = []
                            }
                            this.mWeightedMatchConstraintsWidgets.push(widget);
                        }

                        if (this.mFirstMatchConstraintWidget == null) {
                            this.mFirstMatchConstraintWidget = widget;
                        }
                        if (this.mLastMatchConstraintWidget != null) {
                            this.mLastMatchConstraintWidget
                                .mListNextMatchConstraintsWidget[this.mOrientation] = widget;
                        }
                        this.mLastMatchConstraintWidget = widget;
                    }
                    if (this.mOrientation == ConstraintWidget.HORIZONTAL) {
                        if (widget.mMatchConstraintDefaultWidth
                            != ConstraintWidget.MATCH_CONSTRAINT_SPREAD) {
                            this.mOptimizable = false;
                        } else if (widget.mMatchConstraintMinWidth != 0
                            || widget.mMatchConstraintMaxWidth != 0) {
                            this.mOptimizable = false;
                        }
                    } else {
                        if (widget.mMatchConstraintDefaultHeight
                            != ConstraintWidget.MATCH_CONSTRAINT_SPREAD) {
                            this.mOptimizable = false;
                        } else if (widget.mMatchConstraintMinHeight != 0
                            || widget.mMatchConstraintMaxHeight != 0) {
                            this.mOptimizable = false;
                        }
                    }
                    if (widget.mDimensionRatio != 0.0) {
                        //TODO: Improve (Could use ratio optimization).
                        this.mOptimizable = false;
                        this.mHasRatio = true;
                    }
                }
            }
            if (lastVisited != widget) {
                lastVisited!.mNextChainWidget[this.mOrientation] = widget;
            }
            lastVisited = widget;

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
        if (this.mFirstVisibleWidget != null) {
            this.mTotalSize -= this.mFirstVisibleWidget.mListAnchors[offset].getMargin();
        }
        if (this.mLastVisibleWidget != null) {
            this.mTotalSize -= this.mLastVisibleWidget.mListAnchors[offset + 1].getMargin();
        }
        this.mLast = widget;

        if (this.mOrientation == ConstraintWidget.HORIZONTAL && this.mIsRtl) {
            this.mHead = this.mLast;
        } else {
            this.mHead = this.mFirst;
        }

        this.mHasComplexMatchWeights = this.mHasDefinedWeights && this.mHasUndefinedWeights;
    }

    public getFirst() {
        return this.mFirst;
    }

    public getFirstVisibleWidget() {
        return this.mFirstVisibleWidget;
    }

    public getLast() {
        return this.mLast;
    }

    public getLastVisibleWidget() {
        return this.mLastVisibleWidget;
    }

    public getHead() {
        return this.mHead;
    }

    public getFirstMatchConstraintWidget() {
        return this.mFirstMatchConstraintWidget;
    }

    public getLastMatchConstraintWidget() {
        return this.mLastMatchConstraintWidget;
    }

    public getTotalWeight() {
        return this.mTotalWeight;
    }

    // @TODO: add description
    public define() {
        if (!this.mDefined) {
            this.defineChainProperties();
        }
        this.mDefined = true;
    }
}