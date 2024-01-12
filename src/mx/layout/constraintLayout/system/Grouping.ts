import {ConstraintWidget, DimensionBehaviour} from "./ConstraintWidget";
import {ConstraintWidgetContainer} from "./ConstraintWidget";
import {Measure, Measurer} from "./ConstraintWidget";
import {Guideline} from "./ConstraintWidget";
import {HelperWidget} from "./ConstraintWidget";
import {Barrier} from "./ConstraintWidget";
import {WidgetGroup} from "./WidgetGroup";
import {ConstraintAnchorType} from "./ConstraintAnchor";
import {Arrays} from "./utils";

export class Grouping {
    private static readonly FORCE_USE = true

    static validInGroup (layoutHorizontal: DimensionBehaviour, layoutVertical: DimensionBehaviour,
                         widgetHorizontal: DimensionBehaviour, widgetVertical: DimensionBehaviour) {

        let fixedHorizontal = widgetHorizontal == DimensionBehaviour.FIXED || widgetHorizontal == DimensionBehaviour.WRAP_CONTENT
            || (widgetHorizontal == DimensionBehaviour.MATCH_PARENT && layoutHorizontal != DimensionBehaviour.WRAP_CONTENT);
        let fixedVertical = widgetVertical == DimensionBehaviour.FIXED || widgetVertical == DimensionBehaviour.WRAP_CONTENT
            || (widgetVertical == DimensionBehaviour.MATCH_PARENT && layoutVertical != DimensionBehaviour.WRAP_CONTENT);
        if (fixedHorizontal || fixedVertical) {
            return true;
        }
        return false;
    }

    static simpleSolvingPass(layout: ConstraintWidgetContainer, measurer: Measurer | null) {
        let children = layout.getChildren();

        const count = children.length

        let verticalGuidelines: Guideline[] | null = null;
        let horizontalGuidelines: Guideline[] | null = null;
        let horizontalBarriers: HelperWidget[] | null = null;
        let verticalBarriers: HelperWidget[] | null = null;
        let isolatedHorizontalChildren: ConstraintWidget[] | null = null;
        let isolatedVerticalChildren: ConstraintWidget[] | null = null;

        for (let i = 0; i < count; i++) {
            let child = children[i]
            if (!Grouping.validInGroup(layout.getHorizontalDimensionBehaviour(),
                layout.getVerticalDimensionBehaviour(),
                child.getHorizontalDimensionBehaviour(),
                child.getVerticalDimensionBehaviour())) {
                return false;
            }
            // if (child instanceof Flow) {
            //     return false;
            // }
        }
        for (let i = 0; i < count; i++) {
            let child = children[i]
            if (!Grouping.validInGroup(layout.getHorizontalDimensionBehaviour(),
                layout.getVerticalDimensionBehaviour(),
                child.getHorizontalDimensionBehaviour(),
                child.getVerticalDimensionBehaviour())) {
                ConstraintWidgetContainer.measure(0, child, measurer, layout.mMeasure, Measure.SELF_DIMENSIONS);
            }
            if (child instanceof Guideline) {
                let guideline = child as Guideline
                if (guideline.getOrientation() == ConstraintWidget.HORIZONTAL) {
                    if (horizontalGuidelines == null) {
                        horizontalGuidelines = []
                    }
                    horizontalGuidelines.push(guideline);
                }
                if (guideline.getOrientation() == ConstraintWidget.VERTICAL) {
                    if (verticalGuidelines == null) {
                        verticalGuidelines = []
                    }
                    verticalGuidelines.push(guideline);
                }
            }
            if (child instanceof HelperWidget) {
                if (child instanceof Barrier) {
                    let barrier = child as Barrier
                    if (barrier.getOrientation() == ConstraintWidget.HORIZONTAL) {
                        if (horizontalBarriers == null) {
                            horizontalBarriers = []
                        }
                        horizontalBarriers!.push(barrier);
                    }
                    if (barrier.getOrientation() == ConstraintWidget.VERTICAL) {
                        if (verticalBarriers == null) {
                            verticalBarriers = []
                        }
                        verticalBarriers!.push(barrier);
                    }
                } else {
                    let helper = child as HelperWidget
                    if (horizontalBarriers == null) {
                        horizontalBarriers = []
                    }
                    horizontalBarriers.push(helper);
                    if (verticalBarriers == null) {
                        verticalBarriers = []
                    }
                    verticalBarriers.push(helper);
                }
            }
            if (child.mLeft.mTarget == null && child.mRight.mTarget == null
                && !(child instanceof Guideline) && !(child instanceof Barrier)) {
                if (isolatedHorizontalChildren == null) {
                    isolatedHorizontalChildren = []
                }
                isolatedHorizontalChildren!.push(child);
            }
            if (child.mTop.mTarget == null && child.mBottom.mTarget == null
                && child.mBaseline.mTarget == null
                && !(child instanceof Guideline) && !(child instanceof Barrier)) {
                if (isolatedVerticalChildren == null) {
                    isolatedVerticalChildren = []
                }
                isolatedVerticalChildren!.push(child);
            }
        }
        let allDependencyLists: WidgetGroup[] = []

        if (Grouping.FORCE_USE || layout.getHorizontalDimensionBehaviour()
            == DimensionBehaviour.WRAP_CONTENT) {
            //horizontalDependencyLists; //new ArrayList<>();
            let dependencyLists = allDependencyLists;

            if (verticalGuidelines != null) {
                for (let guideline of verticalGuidelines) {
                    this.findDependents(guideline, ConstraintWidget.HORIZONTAL, dependencyLists, null);
                }
            }
            if (horizontalBarriers != null) {
                for (let barrier of horizontalBarriers) {
                    let group = this.findDependents(barrier, ConstraintWidget.HORIZONTAL, dependencyLists, null);
                    barrier.addDependents(dependencyLists, ConstraintWidget.HORIZONTAL, group!);
                    group!.cleanup(dependencyLists);
                }
            }

            let left = layout.getAnchor(ConstraintAnchorType.LEFT)!
            if (left.getDependents() != null) {
                for (let first of left.getDependents()!) {
                    this.findDependents(first.mOwner, ConstraintWidget.HORIZONTAL, dependencyLists, null);
                }
            }

            let right = layout.getAnchor(ConstraintAnchorType.RIGHT)!
            if (right.getDependents() != null) {
                for (let first of right.getDependents()!) {
                    this.findDependents(first.mOwner, ConstraintWidget.HORIZONTAL, dependencyLists, null);
                }
            }

            let center = layout.getAnchor(ConstraintAnchorType.CENTER)!
            if (center.getDependents() != null) {
                for (let first of center.getDependents()!) {
                    this.findDependents(first.mOwner, ConstraintWidget.HORIZONTAL, dependencyLists, null);
                }
            }

            if (isolatedHorizontalChildren != null) {
                for (let widget of isolatedHorizontalChildren) {
                    this.findDependents(widget, ConstraintWidget.HORIZONTAL, dependencyLists, null);
                }
            }
        }

        if (Grouping.FORCE_USE || layout.getVerticalDimensionBehaviour()
            == DimensionBehaviour.WRAP_CONTENT) {
            //verticalDependencyLists; //new ArrayList<>();
            let dependencyLists = allDependencyLists;

            if (horizontalGuidelines != null) {
                for (let guideline of horizontalGuidelines) {
                    this.findDependents(guideline, ConstraintWidget.VERTICAL, dependencyLists, null);
                }
            }
            if (verticalBarriers != null) {
                for (let barrier of verticalBarriers) {
                    let group = this.findDependents(barrier, ConstraintWidget.VERTICAL, dependencyLists, null);
                    barrier.addDependents(dependencyLists, ConstraintWidget.VERTICAL, group!);
                    group!.cleanup(dependencyLists);
                }
            }

            let top = layout.getAnchor(ConstraintAnchorType.TOP)!
            if (top.getDependents() != null) {
                for (let first of top.getDependents()!) {
                    this.findDependents(first.mOwner, ConstraintWidget.VERTICAL, dependencyLists, null);
                }
            }

            let baseline = layout.getAnchor(ConstraintAnchorType.BASELINE)!
            if (baseline.getDependents() != null) {
                for (let first of baseline.getDependents()!) {
                    this.findDependents(first.mOwner, ConstraintWidget.VERTICAL, dependencyLists, null);
                }
            }

            let bottom = layout.getAnchor(ConstraintAnchorType.BOTTOM)!
            if (bottom.getDependents() != null) {
                for (let first of bottom.getDependents()!) {
                    this.findDependents(first.mOwner, ConstraintWidget.VERTICAL, dependencyLists, null);
                }
            }

            let center = layout.getAnchor(ConstraintAnchorType.CENTER)!
            if (center.getDependents() != null) {
                for (let first of center.getDependents()!) {
                    this.findDependents(first.mOwner, ConstraintWidget.VERTICAL, dependencyLists, null);
                }
            }

            if (isolatedVerticalChildren != null) {
                for (let widget of isolatedVerticalChildren) {
                    this.findDependents(widget, ConstraintWidget.VERTICAL, dependencyLists, null);
                }
            }
        }
        // Now we may have to merge horizontal/vertical dependencies
        for (let i = 0; i < count; i++) {
            let child = children[i]
            if (child.oppositeDimensionsTied()) {
                let horizontalGroup = this.findGroup(allDependencyLists, child.horizontalGroup);
                let verticalGroup = this.findGroup(allDependencyLists, child.verticalGroup);
                if (horizontalGroup != null && verticalGroup != null) {
                    horizontalGroup.moveTo(ConstraintWidget.HORIZONTAL, verticalGroup);
                    verticalGroup.setOrientation(ConstraintWidget.BOTH);
                    Arrays.remove(allDependencyLists, horizontalGroup) //allDependencyLists.remove(horizontalGroup);
                }
            }
        }

        if (allDependencyLists.length <= 1) {
            return false;
        }

        let horizontalPick = null;
        let verticalPick = null;

        if (layout.getHorizontalDimensionBehaviour()
            == DimensionBehaviour.WRAP_CONTENT) {
            let maxWrap = 0;
            let picked: WidgetGroup | null = null;
            for (let list of allDependencyLists) {
                if (list.getOrientation() == ConstraintWidget.VERTICAL) {
                    continue;
                }
                list.setAuthoritative(false);
                let wrap = list.measureWrapSystem(layout.getSystem(), ConstraintWidget.HORIZONTAL);
                if (wrap > maxWrap) {
                    picked = list;
                    maxWrap = wrap;
                }
            }
            if (picked != null) {
                layout.setHorizontalDimensionBehaviour(DimensionBehaviour.FIXED);
                layout.setWidth(maxWrap);
                picked.setAuthoritative(true);
                horizontalPick = picked;
            }
        }

        if (layout.getVerticalDimensionBehaviour()
            == DimensionBehaviour.WRAP_CONTENT) {
            let maxWrap = 0;
            let picked: WidgetGroup | null = null;
            for (let list of allDependencyLists) {
                if (list.getOrientation() == ConstraintWidget.HORIZONTAL) {
                    continue;
                }
                list.setAuthoritative(false);
                let wrap = list.measureWrapSystem(layout.getSystem(), ConstraintWidget.VERTICAL);
                if (wrap > maxWrap) {
                    picked = list;
                    maxWrap = wrap;
                }
            }
            if (picked != null) {
                layout.setVerticalDimensionBehaviour(DimensionBehaviour.FIXED);
                layout.setHeight(maxWrap);
                picked.setAuthoritative(true);
                verticalPick = picked;
            }
        }
        return horizontalPick != null || verticalPick != null;
    }

    static findGroup(horizontalDependencyLists: WidgetGroup[], groupId: number) {
        const count = horizontalDependencyLists.length
        for (let i = 0; i < count; i++) {
            let group = horizontalDependencyLists[i]
            if (groupId == group.getId()) {
                return group;
            }
        }
        return null;
    }

    static findDependents(constraintWidget: ConstraintWidget, orientation: number, list: WidgetGroup[], group: WidgetGroup | null) {
        let groupId = -1;
        if (orientation == ConstraintWidget.HORIZONTAL) {
            groupId = constraintWidget.horizontalGroup;
        } else {
            groupId = constraintWidget.verticalGroup;
        }

        if (groupId != -1 && (group == null || (groupId != group.getId()))) {
            // already in a group!
            for (let i = 0; i < list.length; i++) {
                let widgetGroup = list[i]
                if (widgetGroup.getId() == groupId) {
                    if (group != null) {
                        group.moveTo(orientation, widgetGroup);
                        Arrays.remove(list, group) //list.remove(group);
                    }
                    group = widgetGroup;
                    break;
                }
            }
        } else if (groupId != -1) {
            return group;
        }
        if (group == null) {
            if (constraintWidget instanceof HelperWidget) {
                let helper = constraintWidget as HelperWidget
                groupId = helper.findGroupInDependents(orientation);
                if (groupId != -1) {
                    for (let i = 0; i < list.length; i++) {
                        let widgetGroup = list[i]
                        if (widgetGroup.getId() == groupId) {
                            group = widgetGroup;
                            break;
                        }
                    }
                }
            }
            if (group == null) {
                group = new WidgetGroup(orientation);
            }
            list.push(group);
        }
        if (group.add(constraintWidget)) {
            if (constraintWidget instanceof Guideline) {
                let guideline = constraintWidget as Guideline
                guideline.getGuidelineAnchor()!.findDependents(guideline.getOrientation()
                == Guideline.HORIZONTAL ? ConstraintWidget.VERTICAL : ConstraintWidget.HORIZONTAL, list, group);
            }
            if (orientation == ConstraintWidget.HORIZONTAL) {
                constraintWidget.horizontalGroup = group.getId();
                constraintWidget.mLeft.findDependents(orientation, list, group);
                constraintWidget.mRight.findDependents(orientation, list, group);
            } else {
                constraintWidget.verticalGroup = group.getId();
                constraintWidget.mTop.findDependents(orientation, list, group);
                constraintWidget.mBaseline.findDependents(orientation, list, group);
                constraintWidget.mBottom.findDependents(orientation, list, group);
            }
            constraintWidget.mCenter.findDependents(orientation, list, group);
        }
        return group;
    }
}