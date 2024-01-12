import {ConstraintWidgetContainer} from "./ConstraintWidget";
import {LinearSystem} from "./SolverVariable";
import {ConstraintWidget, DimensionBehaviour} from "./ConstraintWidget";
import {ChainHead} from "./ChainHead";
import {Direct} from "./ConstraintWidget";
import {SolverVariable} from "./SolverVariable";
import {ConstraintAnchor} from "./ConstraintAnchor";

export class Chain {
    public static readonly USE_CHAIN_OPTIMIZATION = false;

    public static applyChainConstraints(
        constraintWidgetContainer: ConstraintWidgetContainer,
        system: LinearSystem,
        widgets: ConstraintWidget[] | null,
        orientation: number) {
        // what to do:
        // Don't skip things. Either the element is GONE or not.
        let offset = 0;
        let chainsSize = 0;
        let chainsArray: (ChainHead | null)[] | null = null;
        if (orientation == ConstraintWidget.HORIZONTAL) {
            offset = 0;
            chainsSize = constraintWidgetContainer.mHorizontalChainsSize;
            chainsArray = constraintWidgetContainer.mHorizontalChainsArray;
        } else {
            offset = 2;
            chainsSize = constraintWidgetContainer.mVerticalChainsSize;
            chainsArray = constraintWidgetContainer.mVerticalChainsArray;
        }

        for (let i = 0; i < chainsSize; i++) {
            let first = chainsArray[i];
            // we have to make sure we define the ChainHead here,
            // otherwise the values we use may not be correctly initialized
            // (as we initialize them in the ConstraintWidget.addToSolver())
            first!.define();
            if (widgets == null || widgets.includes(first!.mFirst!)) {
                this.applyChainConstraintsWithHead(constraintWidgetContainer,
                    system, orientation, offset, first!);
            }
        }
    }

    static applyChainConstraintsWithHead(container: ConstraintWidgetContainer, system: LinearSystem, orientation: number, offset: number, chainHead: ChainHead) {
        let first = chainHead.mFirst;
        let last = chainHead.mLast!
        let firstVisibleWidget = chainHead.mFirstVisibleWidget;
        let lastVisibleWidget = chainHead.mLastVisibleWidget;
        let head = chainHead.mHead;

        let widget = first;
        let next: ConstraintWidget | null = null;
        let done = false;

        let totalWeights = chainHead.mTotalWeight;
        let firstMatchConstraintsWidget = chainHead.mFirstMatchConstraintWidget;
        let previousMatchConstraintsWidget = chainHead.mLastMatchConstraintWidget;

        let isWrapContent = container.mListDimensionBehaviors[orientation] == DimensionBehaviour.WRAP_CONTENT;
        let isChainSpread = false;
        let isChainSpreadInside = false;
        let isChainPacked = false;

        if (orientation == ConstraintWidget.HORIZONTAL) {
            isChainSpread = head!.mHorizontalChainStyle == ConstraintWidget.CHAIN_SPREAD;
            isChainSpreadInside =
                head!.mHorizontalChainStyle == ConstraintWidget.CHAIN_SPREAD_INSIDE;
            isChainPacked = head!.mHorizontalChainStyle == ConstraintWidget.CHAIN_PACKED;
        } else {
            isChainSpread = head!.mVerticalChainStyle == ConstraintWidget.CHAIN_SPREAD;
            isChainSpreadInside = head!.mVerticalChainStyle == ConstraintWidget.CHAIN_SPREAD_INSIDE;
            isChainPacked = head!.mVerticalChainStyle == ConstraintWidget.CHAIN_PACKED;
        }

        if (Chain.USE_CHAIN_OPTIMIZATION && !isWrapContent
            && Direct.solveChain(container, system, orientation, offset, chainHead,
                isChainSpread, isChainSpreadInside, isChainPacked)) {
            return; // done with the chain!
        }

// This traversal will:
// - set up some basic ordering constraints
// - build a linked list of matched constraints widgets
        while (!done) {
            let begin = widget!.mListAnchors[offset];

            let strength = SolverVariable.STRENGTH_HIGHEST;
            if (isChainPacked) {
                strength = SolverVariable.STRENGTH_LOW;
            }
            let margin = begin.getMargin();
            let isSpreadOnly = widget!.mListDimensionBehaviors[orientation]
                == DimensionBehaviour.MATCH_CONSTRAINT
                && widget!.mResolvedMatchConstraintDefault[orientation]
                == ConstraintWidget.MATCH_CONSTRAINT_SPREAD;

            if (begin.mTarget != null && widget != first) {
                margin += begin.mTarget.getMargin();
            }

            if (isChainPacked && widget != first && widget != firstVisibleWidget) {
                strength = SolverVariable.STRENGTH_FIXED;
            }

            if (begin.mTarget != null) {
                if (widget == firstVisibleWidget) {
                    system.addGreaterThan(begin.mSolverVariable, begin.mTarget.mSolverVariable,
                        margin, SolverVariable.STRENGTH_BARRIER);
                } else {
                    system.addGreaterThan(begin.mSolverVariable, begin.mTarget.mSolverVariable,
                        margin, SolverVariable.STRENGTH_FIXED);
                }
                if (isSpreadOnly && !isChainPacked) {
                    strength = SolverVariable.STRENGTH_EQUALITY;
                }
                if (widget == firstVisibleWidget && isChainPacked
                    && widget!.isInBarrier(orientation)) {
                    strength = SolverVariable.STRENGTH_EQUALITY;
                }
                system.addEquality(begin.mSolverVariable, begin.mTarget.mSolverVariable, margin, strength);
            }

            if (isWrapContent) {
                if (widget!.getVisibility() != ConstraintWidget.GONE
                    && widget!.mListDimensionBehaviors[orientation]
                    == DimensionBehaviour.MATCH_CONSTRAINT) {
                    system.addGreaterThan(widget!.mListAnchors[offset + 1].mSolverVariable,
                        widget!.mListAnchors[offset].mSolverVariable, 0,
                        SolverVariable.STRENGTH_EQUALITY);
                }
                system.addGreaterThan(widget!.mListAnchors[offset].mSolverVariable,
                    container.mListAnchors[offset].mSolverVariable,
                    0, SolverVariable.STRENGTH_FIXED);
            }

            // go to the next widget
            let nextAnchor = widget!.mListAnchors[offset + 1].mTarget;
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

// Make sure we have constraints for the last anchors / targets
        if (lastVisibleWidget != null && last!.mListAnchors[offset + 1].mTarget != null) {
            let end = lastVisibleWidget.mListAnchors[offset + 1];
            let isSpreadOnly = lastVisibleWidget.mListDimensionBehaviors[orientation]
                == DimensionBehaviour.MATCH_CONSTRAINT
                && lastVisibleWidget.mResolvedMatchConstraintDefault[orientation]
                == ConstraintWidget.MATCH_CONSTRAINT_SPREAD;
            if (isSpreadOnly && !isChainPacked && end.mTarget!.mOwner == container) {
                system.addEquality(end.mSolverVariable, end.mTarget!.mSolverVariable, -end.getMargin(), SolverVariable.STRENGTH_EQUALITY);
            } else if (isChainPacked && end.mTarget!.mOwner == container) {
                system.addEquality(end.mSolverVariable, end.mTarget!.mSolverVariable, -end.getMargin(), SolverVariable.STRENGTH_HIGHEST);
            }
            system.addLowerThan(end.mSolverVariable, last.mListAnchors[offset + 1].mTarget!.mSolverVariable, -end.getMargin(), SolverVariable.STRENGTH_BARRIER);
        }

// ... and make sure the root end is constrained in wrap content.
        if (isWrapContent) {
            system.addGreaterThan(container.mListAnchors[offset + 1].mSolverVariable,
                last.mListAnchors[offset + 1].mSolverVariable,
                last.mListAnchors[offset + 1].getMargin(), SolverVariable.STRENGTH_FIXED);
        }

// Now, let's apply the centering / spreading for matched constraints widgets
        let listMatchConstraints =
            chainHead.mWeightedMatchConstraintsWidgets;
        if (listMatchConstraints != null) {
            const count = listMatchConstraints.length
            if (count > 1) {
                let lastMatch: ConstraintWidget | null = null;
                let lastWeight = 0;

                if (chainHead.mHasUndefinedWeights && !chainHead.mHasComplexMatchWeights) {
                    totalWeights = chainHead.mWidgetsMatchCount;
                }

                for (let i = 0; i < count; i++) {
                    let match = listMatchConstraints[i]
                    let currentWeight = match.mWeight[orientation];

                    if (currentWeight < 0) {
                        if (chainHead.mHasComplexMatchWeights) {
                            system.addEquality(match.mListAnchors[offset + 1].mSolverVariable, match.mListAnchors[offset].mSolverVariable, 0, SolverVariable.STRENGTH_HIGHEST);
                            continue;
                        }
                        currentWeight = 1;
                    }
                    if (currentWeight == 0) {
                        system.addEquality(match.mListAnchors[offset + 1].mSolverVariable, match.mListAnchors[offset].mSolverVariable, 0, SolverVariable.STRENGTH_FIXED);
                        continue;
                    }

                    if (lastMatch != null) {
                        let begin = lastMatch.mListAnchors[offset].mSolverVariable;
                        let end = lastMatch.mListAnchors[offset + 1].mSolverVariable;
                        let nextBegin = match.mListAnchors[offset].mSolverVariable;
                        let nextEnd = match.mListAnchors[offset + 1].mSolverVariable;
                        let row = system.createRow();
                        row.createRowEqualMatchDimensions(lastWeight, totalWeights, currentWeight,
                            begin!, end!, nextBegin!, nextEnd!);
                        system.addConstraint(row);
                    }

                    lastMatch = match;
                    lastWeight = currentWeight;
                }
            }
        }

// Finally, let's apply the specific rules dealing with the different chain types

        if (firstVisibleWidget != null
            && (firstVisibleWidget == lastVisibleWidget || isChainPacked)) {
            let begin = first!.mListAnchors[offset];
            let end = last.mListAnchors[offset + 1];
            let beginTarget = begin.mTarget != null
                ? begin.mTarget.mSolverVariable : null;
            let endTarget = end.mTarget != null ? end.mTarget.mSolverVariable : null;
            begin = firstVisibleWidget.mListAnchors[offset];
            if (lastVisibleWidget != null) {
                end = lastVisibleWidget.mListAnchors[offset + 1];
            }
            if (beginTarget != null && endTarget != null) {
                let bias = 0.5;
                if (orientation == ConstraintWidget.HORIZONTAL) {
                    bias = head!.mHorizontalBiasPercent;
                } else {
                    bias = head!.mVerticalBiasPercent;
                }
                let beginMargin = begin.getMargin();
                let endMargin = end.getMargin();
                system.addCentering(begin.mSolverVariable!, beginTarget,
                    beginMargin, bias, endTarget, end.mSolverVariable!,
                    endMargin, SolverVariable.STRENGTH_CENTERING);
            }
        } else if (isChainSpread && firstVisibleWidget != null) {
            // for chain spread, we need to add equal dimensions in between *visible* widgets
            widget = firstVisibleWidget;
            let previousVisibleWidget = firstVisibleWidget;
            let applyFixedEquality = chainHead.mWidgetsMatchCount > 0
                && (chainHead.mWidgetsCount == chainHead.mWidgetsMatchCount);
            while (widget != null) {
                next = widget.mNextChainWidget[orientation];
                while (next != null && next.getVisibility() == ConstraintWidget.GONE) {
                    next = next.mNextChainWidget[orientation];
                }
                if (next != null || widget == lastVisibleWidget) {
                    let beginAnchor = widget.mListAnchors[offset];
                    let begin = beginAnchor.mSolverVariable;
                    let beginTarget = beginAnchor.mTarget != null
                        ? beginAnchor.mTarget.mSolverVariable : null;
                    if (previousVisibleWidget != widget) {
                        beginTarget =
                            previousVisibleWidget.mListAnchors[offset + 1].mSolverVariable;
                    } else if (widget == firstVisibleWidget) {
                        beginTarget = first!.mListAnchors[offset].mTarget != null
                            ? first!.mListAnchors[offset].mTarget!.mSolverVariable : null;
                    }

                    let beginNextAnchor: ConstraintAnchor | null = null;
                    let beginNext: SolverVariable | null = null;
                    let beginNextTarget: SolverVariable | null = null;
                    let beginMargin = beginAnchor.getMargin();
                    let nextMargin = widget.mListAnchors[offset + 1].getMargin();

                    if (next != null) {
                        beginNextAnchor = next.mListAnchors[offset];
                        beginNext = beginNextAnchor.mSolverVariable;
                    } else {
                        beginNextAnchor = last.mListAnchors[offset + 1].mTarget;
                        if (beginNextAnchor != null) {
                            beginNext = beginNextAnchor.mSolverVariable;
                        }
                    }
                    beginNextTarget = widget.mListAnchors[offset + 1].mSolverVariable;

                    if (beginNextAnchor != null) {
                        nextMargin += beginNextAnchor.getMargin();
                    }
                    beginMargin += previousVisibleWidget.mListAnchors[offset + 1].getMargin();
                    if (begin != null && beginTarget != null
                        && beginNext != null && beginNextTarget != null) {
                        let margin1 = beginMargin;
                        if (widget == firstVisibleWidget) {
                            margin1 = firstVisibleWidget.mListAnchors[offset].getMargin();
                        }
                        let margin2 = nextMargin;
                        if (widget == lastVisibleWidget) {
                            margin2 = lastVisibleWidget.mListAnchors[offset + 1].getMargin();
                        }
                        let strength = SolverVariable.STRENGTH_EQUALITY;
                        if (applyFixedEquality) {
                            strength = SolverVariable.STRENGTH_FIXED;
                        }
                        system.addCentering(begin, beginTarget, margin1, 0.5,
                            beginNext, beginNextTarget, margin2,
                            strength);
                    }
                }
                if (widget.getVisibility() != ConstraintWidget.GONE) {
                    previousVisibleWidget = widget;
                }
                widget = next;
            }
        } else if (isChainSpreadInside && firstVisibleWidget != null) {
            // for chain spread inside, we need to add equal dimensions in between *visible* widgets
            widget = firstVisibleWidget;
            let previousVisibleWidget = firstVisibleWidget;
            let applyFixedEquality = chainHead.mWidgetsMatchCount > 0
                && (chainHead.mWidgetsCount == chainHead.mWidgetsMatchCount);
            while (widget != null) {
                next = widget.mNextChainWidget[orientation];
                while (next != null && next.getVisibility() == ConstraintWidget.GONE) {
                    next = next.mNextChainWidget[orientation];
                }
                if (widget != firstVisibleWidget && widget != lastVisibleWidget && next != null) {
                    if (next == lastVisibleWidget) {
                        next = null;
                    }
                    let beginAnchor = widget.mListAnchors[offset];
                    let begin = beginAnchor.mSolverVariable;
                    let beginTarget = beginAnchor.mTarget != null ? beginAnchor.mTarget.mSolverVariable : null;
                    beginTarget = previousVisibleWidget.mListAnchors[offset + 1].mSolverVariable;
                    let beginNextAnchor: ConstraintAnchor | null = null;
                    let beginNext: SolverVariable | null = null;
                    let beginNextTarget: SolverVariable | null = null;
                    let beginMargin = beginAnchor.getMargin();
                    let nextMargin = widget.mListAnchors[offset + 1].getMargin();

                    if (next != null) {
                        beginNextAnchor = next.mListAnchors[offset];
                        beginNext = beginNextAnchor.mSolverVariable;
                        beginNextTarget = beginNextAnchor.mTarget != null
                            ? beginNextAnchor.mTarget.mSolverVariable : null;
                    } else {
                        beginNextAnchor = lastVisibleWidget!.mListAnchors[offset];
                        if (beginNextAnchor != null) {
                            beginNext = beginNextAnchor.mSolverVariable;
                        }
                        beginNextTarget = widget.mListAnchors[offset + 1].mSolverVariable;
                    }

                    if (beginNextAnchor != null) {
                        nextMargin += beginNextAnchor.getMargin();
                    }
                    beginMargin += previousVisibleWidget.mListAnchors[offset + 1].getMargin();
                    let strength = SolverVariable.STRENGTH_HIGHEST;
                    if (applyFixedEquality) {
                        strength = SolverVariable.STRENGTH_FIXED;
                    }
                    if (begin != null && beginTarget != null
                        && beginNext != null && beginNextTarget != null) {
                        system.addCentering(begin, beginTarget, beginMargin, 0.5,
                            beginNext, beginNextTarget, nextMargin,
                            strength);
                    }
                }
                if (widget.getVisibility() != ConstraintWidget.GONE) {
                    previousVisibleWidget = widget;
                }
                widget = next;
            }
            let begin = firstVisibleWidget.mListAnchors[offset];
            let beginTarget = first!.mListAnchors[offset].mTarget;
            let end = lastVisibleWidget!.mListAnchors[offset + 1];
            let endTarget = last!.mListAnchors[offset + 1].mTarget;
            let endPointsStrength = SolverVariable.STRENGTH_EQUALITY;
            if (beginTarget != null) {
                if (firstVisibleWidget != lastVisibleWidget) {
                    system.addEquality(begin.mSolverVariable, beginTarget.mSolverVariable, begin.getMargin(), endPointsStrength);
                } else if (endTarget != null) {
                    system.addCentering(begin.mSolverVariable!, beginTarget.mSolverVariable!,
                        begin.getMargin(), 0.5, end.mSolverVariable!, endTarget.mSolverVariable!,
                        end.getMargin(), endPointsStrength);
                }
            }
            if (endTarget != null && (firstVisibleWidget != lastVisibleWidget)) {
                system.addEquality(end.mSolverVariable, endTarget.mSolverVariable, -end.getMargin(), endPointsStrength);
            }

        }

// final centering, necessary if the chain is larger than the available space...
        if ((isChainSpread || isChainSpreadInside) && firstVisibleWidget
            != null && firstVisibleWidget != lastVisibleWidget) {
            let begin = firstVisibleWidget.mListAnchors[offset];
            if (lastVisibleWidget == null) {
                lastVisibleWidget = firstVisibleWidget;
            }
            let end = lastVisibleWidget.mListAnchors[offset + 1];
            let beginTarget =
                begin.mTarget != null ? begin.mTarget.mSolverVariable : null;
            let endTarget = end.mTarget != null ? end.mTarget.mSolverVariable : null;
            if (last != lastVisibleWidget) {
                let realEnd = last.mListAnchors[offset + 1];
                endTarget = realEnd.mTarget != null ? realEnd.mTarget.mSolverVariable : null;
            }
            if (firstVisibleWidget == lastVisibleWidget) {
                begin = firstVisibleWidget.mListAnchors[offset];
                end = firstVisibleWidget.mListAnchors[offset + 1];
            }
            if (beginTarget != null && endTarget != null) {
                let bias = 0.5;
                let beginMargin = begin.getMargin();
                let endMargin = lastVisibleWidget.mListAnchors[offset + 1].getMargin();
                system.addCentering(begin.mSolverVariable!, beginTarget, beginMargin,
                    bias, endTarget, end.mSolverVariable!, endMargin,
                    SolverVariable.STRENGTH_EQUALITY);
            }
        }
    }
}