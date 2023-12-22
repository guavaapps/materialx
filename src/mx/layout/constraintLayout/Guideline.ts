import {ConstraintWidget, DimensionBehaviour} from "./ConstraintWidget";
import {ConstraintAnchor, ConstraintAnchorType} from "./ConstraintAnchor";
import {LinearSystem} from "./LinearSystem";
import {SolverVariable} from "./SolverVariable";
import {Barrier} from "./Barrier";
import {ConstraintWidgetContainer} from "./ConstraintWidgetContainer";

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