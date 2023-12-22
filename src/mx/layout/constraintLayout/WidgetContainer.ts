import {WidgetGroup} from "./WidgetGroup";
import {ConstraintWidget} from "./ConstraintWidget";
import {ConstraintWidgetContainer} from "./ConstraintWidgetContainer";
import {Arrays} from "./utils";
import {Cache} from "./Cache";

export class WidgetContainer extends ConstraintWidget{
    mChildren: ConstraintWidget[] = []

    constructor(x?: number, y?: number, width?: number, height?: number) {
        super(x, y, width, height);
    }

    reset() {
        this.mChildren = []

        super.reset()
    }

    add (widget: ConstraintWidget) {
        this.mChildren.push(widget);
        if (widget.getParent() != null) {
            let container = widget.getParent() as WidgetContainer
            container.remove(widget);
        }
        widget.setParent(this);
    }

    addAll (...widgets: ConstraintWidget[]) {
        const count = widgets.length

        for (let i = 0; i < count; i ++) {
            this.add(widgets[i])
        }
    }

    remove (widget : ConstraintWidget) {
        Arrays.remove(this.mChildren, widget) //mChildren.remove(widget);
        widget.reset();
    }

    public getChildren() {
        return this.mChildren;
    }

    /**
     * Return the top-level ConstraintWidgetContainer
     *
     * @return top-level ConstraintWidgetContainer
     */
    public getRootConstraintContainer() {
        let item: ConstraintWidget = this;
        let parent = item.getParent();
        let container = null;
        if (item instanceof ConstraintWidgetContainer) {
            container = this as unknown as ConstraintWidgetContainer
        }
        while (parent != null) {
            item = parent;
            parent = item.getParent();
            if (item instanceof ConstraintWidgetContainer) {
                container = item as ConstraintWidgetContainer
            }
        }
        return container;
    }

    setOffset(x: number, y: number) {
        super.setOffset(x, y);

        const count = this.mChildren.length
        for (let i = 0; i < count; i++) {
            let widget = this.mChildren[i]
            widget.setOffset(this.getRootX(), this.getRootY())
        }
    }

    layout () {
        if (this.mChildren == null) {
            return;
        }
        const count = this.mChildren.length
        for (let i = 0; i < count; i++) {
            let widget = this.mChildren[i]
            if (widget instanceof WidgetContainer) {
                (widget as WidgetContainer).layout();
            }
        }
    }

    resetSolverVariables(cache: Cache) {
        super.resetSolverVariables(cache);

        const count = this.mChildren.length
        for (let i = 0; i < count; i++) {
            let widget = this.mChildren[i]
            widget.resetSolverVariables(cache);
        }
    }

    public removeAllChildren() {
        this.mChildren = []
    }
}