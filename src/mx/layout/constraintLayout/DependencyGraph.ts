import {ConstraintWidgetContainer} from "./ConstraintWidgetContainer";
import {WidgetRun} from "./WidgetRun";
import {Measure, Measurer} from "./BasicMeasure";
import {ConstraintWidget, DimensionBehaviour} from "./ConstraintWidget";
import {Barrier} from "./Barrier";
import {GuidelineReference} from "./GuidelineReference";
import {ChainRun} from "./ChainRun";
import {RunGroup} from "./RunGroup";
import {Guideline} from "./Guideline";
import {HelperReferences} from "./HelperReferences";
import {HelperWidget} from "./HelperWidget";
import {DependencyNode, DependencyNodeType} from "./DependencyNode";
import {VerticalWidgetRun} from "./VerticalWidgetRun";
import {Dependency} from "./Dependency";

export class DependencyGraph {
    private static readonly USE_GROUPS = true;
    private mWidgetcontainer: ConstraintWidgetContainer
    private mNeedBuildGraph = true;
    private mNeedRedoMeasures = true;
    private mContainer: ConstraintWidgetContainer
    private mRuns: WidgetRun[] = []

    constructor(container: ConstraintWidgetContainer) {
        this.mWidgetcontainer = container
        this.mContainer = container
    }

    mMeasurer: Measurer | null = null
    mMeasure: Measure = new Measure()

    setMeasurer(measurer: Measurer) {
        this.mMeasurer = measurer
    }

    computeWrap(container: ConstraintWidgetContainer, orientation: number) {
        const count = this.mGroups.length
        let wrapSize = 0;
        for (let i = 0; i < count; i++) {
            let run = this.mGroups[i]
            let size = run.computeWrapSize(container, orientation);
            wrapSize = Math.max(wrapSize, size);
        }
        return Math.round(wrapSize)
    }

    public defineTerminalWidgets(horizontalBehavior: DimensionBehaviour, verticalBehavior: DimensionBehaviour) {
        if (this.mNeedBuildGraph) {
            this.buildGraph();

            if (DependencyGraph.USE_GROUPS) {
                let hasBarrier = false;
                for (let widget of this.mWidgetcontainer.mChildren) {
                    widget.isTerminalWidget[ConstraintWidget.HORIZONTAL] = true;
                    widget.isTerminalWidget[ConstraintWidget.VERTICAL] = true;
                    if (widget instanceof Barrier) {
                        hasBarrier = true;
                    }
                }
                if (!hasBarrier) {
                    for (let group of this.mGroups) {
                        group.defineTerminalWidgets(horizontalBehavior == DimensionBehaviour.WRAP_CONTENT,
                            verticalBehavior == DimensionBehaviour.WRAP_CONTENT);
                    }
                }
            }
        }
    }


    directMeasure(optimizeWrap: boolean) {
        optimizeWrap &&= DependencyGraph.USE_GROUPS;

        if (this.mNeedBuildGraph || this.mNeedRedoMeasures) {
            for (let widget of this.mWidgetcontainer.mChildren) {
                widget.ensureWidgetRuns();
                widget.measured = false;
                widget.mHorizontalRun.reset();
                widget.mVerticalRun.reset();
            }
            this.mWidgetcontainer.ensureWidgetRuns();
            this.mWidgetcontainer.measured = false;
            this.mWidgetcontainer.mHorizontalRun.reset();
            this.mWidgetcontainer.mVerticalRun.reset();
            this.mNeedRedoMeasures = false;
        }

        let avoid = this.basicMeasureWidgets(this.mContainer);
        if (avoid) {
            return false;
        }

        this.mWidgetcontainer.setX(0);
        this.mWidgetcontainer.setY(0);

        let originalHorizontalDimension =
            this.mWidgetcontainer.getDimensionBehaviour(ConstraintWidget.HORIZONTAL);
        let originalVerticalDimension =
            this.mWidgetcontainer.getDimensionBehaviour(ConstraintWidget.VERTICAL);

        if (this.mNeedBuildGraph) {
            this.buildGraph();
        }

        let x1 = this.mWidgetcontainer.getX();
        let y1 = this.mWidgetcontainer.getY();

        this.mWidgetcontainer.mHorizontalRun.start.resolve(x1);
        this.mWidgetcontainer.mVerticalRun.start.resolve(y1);

        // Let's do the easy steps first -- anything that can be immediately measured
        // Whatever is left for the dimension will be match_constraints.
        this.measureWidgets();

        // If we have to support wrap, let's see if we can compute it directly
        if (originalHorizontalDimension == DimensionBehaviour.WRAP_CONTENT
            || originalVerticalDimension == DimensionBehaviour.WRAP_CONTENT) {
            if (optimizeWrap) {
                for (let run of this.mRuns) {
                    if (!run.supportsWrapComputation!()) {
                        optimizeWrap = false;
                        break;
                    }
                }
            }

            if (optimizeWrap && originalHorizontalDimension == DimensionBehaviour.WRAP_CONTENT) {
                this.mWidgetcontainer.setHorizontalDimensionBehaviour(DimensionBehaviour.FIXED);
                this.mWidgetcontainer.setWidth(this.computeWrap(this.mWidgetcontainer, ConstraintWidget.HORIZONTAL));
                this.mWidgetcontainer.mHorizontalRun.mDimension.resolve(this.mWidgetcontainer.getWidth());
            }
            if (optimizeWrap && originalVerticalDimension == DimensionBehaviour.WRAP_CONTENT) {
                this.mWidgetcontainer.setVerticalDimensionBehaviour(DimensionBehaviour.FIXED);
                this.mWidgetcontainer.setHeight(this.computeWrap(this.mWidgetcontainer, ConstraintWidget.VERTICAL));
                this.mWidgetcontainer.mVerticalRun.mDimension.resolve(this.mWidgetcontainer.getHeight());
            }
        }

        let checkRoot = false;

        // Now, depending on our own dimension behavior, we may want to solve
        // one dimension before the other

        if (this.mWidgetcontainer.mListDimensionBehaviors[ConstraintWidget.HORIZONTAL]
            == DimensionBehaviour.FIXED
            || this.mWidgetcontainer.mListDimensionBehaviors[ConstraintWidget.HORIZONTAL]
            == DimensionBehaviour.MATCH_PARENT) {

            // solve horizontal dimension
            let x2 = x1 + this.mWidgetcontainer.getWidth();
            this.mWidgetcontainer.mHorizontalRun.end.resolve(x2);
            this.mWidgetcontainer.mHorizontalRun.mDimension.resolve(x2 - x1);
            this.measureWidgets();
            if (this.mWidgetcontainer.mListDimensionBehaviors[ConstraintWidget.VERTICAL] == DimensionBehaviour.FIXED
                || this.mWidgetcontainer.mListDimensionBehaviors[ConstraintWidget.VERTICAL] == DimensionBehaviour.MATCH_PARENT) {
                let y2 = y1 + this.mWidgetcontainer.getHeight();
                this.mWidgetcontainer.mVerticalRun.end.resolve(y2);
                this.mWidgetcontainer.mVerticalRun.mDimension.resolve(y2 - y1);
            }
            this.measureWidgets();
            checkRoot = true;
        } else {
            // we'll bail out to the solver...
        }

        // Let's apply what we did resolve
        for (let run of this.mRuns) {
            if (run.mWidget == this.mWidgetcontainer && !run.mResolved) {
                continue;
            }
            run.applyToWidget!();
        }

        let allResolved = true;
        for (let run of this.mRuns) {
            if (!checkRoot && run.mWidget == this.mWidgetcontainer) {
                continue;
            }
            if (!run.start.resolved) {
                allResolved = false;
                break;
            }
            if (!run.end.resolved && !(run instanceof GuidelineReference)) {
                allResolved = false;
                break;
            }
            if (!run.mDimension.resolved
                && !(run instanceof ChainRun) && !(run instanceof GuidelineReference)) {
                allResolved = false;
                break;
            }
        }

        this.mWidgetcontainer.setHorizontalDimensionBehaviour(originalHorizontalDimension);
        this.mWidgetcontainer.setVerticalDimensionBehaviour(originalVerticalDimension);

        return allResolved;
    }

    directMeasureSetup(optimizeWrap: boolean) {
        if (this.mNeedBuildGraph) {
            for (let widget of this.mWidgetcontainer.mChildren) {
                widget.ensureWidgetRuns();
                widget.measured = false;
                widget.mHorizontalRun.mDimension.resolved = false;
                widget.mHorizontalRun.mResolved = false;
                widget.mHorizontalRun.reset();
                widget.mVerticalRun.mDimension.resolved = false;
                widget.mVerticalRun.mResolved = false;
                widget.mVerticalRun.reset();
            }
            this.mWidgetcontainer.ensureWidgetRuns();
            this.mWidgetcontainer.measured = false;
            this.mWidgetcontainer.mHorizontalRun.mDimension.resolved = false;
            this.mWidgetcontainer.mHorizontalRun.mResolved = false;
            this.mWidgetcontainer.mHorizontalRun.reset();
            this.mWidgetcontainer.mVerticalRun.mDimension.resolved = false;
            this.mWidgetcontainer.mVerticalRun.mResolved = false;
            this.mWidgetcontainer.mVerticalRun.reset();
            this.buildGraph();
        }

        let avoid = this.basicMeasureWidgets(this.mContainer);
        if (avoid) {
            return false;
        }

        this.mWidgetcontainer.setX(0);
        this.mWidgetcontainer.setY(0);
        this.mWidgetcontainer.mHorizontalRun.start.resolve(0);
        this.mWidgetcontainer.mVerticalRun.start.resolve(0);
        return true;
    }

// @TODO: add description
    public directMeasureWithOrientation(optimizeWrap: boolean, orientation: number) {
        optimizeWrap &&= DependencyGraph.USE_GROUPS;

        let originalHorizontalDimension = this.mWidgetcontainer.getDimensionBehaviour(ConstraintWidget.HORIZONTAL)
        let originalVerticalDimension = this.mWidgetcontainer.getDimensionBehaviour(ConstraintWidget.VERTICAL)

        let x1 = this.mWidgetcontainer.getX();
        let y1 = this.mWidgetcontainer.getY();

        // If we have to support wrap, let's see if we can compute it directly
        if (optimizeWrap && (originalHorizontalDimension == DimensionBehaviour.WRAP_CONTENT
            || originalVerticalDimension == DimensionBehaviour.WRAP_CONTENT)) {
            for (let run of this.mRuns) {
                if (run.orientation == orientation
                    && !run.supportsWrapComputation!()) {
                    optimizeWrap = false;
                    break;
                }
            }

            if (orientation == ConstraintWidget.HORIZONTAL) {
                if (optimizeWrap && originalHorizontalDimension == DimensionBehaviour.WRAP_CONTENT) {
                    this.mWidgetcontainer.setHorizontalDimensionBehaviour(DimensionBehaviour.FIXED);
                    this.mWidgetcontainer.setWidth(this.computeWrap(this.mWidgetcontainer, ConstraintWidget.HORIZONTAL));
                    this.mWidgetcontainer.mHorizontalRun.mDimension.resolve(this.mWidgetcontainer.getWidth());
                }
            } else {
                if (optimizeWrap && originalVerticalDimension == DimensionBehaviour.WRAP_CONTENT) {
                    this.mWidgetcontainer.setVerticalDimensionBehaviour(DimensionBehaviour.FIXED);
                    this.mWidgetcontainer.setHeight(this.computeWrap(this.mWidgetcontainer, ConstraintWidget.VERTICAL));
                    this.mWidgetcontainer.mVerticalRun.mDimension.resolve(this.mWidgetcontainer.getHeight());
                }
            }
        }

        let checkRoot = false;

        // Now, depending on our own dimension behavior, we may want to solve
        // one dimension before the other

        if (orientation == ConstraintWidget.HORIZONTAL) {
            if (this.mWidgetcontainer.mListDimensionBehaviors[ConstraintWidget.HORIZONTAL] == DimensionBehaviour.FIXED
                || this.mWidgetcontainer.mListDimensionBehaviors[ConstraintWidget.HORIZONTAL] == DimensionBehaviour.MATCH_PARENT) {
                let x2 = x1 + this.mWidgetcontainer.getWidth();
                this.mWidgetcontainer.mHorizontalRun.end.resolve(x2);
                this.mWidgetcontainer.mHorizontalRun.mDimension.resolve(x2 - x1);
                checkRoot = true;
            }
        } else {
            if (this.mWidgetcontainer.mListDimensionBehaviors[ConstraintWidget.VERTICAL] == DimensionBehaviour.FIXED
                || this.mWidgetcontainer.mListDimensionBehaviors[ConstraintWidget.VERTICAL] == DimensionBehaviour.MATCH_PARENT) {
                let y2 = y1 + this.mWidgetcontainer.getHeight();
                this.mWidgetcontainer.mVerticalRun.end.resolve(y2);
                this.mWidgetcontainer.mVerticalRun.mDimension.resolve(y2 - y1);
                checkRoot = true;
            }
        }
        this.measureWidgets();

        // Let's apply what we did resolve
        for (let run of this.mRuns) {
            if (run.orientation != orientation) {
                continue;
            }
            if (run.mWidget == this.mWidgetcontainer && !run.mResolved) {
                continue;
            }
            run.applyToWidget!();
        }

        let allResolved = true;
        for (let run of this.mRuns) {
            if (run.orientation != orientation) {
                continue;
            }
            if (!checkRoot && run.mWidget == this.mWidgetcontainer) {
                continue;
            }
            if (!run.start.resolved) {
                allResolved = false;
                break;
            }
            if (!run.end.resolved) {
                allResolved = false;
                break;
            }
            if (!(run instanceof ChainRun) && !run.mDimension.resolved) {
                allResolved = false;
                break;
            }
        }

        this.mWidgetcontainer.setHorizontalDimensionBehaviour(originalHorizontalDimension);
        this.mWidgetcontainer.setVerticalDimensionBehaviour(originalVerticalDimension);

        return allResolved;
    }

    private measure(widget: ConstraintWidget,
                    horizontalBehavior: DimensionBehaviour,
                    horizontalDimension: number,
                    verticalBehavior: DimensionBehaviour,
                    verticalDimension: number) {

        this.mMeasure.horizontalBehavior = horizontalBehavior;
        this.mMeasure.verticalBehavior = verticalBehavior;
        this.mMeasure.horizontalDimension = horizontalDimension;
        this.mMeasure.verticalDimension = verticalDimension;
        this.mMeasurer!.measure(widget, this.mMeasure);
        widget.setWidth(this.mMeasure.measuredWidth);
        widget.setHeight(this.mMeasure.measuredHeight);
        widget.setHasBaseline(this.mMeasure.measuredHasBaseline);
        widget.setBaselineDistance(this.mMeasure.measuredBaseline);
    }

    private basicMeasureWidgets(constraintWidgetContainer: ConstraintWidgetContainer) {
        for (let widget of constraintWidgetContainer.mChildren) {
            let horizontal = widget.mListDimensionBehaviors[ConstraintWidget.HORIZONTAL];
            let vertical = widget.mListDimensionBehaviors[ConstraintWidget.VERTICAL];

            if (widget.getVisibility() == ConstraintWidget.GONE) {
                widget.measured = true;
                continue;
            }

            if (widget.mMatchConstraintPercentWidth < 1 && horizontal == DimensionBehaviour.MATCH_CONSTRAINT) {
                widget.mMatchConstraintDefaultWidth = ConstraintWidget.MATCH_CONSTRAINT_PERCENT;
            }
            if (widget.mMatchConstraintPercentHeight < 1 && vertical == DimensionBehaviour.MATCH_CONSTRAINT) {
                widget.mMatchConstraintDefaultHeight = ConstraintWidget.MATCH_CONSTRAINT_PERCENT;
            }
            if (widget.getDimensionRatio() > 0) {
                if (horizontal == DimensionBehaviour.MATCH_CONSTRAINT
                    && (vertical == DimensionBehaviour.WRAP_CONTENT || vertical == DimensionBehaviour.FIXED)) {
                    widget.mMatchConstraintDefaultWidth = ConstraintWidget.MATCH_CONSTRAINT_RATIO;
                } else if (vertical == DimensionBehaviour.MATCH_CONSTRAINT
                    && (horizontal == DimensionBehaviour.WRAP_CONTENT || horizontal == DimensionBehaviour.FIXED)) {
                    widget.mMatchConstraintDefaultHeight = ConstraintWidget.MATCH_CONSTRAINT_RATIO;
                } else if (horizontal == DimensionBehaviour.MATCH_CONSTRAINT && vertical == DimensionBehaviour.MATCH_CONSTRAINT) {
                    if (widget.mMatchConstraintDefaultWidth == ConstraintWidget.MATCH_CONSTRAINT_SPREAD) {
                        widget.mMatchConstraintDefaultWidth = ConstraintWidget.MATCH_CONSTRAINT_RATIO;
                    }
                    if (widget.mMatchConstraintDefaultHeight == ConstraintWidget.MATCH_CONSTRAINT_SPREAD) {
                        widget.mMatchConstraintDefaultHeight = ConstraintWidget.MATCH_CONSTRAINT_RATIO;
                    }
                }
            }

            if (horizontal == DimensionBehaviour.MATCH_CONSTRAINT
                && widget.mMatchConstraintDefaultWidth == ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
                if (widget.mLeft.mTarget == null || widget.mRight.mTarget == null) {
                    horizontal = DimensionBehaviour.WRAP_CONTENT;
                }
            }
            if (vertical == DimensionBehaviour.MATCH_CONSTRAINT
                && widget.mMatchConstraintDefaultHeight == ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
                if (widget.mTop.mTarget == null || widget.mBottom.mTarget == null) {
                    vertical = DimensionBehaviour.WRAP_CONTENT;
                }
            }

            widget.mHorizontalRun.mDimensionBehavior = horizontal;
            widget.mHorizontalRun.matchConstraintsType = widget.mMatchConstraintDefaultWidth;
            widget.mVerticalRun.mDimensionBehavior = vertical;
            widget.mVerticalRun.matchConstraintsType = widget.mMatchConstraintDefaultHeight;

            if ((horizontal == DimensionBehaviour.MATCH_PARENT || horizontal == DimensionBehaviour.FIXED || horizontal == DimensionBehaviour.WRAP_CONTENT)
                && (vertical == DimensionBehaviour.MATCH_PARENT
                    || vertical == DimensionBehaviour.FIXED || vertical == DimensionBehaviour.WRAP_CONTENT)) {
                let width = widget.getWidth();
                if (horizontal == DimensionBehaviour.MATCH_PARENT) {
                    width = constraintWidgetContainer.getWidth()
                        - widget.mLeft.mMargin - widget.mRight.mMargin;
                    horizontal = DimensionBehaviour.FIXED;
                }
                let height = widget.getHeight();
                if (vertical == DimensionBehaviour.MATCH_PARENT) {
                    height = constraintWidgetContainer.getHeight()
                        - widget.mTop.mMargin - widget.mBottom.mMargin;
                    vertical = DimensionBehaviour.FIXED;
                }
                this.measure(widget, horizontal, width, vertical, height);
                widget.mHorizontalRun.mDimension.resolve(widget.getWidth());
                widget.mVerticalRun.mDimension.resolve(widget.getHeight());
                widget.measured = true;
                continue;
            }

            if (horizontal == DimensionBehaviour.MATCH_CONSTRAINT && (vertical == DimensionBehaviour.WRAP_CONTENT || vertical == DimensionBehaviour.FIXED)) {
                if (widget.mMatchConstraintDefaultWidth == ConstraintWidget.MATCH_CONSTRAINT_RATIO) {
                    if (vertical == DimensionBehaviour.WRAP_CONTENT) {
                        this.measure(widget, DimensionBehaviour.WRAP_CONTENT, 0, DimensionBehaviour.WRAP_CONTENT, 0);
                    }
                    let height = widget.getHeight();
                    let width = Math.round(height * widget.mDimensionRatio + 0.5);
                    this.measure(widget, DimensionBehaviour.FIXED, width, DimensionBehaviour.FIXED, height);
                    widget.mHorizontalRun.mDimension.resolve(widget.getWidth());
                    widget.mVerticalRun.mDimension.resolve(widget.getHeight());
                    widget.measured = true;
                    continue;
                } else if (widget.mMatchConstraintDefaultWidth == ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
                    this.measure(widget, DimensionBehaviour.WRAP_CONTENT, 0, vertical, 0);
                    widget.mHorizontalRun.mDimension.wrapValue = widget.getWidth();
                    continue;
                } else if (widget.mMatchConstraintDefaultWidth
                    == ConstraintWidget.MATCH_CONSTRAINT_PERCENT) {
                    if (constraintWidgetContainer.mListDimensionBehaviors[ConstraintWidget.HORIZONTAL] == DimensionBehaviour.FIXED
                        || constraintWidgetContainer.mListDimensionBehaviors[ConstraintWidget.HORIZONTAL]
                        == DimensionBehaviour.MATCH_PARENT) {
                        let percent = widget.mMatchConstraintPercentWidth;
                        let width = Math.round(0.5 + percent * constraintWidgetContainer.getWidth());
                        let height = widget.getHeight();
                        this.measure(widget, DimensionBehaviour.FIXED, width, vertical, height);
                        widget.mHorizontalRun.mDimension.resolve(widget.getWidth());
                        widget.mVerticalRun.mDimension.resolve(widget.getHeight());
                        widget.measured = true;
                        continue;
                    }
                } else {
                    // let's verify we have both constraints
                    if (widget.mListAnchors[ConstraintWidget.ANCHOR_LEFT].mTarget == null
                        || widget.mListAnchors[ConstraintWidget.ANCHOR_RIGHT].mTarget == null) {
                        this.measure(widget, DimensionBehaviour.WRAP_CONTENT, 0, vertical, 0);
                        widget.mHorizontalRun.mDimension.resolve(widget.getWidth());
                        widget.mVerticalRun.mDimension.resolve(widget.getHeight());
                        widget.measured = true;
                        continue;
                    }
                }
            }
            if (vertical == DimensionBehaviour.MATCH_CONSTRAINT
                && (horizontal == DimensionBehaviour.WRAP_CONTENT || horizontal == DimensionBehaviour.FIXED)) {
                if (widget.mMatchConstraintDefaultHeight == ConstraintWidget.MATCH_CONSTRAINT_RATIO) {
                    if (horizontal == DimensionBehaviour.WRAP_CONTENT) {
                        this.measure(widget, DimensionBehaviour.WRAP_CONTENT, 0, DimensionBehaviour.WRAP_CONTENT, 0);
                    }
                    let width = widget.getWidth();
                    let ratio = widget.mDimensionRatio;
                    if (widget.getDimensionRatioSide() == ConstraintWidget.UNKNOWN) {
                        ratio = 1 / ratio;
                    }
                    let height = Math.round(width * ratio + 0.5)

                    this.measure(widget, DimensionBehaviour.FIXED, width, DimensionBehaviour.FIXED, height);
                    widget.mHorizontalRun.mDimension.resolve(widget.getWidth());
                    widget.mVerticalRun.mDimension.resolve(widget.getHeight());
                    widget.measured = true;
                    continue;
                } else if (widget.mMatchConstraintDefaultHeight == ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
                    this.measure(widget, horizontal, 0, DimensionBehaviour.WRAP_CONTENT, 0);
                    widget.mVerticalRun.mDimension.wrapValue = widget.getHeight();
                    continue;
                } else if (widget.mMatchConstraintDefaultHeight
                    == ConstraintWidget.MATCH_CONSTRAINT_PERCENT) {
                    if (constraintWidgetContainer.mListDimensionBehaviors[ConstraintWidget.VERTICAL] == DimensionBehaviour.FIXED
                        || constraintWidgetContainer.mListDimensionBehaviors[ConstraintWidget.VERTICAL]
                        == DimensionBehaviour.MATCH_PARENT) {
                        let percent = widget.mMatchConstraintPercentHeight;
                        let width = widget.getWidth();
                        let height = Math.round(0.5 + percent * constraintWidgetContainer.getHeight());
                        this.measure(widget, horizontal, width, DimensionBehaviour.FIXED, height);
                        widget.mHorizontalRun.mDimension.resolve(widget.getWidth());
                        widget.mVerticalRun.mDimension.resolve(widget.getHeight());
                        widget.measured = true;
                        continue;
                    }
                } else {
                    // let's verify we have both constraints
                    if (widget.mListAnchors[ConstraintWidget.ANCHOR_TOP].mTarget == null
                        || widget.mListAnchors[ConstraintWidget.ANCHOR_BOTTOM].mTarget
                        == null) {
                        this.measure(widget, DimensionBehaviour.WRAP_CONTENT, 0, vertical, 0);
                        widget.mHorizontalRun.mDimension.resolve(widget.getWidth());
                        widget.mVerticalRun.mDimension.resolve(widget.getHeight());
                        widget.measured = true;
                        continue;
                    }
                }
            }
            if (horizontal == DimensionBehaviour.MATCH_CONSTRAINT && vertical == DimensionBehaviour.MATCH_CONSTRAINT) {
                if (widget.mMatchConstraintDefaultWidth == ConstraintWidget.MATCH_CONSTRAINT_WRAP
                    || widget.mMatchConstraintDefaultHeight == ConstraintWidget.MATCH_CONSTRAINT_WRAP) {
                    this.measure(widget, DimensionBehaviour.WRAP_CONTENT, 0, DimensionBehaviour.WRAP_CONTENT, 0);
                    widget.mHorizontalRun.mDimension.wrapValue = widget.getWidth();
                    widget.mVerticalRun.mDimension.wrapValue = widget.getHeight();
                } else if (widget.mMatchConstraintDefaultHeight
                    == ConstraintWidget.MATCH_CONSTRAINT_PERCENT
                    && widget.mMatchConstraintDefaultWidth
                    == ConstraintWidget.MATCH_CONSTRAINT_PERCENT
                    && constraintWidgetContainer.mListDimensionBehaviors[ConstraintWidget.HORIZONTAL] == DimensionBehaviour.FIXED
                    && constraintWidgetContainer.mListDimensionBehaviors[ConstraintWidget.VERTICAL] == DimensionBehaviour.FIXED) {
                    let horizPercent = widget.mMatchConstraintPercentWidth;
                    let vertPercent = widget.mMatchConstraintPercentHeight;
                    let width = Math.round(0.5 + horizPercent * constraintWidgetContainer.getWidth());
                    let height = Math.round(0.5 + vertPercent * constraintWidgetContainer.getHeight());
                    this.measure(widget, DimensionBehaviour.FIXED, width, DimensionBehaviour.FIXED, height);
                    widget.mHorizontalRun.mDimension.resolve(widget.getWidth());
                    widget.mVerticalRun.mDimension.resolve(widget.getHeight());
                    widget.measured = true;
                }
            }
        }
        return false;
    }

    measureWidgets() {
        for (let widget of this.mWidgetcontainer.mChildren) {
            if (widget.measured) {
                continue;
            }
            let horiz = widget.mListDimensionBehaviors[ConstraintWidget.HORIZONTAL];
            let vert = widget.mListDimensionBehaviors[ConstraintWidget.VERTICAL];
            let horizMatchConstraintsType = widget.mMatchConstraintDefaultWidth;
            let vertMatchConstraintsType = widget.mMatchConstraintDefaultHeight;

            let horizWrap = horiz == DimensionBehaviour.WRAP_CONTENT
                || (horiz == DimensionBehaviour.MATCH_CONSTRAINT
                    && horizMatchConstraintsType == ConstraintWidget.MATCH_CONSTRAINT_WRAP);

            let vertWrap = vert == DimensionBehaviour.WRAP_CONTENT
                || (vert == DimensionBehaviour.MATCH_CONSTRAINT
                    && vertMatchConstraintsType == ConstraintWidget.MATCH_CONSTRAINT_WRAP);

            let horizResolved = widget.mHorizontalRun.mDimension.resolved;
            let vertResolved = widget.mVerticalRun.mDimension.resolved;

            if (horizResolved && vertResolved) {
                this.measure(widget, DimensionBehaviour.FIXED, widget.mHorizontalRun.mDimension.value,
                    DimensionBehaviour.FIXED, widget.mVerticalRun.mDimension.value);
                widget.measured = true;
            } else if (horizResolved && vertWrap) {
                this.measure(widget, DimensionBehaviour.FIXED, widget.mHorizontalRun.mDimension.value,
                    DimensionBehaviour.WRAP_CONTENT, widget.mVerticalRun.mDimension.value);
                if (vert == DimensionBehaviour.MATCH_CONSTRAINT) {
                    widget.mVerticalRun.mDimension.wrapValue = widget.getHeight();
                } else {
                    widget.mVerticalRun.mDimension.resolve(widget.getHeight());
                    widget.measured = true;
                }
            } else if (vertResolved && horizWrap) {
                this.measure(widget, DimensionBehaviour.WRAP_CONTENT, widget.mHorizontalRun.mDimension.value,
                    DimensionBehaviour.FIXED, widget.mVerticalRun.mDimension.value);
                if (horiz == DimensionBehaviour.MATCH_CONSTRAINT) {
                    widget.mHorizontalRun.mDimension.wrapValue = widget.getWidth();
                } else {
                    widget.mHorizontalRun.mDimension.resolve(widget.getWidth());
                    widget.measured = true;
                }
            }
            if (widget.measured && widget.mVerticalRun.mBaselineDimension != null) {
                widget.mVerticalRun.mBaselineDimension.resolve(widget.getBaselineDistance());
            }
        }
    }

    invalidateGraph() {
        this.mNeedBuildGraph = true
    }

    invalidateMeasures() {
        this.mNeedRedoMeasures = true
    }

    mGroups: RunGroup[] = []

    buildGraph() {
        this.buildGraphWithRuns(this.mRuns)

        if (DependencyGraph.USE_GROUPS) {
            this.mGroups = []
            // Then get the horizontal and vertical groups
            RunGroup.index = 0;
            this.findGroup(this.mWidgetcontainer.mHorizontalRun, ConstraintWidget.HORIZONTAL, this.mGroups);
            this.findGroup(this.mWidgetcontainer.mVerticalRun, ConstraintWidget.VERTICAL, this.mGroups);
        }
        this.mNeedBuildGraph = false;
    }

    buildGraphWithRuns(runs: WidgetRun[]) {
        runs = []
        this.mContainer.mHorizontalRun.clear();
        this.mContainer.mVerticalRun.clear();
        runs.push(this.mContainer.mHorizontalRun);
        runs.push(this.mContainer.mVerticalRun);
        let chainRuns: Set<ChainRun> | null = null;
        for (let widget of this.mContainer.mChildren) {
            if (widget instanceof Guideline) {
                runs.push(new GuidelineReference(widget));
                continue;
            }
            if (widget.isInHorizontalChain()) {
                if (widget.horizontalChainRun == null) {
                    // build the horizontal chain
                    widget.horizontalChainRun = new ChainRun(widget, ConstraintWidget.HORIZONTAL);
                }
                if (chainRuns == null) {
                    chainRuns = new Set<ChainRun>()
                }
                chainRuns.add(widget.horizontalChainRun);
            } else {
                runs.push(widget.mHorizontalRun);
            }
            if (widget.isInVerticalChain()) {
                if (widget.verticalChainRun == null) {
                    // build the vertical chain
                    widget.verticalChainRun = new ChainRun(widget, ConstraintWidget.VERTICAL);
                }
                if (chainRuns == null) {
                    chainRuns = new Set<ChainRun>()
                }
                chainRuns.add(widget.verticalChainRun);
            } else {
                runs.push(widget.mVerticalRun);
            }
            if (widget instanceof HelperWidget) {
                runs.push(new HelperReferences(widget));
            }
        }
        if (chainRuns != null) {
            chainRuns.forEach((it) => runs.push(it))// runs.addAll(chainRuns);
        }
        for (let run of runs) {
            run.clear!();
        }
        for (let run of runs) {
            if (run.mWidget == this.mContainer) {
                continue;
            }
            run.apply!();
        }
    }

    applyGroup(node: DependencyNode, orientation: number, direction: number, end: DependencyNode | null,
               groups: RunGroup[], group: RunGroup | null) {
        let run = node.mRun;
        if (run.mRunGroup != null
            || run == this.mWidgetcontainer.mHorizontalRun || run == this.mWidgetcontainer.mVerticalRun) {
            return;
        }

        if (group == null) {
            group = new RunGroup(run, direction);
            groups.push(group);
        }

        run.mRunGroup = group;
        group.add(run);
        for (let dependent of run.start.mDependencies) {
            if (dependent instanceof DependencyNode) {
                this.applyGroup(dependent as DependencyNode, orientation, RunGroup.START, end, groups, group);
            }
        }
        for (let dependent of run.end.mDependencies) {
            if (dependent instanceof DependencyNode) {
                this.applyGroup(dependent as DependencyNode, orientation, RunGroup.END, end, groups, group);
            }
        }
        if (orientation == ConstraintWidget.VERTICAL && run instanceof VerticalWidgetRun) {
            for (let dependent of (run as VerticalWidgetRun).baseline.mDependencies) {
                if (dependent instanceof DependencyNode) {
                    this.applyGroup(dependent as DependencyNode, orientation, RunGroup.BASELINE, end, groups, group);
                }
            }
        }
        for (let target of run.start.mTargets) {
            if (target == end) {
                group.dual = true;
            }
            this.applyGroup(target, orientation, RunGroup.START, end, groups, group);
        }
        for (let target of run.end.mTargets) {
            if (target == end) {
                group.dual = true;
            }
            this.applyGroup(target, orientation, RunGroup.END, end, groups, group);
        }
        if (orientation == ConstraintWidget.VERTICAL && run instanceof VerticalWidgetRun) {
            for (let target of (run as VerticalWidgetRun).baseline.mTargets) {
                this.applyGroup(target, orientation, RunGroup.BASELINE, end, groups, group);
            }
        }
    }

    private findGroup(run: WidgetRun, orientation: number, groups: RunGroup[]) {
        for (let dependent of run.start.mDependencies) {
            if (dependent instanceof DependencyNode) {
                let node = dependent as DependencyNode;
                this.applyGroup(node, orientation, RunGroup.START, run.end, groups, null);
            } else if (dependent instanceof WidgetRun) {
                let dependentRun = dependent as WidgetRun;
                this.applyGroup(dependentRun.start, orientation, RunGroup.START, run.end, groups, null);
            }
        }
        for (let dependent of run.end.mDependencies) {
            if (dependent instanceof DependencyNode) {
                let node = dependent as DependencyNode
                this.applyGroup(node, orientation, RunGroup.END, run.start, groups, null);
            } else if (dependent instanceof WidgetRun) {
                let dependentRun = dependent as WidgetRun
                this.applyGroup(dependentRun.end, orientation, RunGroup.END, run.start, groups, null);
            }
        }
        if (orientation == ConstraintWidget.VERTICAL) {
            for (let dependent of (run as VerticalWidgetRun).baseline.mDependencies) {
                if (dependent instanceof DependencyNode) {
                    let node = dependent as DependencyNode
                    this.applyGroup(node, orientation, RunGroup.BASELINE, null, groups, null);
                }
            }
        }
    }
}