import {ConstraintWidget, DimensionBehaviour} from "./ConstraintWidget";
import {LinearSystem} from "./LinearSystem";
import {Arrays} from "./utils";
import {ConstraintWidgetContainer} from "./ConstraintWidgetContainer";
import {Chain} from "./Chain";

export class MeasureResult {
    mWidgetRef: WeakRef<ConstraintWidget>
    mLeft
    mTop
    mRight
    mBottom
    mBaseline
    mOrientation

    constructor(widget: ConstraintWidget, system: LinearSystem, orientation: number) {
        this.mWidgetRef = new WeakRef(widget);
        this.mLeft = system.getObjectVariableValue(widget.mLeft);
        this.mTop = system.getObjectVariableValue(widget.mTop);
        this.mRight = system.getObjectVariableValue(widget.mRight);
        this.mBottom = system.getObjectVariableValue(widget.mBottom);
        this.mBaseline = system.getObjectVariableValue(widget.mBaseline);
        this.mOrientation = orientation;
    }

    public apply() {
        let widget = this.mWidgetRef.deref()
        if (widget != null) {
            widget.setFinalFrame(this.mLeft, this.mTop, this.mRight, this.mBottom, this.mBaseline, this.mOrientation);
        }
    }
}

export class WidgetGroup {
    private static readonly DEBUG = false
    mWidgets: ConstraintWidget[] = []
    static sCount = 0;
    mId = -1;
    mAuthoritative = false;
    mOrientation = ConstraintWidget.HORIZONTAL;
    mResults: MeasureResult[] | null = null;
    private mMoveTo = -1;

    constructor(orientation: number) {
        this.mId = WidgetGroup.sCount++;
        this.mOrientation = orientation;
    }

    public getOrientation() {
        return this.mOrientation;
    }

    public getId() {
        return this.mId;
    }

    add(widget: ConstraintWidget) {
        if (this.mWidgets.includes(widget)) {
            return false;
        }
        this.mWidgets.push(widget);
        return true;
    }

    setAuthoritative(isAuthoritative: boolean) {
        this.mAuthoritative = isAuthoritative
    }

    isAuthoritative() {
        return this.mAuthoritative
    }

    getOrientationString() {
        if (this.mOrientation == ConstraintWidget.HORIZONTAL) {
            return "Horizontal";
        } else if (this.mOrientation == ConstraintWidget.VERTICAL) {
            return "Vertical";
        } else if (this.mOrientation == ConstraintWidget.BOTH) {
            return "Both";
        }
        return "Unknown";
    }

    toString() {
        let ret = this.getOrientationString() + " [" + this.mId + "] <";
        for (let widget of this.mWidgets) {
            ret += " " + widget.getDebugName();
        }
        ret += " >";
        return ret;
    }

    moveTo(orientation: number, widgetGroup: WidgetGroup) {
        for (let widget of this.mWidgets) {
            widgetGroup.add(widget);
            if (orientation == ConstraintWidget.HORIZONTAL) {
                widget.horizontalGroup = widgetGroup.getId();
            } else {
                widget.verticalGroup = widgetGroup.getId();
            }
        }
        this.mMoveTo = widgetGroup.mId;
    }

    public clear() {
        this.mWidgets = []
    }

    measureWrap(orientation: number, widget: ConstraintWidget) {
        let behaviour = widget.getDimensionBehaviour(orientation);
        if (behaviour == DimensionBehaviour.WRAP_CONTENT
            || behaviour == DimensionBehaviour.MATCH_PARENT
            || behaviour == DimensionBehaviour.FIXED) {
            let dimension;
            if (orientation == ConstraintWidget.HORIZONTAL) {
                dimension = widget.getWidth();
            } else {
                dimension = widget.getHeight();
            }
            return dimension;
        }
        return -1;
    }

    public measureWrapSystem(system: LinearSystem, orientation: number) {
        let count = this.mWidgets.length
        if (count == 0) {
            return 0;
        }
        // TODO: add direct wrap computation for simpler cases instead of calling the solver
        return this.solverMeasure(system, this.mWidgets, orientation);
    }

    private solverMeasure(system: LinearSystem,
                          widgets: ConstraintWidget[],
                          orientation: number) {
        let container = widgets[0].getParent() as ConstraintWidgetContainer
        system.reset();
        let prevDebug = LinearSystem.FULL_DEBUG;
        container.addToSolver(system, false);
        for (let i = 0; i < widgets.length; i++) {
            let widget = widgets[i]
            widget.addToSolver(system, false);
        }
        if (orientation == ConstraintWidget.HORIZONTAL) {
            if (container.mHorizontalChainsSize > 0) {
                Chain.applyChainConstraints(container, system, widgets, ConstraintWidget.HORIZONTAL);
            }
        }
        if (orientation == ConstraintWidget.VERTICAL) {
            if (container.mVerticalChainsSize > 0) {
                Chain.applyChainConstraints(container, system, widgets, ConstraintWidget.VERTICAL);
            }
        }

        try {
            system.minimize();
        } catch (e: any) {
            //TODO remove fancy version of e.printStackTrace()
        }

// save results
        this.mResults = []
        for (let i = 0; i < widgets.length; i++) {
            let widget = widgets[i]
            let result = new MeasureResult(widget, system, orientation);
            this.mResults.push(result);
        }

        if (orientation == ConstraintWidget.HORIZONTAL) {
            let left = system.getObjectVariableValue(container.mLeft);
            let right = system.getObjectVariableValue(container.mRight);
            system.reset();
            return right - left;
        } else {
            let top = system.getObjectVariableValue(container.mTop);
            let bottom = system.getObjectVariableValue(container.mBottom);
            system.reset();
            return bottom - top;
        }
    }

    public setOrientation(orientation: number) {
        this.mOrientation = orientation;
    }

// @TODO: add description
    public apply() {
        if (this.mResults == null) {
            return;
        }
        if (!this.mAuthoritative) {
            return;
        }
        for (let i = 0; i < this.mResults.length; i++) {
            let result = this.mResults[i]
            result.apply();
        }
    }

// @TODO: add description
    public intersectWith(group: WidgetGroup) {
        for (let i = 0; i < this.mWidgets.length; i++) {
            let widget = this.mWidgets[i]
            if (group.contains(widget)) {
                return true;
            }
        }
        return false;
    }

    private contains(widget: ConstraintWidget) {
        return this.mWidgets.includes(widget);
    }

// @TODO: add description
    public size() {
        return this.mWidgets.length
    }

// @TODO: add description
    public cleanup(dependencyLists: WidgetGroup []) {
        const count = this.mWidgets.length
        if (this.mMoveTo != -1 && count > 0) {
            for (let i = 0; i < dependencyLists.length; i++) {
                let group = dependencyLists[i]
                if (this.mMoveTo == group.mId) {
                    this.moveTo(this.mOrientation, group);
                }
            }
        }
        if (count == 0) {
            Arrays.remove(dependencyLists, this) //dependencyLists.remove(this);
            return;
        }
    }

}