import {WidgetRun} from "./WidgetRun";
import {ConstraintWidget, DimensionBehaviour} from "./ConstraintWidget";
import {ConstraintWidgetContainer} from "./ConstraintWidgetContainer";
import {Dependency} from "./Dependency";

export class ChainRun extends WidgetRun{
    mWidgets: WidgetRun[] = []
    private mChainStyle: number = 0

    constructor(widget: ConstraintWidget, orientation: number) {
        super(widget);

        this.orientation = orientation

        this.build ()
    }

    toString () {
        let log = ["ChainRun "]
        log.push((this.orientation == ConstraintWidget.HORIZONTAL ? "horizontal : " : "vertical : "));
        for (let run of this.mWidgets) {
            log.push("<");
            log.push(`${run}`);
            log.push("> ");
        }
        return log.toString();
    }

    supportsWrapComputation(): boolean {
        const count = this.mWidgets.length
        for (let i = 0; i < count; i++) {
            let run = this.mWidgets[i]
            if (!run.supportsWrapComputation!()) {
                return false;
            }
        }
        return true;
    }

    getWrapDimension(): number | number {
        const count = this.mWidgets.length
        let wrapDimension = 0;
        for (let i = 0; i < count; i++) {
            let run = this.mWidgets[i]
            wrapDimension += run.start.mMargin;
            wrapDimension += run.getWrapDimension();
            wrapDimension += run.end.mMargin;
        }
        return wrapDimension;
    }

    private build() {
        let current = this.mWidget;
        let previous = current.getPreviousChainMember(this.orientation);
        while (previous != null) {
            current = previous;
            previous = current.getPreviousChainMember(this.orientation);
        }
        this.mWidget = current; // first element of the chain
        this.mWidgets.push(current.getRun(this.orientation)!);
        let next = current.getNextChainMember(this.orientation);
        while (next != null) {
            current = next;
            this.mWidgets.push(current.getRun(this.orientation)!);
            next = current.getNextChainMember(this.orientation);
        }
        for (let run of this.mWidgets) {
            if (this.orientation == ConstraintWidget.HORIZONTAL) {
                run.mWidget.horizontalChainRun = this;
            } else if (this.orientation == ConstraintWidget.VERTICAL) {
                run.mWidget.verticalChainRun = this;
            }
        }
        let isInRtl = (this.orientation ==ConstraintWidget.HORIZONTAL)
            && (this.mWidget.getParent() as ConstraintWidgetContainer).isRtl();
        if (isInRtl && this.mWidgets.length > 1) {
            this.mWidget = this.mWidgets[this.mWidgets.length - 1].mWidget;
        }
        this.mChainStyle = this.orientation == ConstraintWidget.HORIZONTAL
            ? this.mWidget.getHorizontalChainStyle() : this.mWidget.getVerticalChainStyle();
    }

    clear() {
        this.mRunGroup = null
        for (let run of this.mWidgets) {
            run.clear!()
        }
    }

    reset() {
        this.start.resolved = false
        this.end.resolved = false
    }

    update(dependency: Dependency) {
        if (!(this.start.resolved && this.end.resolved)) {
            return;
        }

        let parent = this.mWidget.getParent();
        let isInRtl = false;
        if (parent instanceof ConstraintWidgetContainer) {
            isInRtl = (parent as ConstraintWidgetContainer).isRtl();
        }
        let distance = this.end.value - this.start.value;
        let size = 0;
        let numMatchConstraints = 0;
        let weights = 0;
        let numVisibleWidgets = 0;
        const count = this.mWidgets.length
        // let's find the first visible widget...
        let firstVisibleWidget = -1;
        for (let i = 0; i < count; i++) {
            let run = this.mWidgets[i]
            if (run.mWidget.getVisibility() == ConstraintWidget.GONE) {
                continue;
            }
            firstVisibleWidget = i;
            break;
        }
        // now the last visible widget...
        let lastVisibleWidget = -1;
        for (let i = count - 1; i >= 0; i--) {
            let run = this.mWidgets[i]
            if (run.mWidget.getVisibility() == ConstraintWidget.GONE) {
                continue;
            }
            lastVisibleWidget = i;
            break;
        }
        for (let j = 0; j < 2; j++) {
            for (let i = 0; i < count; i++) {
                let run = this.mWidgets[i]
                if (run.mWidget.getVisibility() == ConstraintWidget.GONE) {
                    continue;
                }
                numVisibleWidgets++;
                if (i > 0 && i >= firstVisibleWidget) {
                    size += run.start.mMargin;
                }
                let dimension = run.mDimension.value;
                let treatAsFixed = run.mDimensionBehavior != DimensionBehaviour.MATCH_CONSTRAINT;
                if (treatAsFixed) {
                    if (this.orientation == ConstraintWidget.HORIZONTAL
                        && !run.mWidget.mHorizontalRun!.mDimension.resolved) {
                        return;
                    }
                    if (this.orientation == ConstraintWidget.VERTICAL && !run.mWidget.mVerticalRun!.mDimension.resolved) {
                        return;
                    }
                } else if (run.matchConstraintsType == ConstraintWidget.MATCH_CONSTRAINT_WRAP && j == 0) {
                    treatAsFixed = true;
                    dimension = run.mDimension.wrapValue;
                    numMatchConstraints++;
                } else if (run.mDimension.resolved) {
                    treatAsFixed = true;
                }
                if (!treatAsFixed) { // only for the first pass
                    numMatchConstraints++;
                    let weight = run.mWidget.mWeight[this.orientation];
                    if (weight >= 0) {
                        weights += weight;
                    }
                } else {
                    size += dimension;
                }
                if (i < count - 1 && i < lastVisibleWidget) {
                    size += -run.end.mMargin;
                }
            }
            if (size < distance || numMatchConstraints == 0) {
                break; // we are good to go!
            }
            // otherwise, let's do another pass with using match_constraints
            numVisibleWidgets = 0;
            numMatchConstraints = 0;
            size = 0;
            weights = 0;
        }

        let position = this.start.value;
        if (isInRtl) {
            position = this.end.value;
        }
        if (size > distance) {
            if (isInRtl) {
                position += Math.round(0.5 + (size - distance) / 2);
            } else {
                position -= Math.round(0.5 + (size - distance) / 2);
            }
        }
        let matchConstraintsDimension = 0;
        if (numMatchConstraints > 0) {
            matchConstraintsDimension = Math.round(0.5 + (distance - size) / numMatchConstraints);

            let appliedLimits = 0;
            for (let i = 0; i < count; i++) {
                let run = this.mWidgets[i]
                if (run.mWidget.getVisibility() == ConstraintWidget.GONE) {
                    continue;
                }
                if (run.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT && !run.mDimension.resolved) {
                    let dimension = matchConstraintsDimension;
                    if (weights > 0) {
                        let weight = run.mWidget.mWeight[this.orientation];
                        dimension = Math.round(0.5 + weight * (distance - size) / weights);
                    }
                    let max;
                    let min;
                    let value = dimension;
                    if (this.orientation == ConstraintWidget.HORIZONTAL) {
                        max = run.mWidget.mMatchConstraintMaxWidth;
                        min = run.mWidget.mMatchConstraintMinWidth;
                    } else {
                        max = run.mWidget.mMatchConstraintMaxHeight;
                        min = run.mWidget.mMatchConstraintMinHeight;
                    }
                    if (run.matchConstraintsType == ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
                        value = Math.min(value, run.mDimension.wrapValue);
                    }
                    value = Math.max(min, value);
                    if (max > 0) {
                        value = Math.min(max, value);
                    }
                    if (value != dimension) {
                        appliedLimits++;
                        dimension = value;
                    }
                    run.mDimension.resolve(dimension);
                }
            }
            if (appliedLimits > 0) {
                numMatchConstraints -= appliedLimits;
                // we have to recompute the sizes
                size = 0;
                for (let i = 0; i < count; i++) {
                    let run = this.mWidgets[i]
                    if (run.mWidget.getVisibility() == ConstraintWidget.GONE) {
                        continue;
                    }
                    if (i > 0 && i >= firstVisibleWidget) {
                        size += run.start.mMargin;
                    }
                    size += run.mDimension.value;
                    if (i < count - 1 && i < lastVisibleWidget) {
                        size += -run.end.mMargin;
                    }
                }
            }
            if (this.mChainStyle == ConstraintWidget.CHAIN_PACKED && appliedLimits == 0) {
                this.mChainStyle = ConstraintWidget.CHAIN_SPREAD;
            }
        }

        if (size > distance) {
            this.mChainStyle = ConstraintWidget.CHAIN_PACKED;
        }

        if (numVisibleWidgets > 0 && numMatchConstraints == 0
            && firstVisibleWidget == lastVisibleWidget) {
            // only one widget of fixed size to display...
            this.mChainStyle = ConstraintWidget.CHAIN_PACKED;
        }

        if (this.mChainStyle == ConstraintWidget.CHAIN_SPREAD_INSIDE) {
            let gap = 0;
            if (numVisibleWidgets > 1) {
                gap = (distance - size) / (numVisibleWidgets - 1);
            } else if (numVisibleWidgets == 1) {
                gap = (distance - size) / 2;
            }
            if (numMatchConstraints > 0) {
                gap = 0;
            }
            for (let i = 0; i < count; i++) {
                let index = i;
                if (isInRtl) {
                    index = count - (i + 1);
                }
                let run = this.mWidgets[index]
                if (run.mWidget.getVisibility() == ConstraintWidget.GONE) {
                    run.start.resolve(position);
                    run.end.resolve(position);
                    continue;
                }
                if (i > 0) {
                    if (isInRtl) {
                        position -= gap;
                    } else {
                        position += gap;
                    }
                }
                if (i > 0 && i >= firstVisibleWidget) {
                    if (isInRtl) {
                        position -= run.start.mMargin;
                    } else {
                        position += run.start.mMargin;
                    }
                }

                if (isInRtl) {
                    run.end.resolve(position);
                } else {
                    run.start.resolve(position);
                }

                let dimension = run.mDimension.value;
                if (run.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT
                    && run.matchConstraintsType == ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
                    dimension = run.mDimension.wrapValue;
                }
                if (isInRtl) {
                    position -= dimension;
                } else {
                    position += dimension;
                }

                if (isInRtl) {
                    run.start.resolve(position);
                } else {
                    run.end.resolve(position);
                }
                run.mResolved = true;
                if (i < count - 1 && i < lastVisibleWidget) {
                    if (isInRtl) {
                        position -= -run.end.mMargin;
                    } else {
                        position += -run.end.mMargin;
                    }
                }
            }
        } else if (this.mChainStyle == ConstraintWidget.CHAIN_SPREAD) {
            let gap = (distance - size) / (numVisibleWidgets + 1);
            if (numMatchConstraints > 0) {
                gap = 0;
            }
            for (let i = 0; i < count; i++) {
                let index = i;
                if (isInRtl) {
                    index = count - (i + 1);
                }
                let run = this.mWidgets[index]
                if (run.mWidget.getVisibility() == ConstraintWidget.GONE) {
                    run.start.resolve(position);
                    run.end.resolve(position);
                    continue;
                }
                if (isInRtl) {
                    position -= gap;
                } else {
                    position += gap;
                }
                if (i > 0 && i >= firstVisibleWidget) {
                    if (isInRtl) {
                        position -= run.start.mMargin;
                    } else {
                        position += run.start.mMargin;
                    }
                }

                if (isInRtl) {
                    run.end.resolve(position);
                } else {
                    run.start.resolve(position);
                }

                let dimension = run.mDimension.value;
                if (run.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT
                    && run.matchConstraintsType == ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
                    dimension = Math.min(dimension, run.mDimension.wrapValue);
                }

                if (isInRtl) {
                    position -= dimension;
                } else {
                    position += dimension;
                }

                if (isInRtl) {
                    run.start.resolve(position);
                } else {
                    run.end.resolve(position);
                }
                if (i < count - 1 && i < lastVisibleWidget) {
                    if (isInRtl) {
                        position -= -run.end.mMargin;
                    } else {
                        position += -run.end.mMargin;
                    }
                }
            }
        } else if (this.mChainStyle == ConstraintWidget.CHAIN_PACKED) {
            let bias = (this.orientation == ConstraintWidget.HORIZONTAL) ? this.mWidget.getHorizontalBiasPercent()
                : this.mWidget.getVerticalBiasPercent();
            if (isInRtl) {
                bias = 1 - bias;
            }
            let gap = Math.round(0.5 + (distance - size) * bias);
            if (gap < 0 || numMatchConstraints > 0) {
                gap = 0;
            }
            if (isInRtl) {
                position -= gap;
            } else {
                position += gap;
            }
            for (let i = 0; i < count; i++) {
                let index = i;
                if (isInRtl) {
                    index = count - (i + 1);
                }
                let run = this.mWidgets[index]
                if (run.mWidget.getVisibility() == ConstraintWidget.GONE) {
                    run.start.resolve(position);
                    run.end.resolve(position);
                    continue;
                }
                if (i > 0 && i >= firstVisibleWidget) {
                    if (isInRtl) {
                        position -= run.start.mMargin;
                    } else {
                        position += run.start.mMargin;
                    }
                }
                if (isInRtl) {
                    run.end.resolve(position);
                } else {
                    run.start.resolve(position);
                }

                let dimension = run.mDimension.value;
                if (run.mDimensionBehavior == DimensionBehaviour.MATCH_CONSTRAINT
                    && run.matchConstraintsType == ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
                    dimension = run.mDimension.wrapValue;
                }
                if (isInRtl) {
                    position -= dimension;
                } else {
                    position += dimension;
                }

                if (isInRtl) {
                    run.start.resolve(position);
                } else {
                    run.end.resolve(position);
                }
                if (i < count - 1 && i < lastVisibleWidget) {
                    if (isInRtl) {
                        position -= -run.end.mMargin;
                    } else {
                        position += -run.end.mMargin;
                    }
                }
            }
        }
    }

    applyToWidget() {
        for (let i = 0; i < this.mWidgets.length; i++) {
            let run = this.mWidgets[i]
            run.applyToWidget!();
        }
    }

    getFirstVisibleWidget () {
        for (let i = 0; i < this.mWidgets.length; i++) {
            let run = this.mWidgets[i]
            if (run.mWidget.getVisibility() != ConstraintWidget.GONE) {
                return run.mWidget;
            }
        }
        return null;
    }

    getLastVisibleWidget () {
        for (let i = this.mWidgets.length - 1; i >= 0; i--) {
            let run = this.mWidgets[i]
            if (run.mWidget.getVisibility() != ConstraintWidget.GONE) {
                return run.mWidget;
            }
        }
        return null;
    }

    apply() {
        for (let run of this.mWidgets) {
            run.apply!();
        }
        let count = this.mWidgets.length
        if (count < 1) {
            return;
        }

        // get the first and last element of the chain
        let firstWidget = this.mWidgets[0].mWidget;
        let lastWidget = this.mWidgets[count - 1].mWidget;

        if (this.orientation == ConstraintWidget.HORIZONTAL) {
            let startAnchor = firstWidget.mLeft;
            let endAnchor = lastWidget.mRight;
            let startTarget = this.getTargetWithOrientation(startAnchor, ConstraintWidget.HORIZONTAL);
            let startMargin = startAnchor.getMargin();
            let firstVisibleWidget = this.getFirstVisibleWidget();
            if (firstVisibleWidget != null) {
                startMargin = firstVisibleWidget.mLeft.getMargin();
            }
            if (startTarget != null) {
                this.addTarget(this.start, startTarget, startMargin);
            }
            let endTarget = this.getTargetWithOrientation(endAnchor, ConstraintWidget.HORIZONTAL);
            let endMargin = endAnchor.getMargin();
            let lastVisibleWidget = this.getLastVisibleWidget();
            if (lastVisibleWidget != null) {
                endMargin = lastVisibleWidget.mRight.getMargin();
            }
            if (endTarget != null) {
                this.addTarget(this.end, endTarget, -endMargin);
            }
        } else {
            let startAnchor = firstWidget.mTop;
            let endAnchor = lastWidget.mBottom;
            let startTarget = this.getTargetWithOrientation(startAnchor, ConstraintWidget.VERTICAL);
            let startMargin = startAnchor.getMargin();
            let firstVisibleWidget = this.getFirstVisibleWidget();
            if (firstVisibleWidget != null) {
                startMargin = firstVisibleWidget.mTop.getMargin();
            }
            if (startTarget != null) {
                this.addTarget(this.start, startTarget, startMargin);
            }
            let endTarget = this.getTargetWithOrientation(endAnchor, ConstraintWidget.VERTICAL);
            let endMargin = endAnchor.getMargin();
            let lastVisibleWidget = this.getLastVisibleWidget();
            if (lastVisibleWidget != null) {
                endMargin = lastVisibleWidget.mBottom.getMargin();
            }
            if (endTarget != null) {
                this.addTarget(this.end, endTarget, -endMargin);
            }
        }
        this.start.updateDelegate = this;
        this.end.updateDelegate = this;
    }
}