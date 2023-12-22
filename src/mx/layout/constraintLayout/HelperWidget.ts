import {ConstraintWidget} from "./ConstraintWidget";
import {Helper} from "./Helper";
import {Arrays} from "./utils";
import {Grouping} from "./Grouping";
import {WidgetGroup} from "./WidgetGroup";
import {ConstraintWidgetContainer} from "./ConstraintWidgetContainer";

export class HelperWidget extends ConstraintWidget implements Helper {
    mWidgets: (ConstraintWidget | null)[] = new Array(4)
    mWidgetsCount = 0

    updateConstraints(container: ConstraintWidgetContainer) {

    }

    add(widget: ConstraintWidget) {
        if (widget == this || widget == null) {
            return;
        }
        if (this.mWidgetsCount + 1 > this.mWidgets.length) {
            this.mWidgets = Arrays.copy(this.mWidgets, this.mWidgets.length * 2);
        }
        this.mWidgets[this.mWidgetsCount] = widget;
        this.mWidgetsCount++;
    }

    copy(src: ConstraintWidget, map: Map<ConstraintWidget, ConstraintWidget>) {
        super.copy(src, map);

        let srcHelper = src as HelperWidget
        this.mWidgetsCount = 0;
        const count = srcHelper.mWidgetsCount;
        for (let i = 0; i < count; i++) {
            this.add(map.get(srcHelper.mWidgets[i]!)!);
        }
    }

    removeAllIds() {
        this.mWidgetsCount = 0
        this.mWidgets.fill(null)
    }

    addDependents(dependencyLists: WidgetGroup[], orientation: number, group: WidgetGroup) {
        for (let i = 0; i < this.mWidgetsCount; i++) {
            let widget = this.mWidgets[i]!
            group.add(widget);
        }
        for (let i = 0; i < this.mWidgetsCount; i++) {
            let widget = this.mWidgets[i]!
            Grouping.findDependents(widget, orientation, dependencyLists, group);
        }
    }

    findGroupInDependents(orientation: number) {
        for (let i = 0; i < this.mWidgetsCount; i++) {
            let widget = this.mWidgets[i]!
            if (orientation == ConstraintWidget.HORIZONTAL && widget.horizontalGroup != -1) {
                return widget.horizontalGroup;
            }
            if (orientation == ConstraintWidget.VERTICAL && widget.verticalGroup != -1) {
                return widget.verticalGroup;
            }
        }
        return -1;
    }
}