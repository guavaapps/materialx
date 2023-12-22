import {HelperWidget} from "./HelperWidget";
import {LinearSystem, ValuesRow} from "./LinearSystem";
import {ConstraintWidget, DimensionBehaviour} from "./ConstraintWidget";
import {SolverVariable} from "./SolverVariable";
import {ConstraintAnchor, ConstraintAnchorType} from "./ConstraintAnchor";
import {Guideline} from "./Guideline";

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
                    system.addEqualityConstant(this.mLeft.mSolverVariable, this.mX);
                    system.addEqualityConstant(this.mRight.mSolverVariable, this.mX);
                } else if (this.mBarrierType == Barrier.TOP || this.mBarrierType == Barrier.BOTTOM) {
                    system.addEqualityConstant(this.mTop.mSolverVariable, this.mY);
                    system.addEqualityConstant(this.mBottom.mSolverVariable, this.mY);
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
                system.addLowerBarrier(position.mSolverVariable, target,
                    this.mMargin - margin, hasMatchConstraintWidgets);
            } else {
                system.addGreaterBarrier(position.mSolverVariable, target,
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