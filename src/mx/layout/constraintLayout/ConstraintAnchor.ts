import {SolverVariable, SolverVariableType} from "./SolverVariable";
import {AssertionError} from "assert";
import {ConstraintWidget} from "./ConstraintWidget";
import {Cache} from "./Cache";
import {Grouping} from "./Grouping";
import {WidgetGroup} from "./WidgetGroup";
import {Guideline} from "./Guideline";

export enum ConstraintAnchorType {
    NONE, LEFT, TOP, RIGHT, BOTTOM, BASELINE, CENTER, CENTER_X, CENTER_Y
}

export class ConstraintAnchor {
    private static readonly ALLOW_BINARY = false

    private mDependents: Set<ConstraintAnchor> | null = null
    private mFinalValue: number = 0
    private mHasFinalValue: boolean = false

    findDependents(orientation: number, list: WidgetGroup[], group: WidgetGroup) {
        if (this.mDependents != null) {
            for (let anchor of this.mDependents) {
                Grouping.findDependents(anchor.mOwner, orientation, list, group)
            }
        }
    }

    getDependents() {
        return this.mDependents
    }

    hasDependents() {
        if (this.mDependents == null) {
            return false;
        }
        return this.mDependents.size > 0;
    }

    hasCenteredDependents() {
        if (this.mDependents === null) {
            return false
        }

        for (let anchor of this.mDependents) {
            let opposite = anchor.getOpposite()!
            if (opposite.isConnected()) {
                return true;
            }
        }
        return false;
    }

    setFinalValue(finalValue: number) {
        this.mFinalValue = finalValue;
        this.mHasFinalValue = true;
    }

    getFinalValue() {
        if (!this.mHasFinalValue) {
            return 0;
        }
        return this.mFinalValue;
    }

    public resetFinalResolution() {
        this.mHasFinalValue = false;
        this.mFinalValue = 0;
    }

    // @TODO: add description
    public hasFinalValue() {
        return this.mHasFinalValue;
    }

    private static readonly UNSET_GONE_MARGIN = Number.MIN_VALUE

    mOwner: ConstraintWidget
    mType: ConstraintAnchorType
    mTarget: ConstraintAnchor | null = null
    mMargin = 0
    mGoneMargin = ConstraintAnchor.UNSET_GONE_MARGIN

    mSolverVariable: SolverVariable | null = null

    copyFrom(source: ConstraintAnchor, map: Map<ConstraintWidget, ConstraintWidget>) {
        if (this.mTarget != null) {
            if (this.mTarget.mDependents != null) {
                this.mTarget.mDependents.delete(this);
            }
        }
        if (source.mTarget != null) {
            let type = source.mTarget.getType();
            let owner = map.get(source.mTarget.mOwner)!
            this.mTarget = owner.getAnchor(type);
        } else {
            this.mTarget = null;
        }
        if (this.mTarget != null) {
            if (this.mTarget.mDependents == null) {
                this.mTarget.mDependents = new Set();
            }
            this.mTarget.mDependents.add(this);
        }
        this.mMargin = source.mMargin;
        this.mGoneMargin = source.mGoneMargin;
    }

    constructor(owner: ConstraintWidget, type: ConstraintAnchorType) {
        this.mOwner = owner
        this.mType = type
    }

    getSolverVariable() {
        return this.mSolverVariable
    }

    resetSolverVariable(cache: Cache) {
        if (this.mSolverVariable == null) {
            this.mSolverVariable = new SolverVariable(SolverVariableType.UNRESTRICTED, null);
        } else {
            this.mSolverVariable.reset();
        }
    }

    getOwner() {
        return this.mOwner
    }

    getType() {
        return this.mType
    }

    getMargin() {
        if (this.mOwner.getVisibility() == ConstraintWidget.GONE) {
            return 0;
        }
        if (this.mGoneMargin != ConstraintAnchor.UNSET_GONE_MARGIN && this.mTarget != null
            && this.mTarget.mOwner.getVisibility() == ConstraintWidget.GONE) {
            return this.mGoneMargin;
        }
        return this.mMargin;
    }

    getTarget() {
        return this.mTarget
    }

    public reset() {
        if (this.mTarget != null && this.mTarget.mDependents != null) {
            this.mTarget.mDependents.delete(this);
            if (this.mTarget.mDependents.size == 0) {
                this.mTarget.mDependents = null;
            }
        }
        let mDependents = null;
        let mTarget = null;
        let mMargin = 0;
        let mGoneMargin = ConstraintAnchor.UNSET_GONE_MARGIN;
        let mHasFinalValue = false;
        let mFinalValue = 0;
    }

    connectFull(toAnchor: ConstraintAnchor, margin: number, goneMargin: number, forceConnection: boolean) {
        if (toAnchor == null) {
            this.reset();
            return true;
        }
        if (!forceConnection && !this.isValidConnection(toAnchor)) {
            return false;
        }
        this.mTarget = toAnchor;
        if (this.mTarget.mDependents == null) {
            this.mTarget.mDependents = new Set();
        }
        if (this.mTarget.mDependents != null) {
            this.mTarget.mDependents.add(this);
        }
        this.mMargin = margin;
        this.mGoneMargin = goneMargin;
        return true;
    }

    connect(toAnchor: ConstraintAnchor, margin: number) {
        return this.connectFull(toAnchor, margin, ConstraintAnchor.UNSET_GONE_MARGIN, false);
    }

    isConnected() {
        return this.mTarget != null
    }

    isValidConnection(anchor: ConstraintAnchor | null) {
        if (anchor == null) {
            return false
        }

        let target = anchor.getType()

        if (target == this.mType) {
            if (this.mType == ConstraintAnchorType.BASELINE
                && (!anchor.getOwner().hasBaseline() || !this.getOwner().hasBaseline())) {
                return false;
            }
            return true;
        }

        switch (this.mType) {
            case ConstraintAnchorType.CENTER: {
                // allow everything but baseline and center_x/center_y
                return target != ConstraintAnchorType.BASELINE && target != ConstraintAnchorType.CENTER_X
                    && target != ConstraintAnchorType.CENTER_Y;
            }
            case ConstraintAnchorType.LEFT:
            case ConstraintAnchorType.RIGHT: {
                let isCompatible = target == ConstraintAnchorType.LEFT || target == ConstraintAnchorType.RIGHT;
                if (anchor.getOwner() instanceof Guideline) {
                    isCompatible = isCompatible || target == ConstraintAnchorType.CENTER_X;
                }
                return isCompatible;
            }
            case ConstraintAnchorType.TOP:
            case ConstraintAnchorType.BOTTOM: {
                let isCompatible = target == ConstraintAnchorType.TOP || target == ConstraintAnchorType.BOTTOM;
                if (anchor.getOwner() instanceof Guideline) {
                    isCompatible = isCompatible || target == ConstraintAnchorType.CENTER_Y;
                }
                return isCompatible;
            }
            case ConstraintAnchorType.BASELINE: {
                if (target == ConstraintAnchorType.LEFT || target == ConstraintAnchorType.RIGHT) {
                    return false;
                }
                return true;
            }
            case ConstraintAnchorType.CENTER_X:
            case ConstraintAnchorType.CENTER_Y:
            case ConstraintAnchorType.NONE:
                return false;
        }

        throw new AssertionError(this.mType);
    }

    public isSideAnchor() {
        switch (this.mType) {
            case ConstraintAnchorType.LEFT:
            case ConstraintAnchorType.RIGHT:
            case ConstraintAnchorType.TOP:
            case ConstraintAnchorType.BOTTOM:
                return true;
            case ConstraintAnchorType.BASELINE:
            case ConstraintAnchorType.CENTER:
            case ConstraintAnchorType.CENTER_X:
            case ConstraintAnchorType.CENTER_Y:
            case ConstraintAnchorType.NONE:
                return false;
        }
        throw new AssertionError(this.mType);
    }

    public isSimilarDimensionConnection(anchor: ConstraintAnchor) {
        let target = anchor.getType();
        if (target == this.mType) {
            return true;
        }
        switch (this.mType) {
            case ConstraintAnchorType.CENTER: {
                return target != ConstraintAnchorType.BASELINE;
            }
            case ConstraintAnchorType.LEFT:
            case ConstraintAnchorType.RIGHT:
            case ConstraintAnchorType.CENTER_X: {
                return target == ConstraintAnchorType.LEFT || target == ConstraintAnchorType.RIGHT || target == ConstraintAnchorType.CENTER_X;
            }
            case ConstraintAnchorType.TOP:
            case ConstraintAnchorType.BOTTOM:
            case ConstraintAnchorType.CENTER_Y:
            case ConstraintAnchorType.BASELINE: {
                return target == ConstraintAnchorType.TOP || target == ConstraintAnchorType.BOTTOM
                    || target == ConstraintAnchorType.CENTER_Y || target == ConstraintAnchorType.BASELINE;
            }
            case ConstraintAnchorType.NONE:
                return false;
        }
        throw new AssertionError(this.mType);
    }

    setMargin(margin: number) {
        if (this.isConnected()) {
            this.mMargin = margin
        }
    }

    setGoneMargin(margin: number) {
        if (this.isConnected()) {
            this.mGoneMargin = margin
        }
    }

    public isVerticalAnchor() {
        switch (this.mType) {
            case ConstraintAnchorType.LEFT:
            case ConstraintAnchorType.RIGHT:
            case ConstraintAnchorType.CENTER:
            case ConstraintAnchorType.CENTER_X:
                return false;
            case ConstraintAnchorType.CENTER_Y:
            case ConstraintAnchorType.TOP:
            case ConstraintAnchorType.BOTTOM:
            case ConstraintAnchorType.BASELINE:
            case ConstraintAnchorType.NONE:
                return true;
        }
        throw new AssertionError(this.mType);
    }

    public toString() {
        return this.mOwner.getDebugName() + ":" + this.mType.toString();
    }

    public isConnectionAllowedToAnchor(target: ConstraintWidget, anchor: ConstraintAnchor) {
        if (ConstraintAnchor.ALLOW_BINARY) {
            if (anchor != null && anchor.getTarget() == this) {
                return true;
            }
        }
        return this.isConnectionAllowed(target);
    }

    public isConnectionAllowed(target: ConstraintWidget) {
        let checked = new Set<ConstraintWidget>();
        if (this.isConnectionToMe(target, checked)) {
            return false;
        }
        let parent = this.getOwner().getParent();
        if (parent == target) { // allow connections to parent
            return true;
        }
        if (target.getParent() == parent) { // allow if we share the same parent
            return true;
        }
        return false;
    }

    private isConnectionToMe(target: ConstraintWidget, checked: Set<ConstraintWidget>) {
        if (checked.has(target)) {
            return false;
        }
        checked.add(target);

        if (target == this.getOwner()) {
            return true;
        }
        let targetAnchors = target.getAnchors();
        for (let i = 0, targetAnchorsSize = targetAnchors.length; i < targetAnchorsSize; i++) {
            let anchor = targetAnchors[i]
            if (anchor.isSimilarDimensionConnection(this) && anchor.isConnected()) {
                if (this.isConnectionToMe(anchor.getTarget()!.getOwner(), checked)) {
                    return true;
                }
            }
        }
        return false;
    }

    public getOpposite(): ConstraintAnchor | null {
        switch (this.mType) {
            case ConstraintAnchorType.LEFT: {
                return this.mOwner.mRight;
            }
            case ConstraintAnchorType.RIGHT: {
                return this.mOwner.mLeft;
            }
            case ConstraintAnchorType.TOP: {
                return this.mOwner.mBottom;
            }
            case ConstraintAnchorType.BOTTOM: {
                return this.mOwner.mTop;
            }
            case ConstraintAnchorType.BASELINE:
            case ConstraintAnchorType.CENTER:
            case ConstraintAnchorType.CENTER_X:
            case ConstraintAnchorType.CENTER_Y:
            case ConstraintAnchorType.NONE:
                return null;
        }
        throw new AssertionError(this.mType);
    }
}