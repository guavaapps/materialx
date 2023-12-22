import {WidgetRun} from "./WidgetRun";
import {DependencyNode} from "./DependencyNode";
import {ConstraintWidgetContainer} from "./ConstraintWidgetContainer";
import {ConstraintWidget} from "./ConstraintWidget";
import {HelperReferences} from "./HelperReferences";
import {ChainRun} from "./ChainRun";
import {HorizontalWidgetRun} from "./HorizontalWidgetRun";
import {VerticalWidgetRun} from "./VerticalWidgetRun";

export class RunGroup {
    public static readonly START = 0;
    public static readonly END = 1;
    public static readonly BASELINE = 2;

    public static index: number

    public position = 0;
    public dual = false;

    mFirstRun: WidgetRun | null = null;
    mLastRun: WidgetRun | null = null;
    mRuns: WidgetRun[] = []

    mGroupIndex = 0;
    mDirection: number

    constructor(run: WidgetRun, dir: number) {
        this.mGroupIndex = RunGroup.index;
        RunGroup.index++;
        this.mFirstRun = run;
        this.mLastRun = run;
        this.mDirection = dir;
    }

    add(run: WidgetRun) {
        this.mRuns.push(run)
        this.mLastRun = run
    }

    traverseStart(node: DependencyNode, startPosition: number) {
        let run = node.mRun;
        if (run instanceof HelperReferences) {
            return startPosition;
        }
        let position = startPosition;

        // first, compute stuff dependent on this node.

        const count = node.mDependencies.length
        for (let i = 0; i < count; i++) {
            let dependency = node.mDependencies[i]
            if (dependency instanceof DependencyNode) {
                let nextNode = dependency as DependencyNode
                if (nextNode.mRun == run) {
                    // skip our own sibling node
                    continue;
                }
                position = Math.max(position,
                    this.traverseStart(nextNode, startPosition + nextNode.mMargin));
            }
        }

        if (node == run.start) {
            // let's go for our sibling
            let dimension = run.getWrapDimension();
            position = Math.max(position, this.traverseStart(run.end, startPosition + dimension));
            position = Math.max(position, startPosition + dimension - run.end.mMargin);
        }

        return position;
    }

    traverseEnd(node: DependencyNode, startPosition: number) {
        let run = node.mRun;
        if (run instanceof HelperReferences) {
            return startPosition;
        }
        let position = startPosition;

        // first, compute stuff dependent on this node.

        const count = node.mDependencies.length
        for (let i = 0; i < count; i++) {
            let dependency = node.mDependencies[i]
            if (dependency instanceof DependencyNode) {
                let nextNode = dependency as DependencyNode
                if (nextNode.mRun == run) {
                    // skip our own sibling node
                    continue;
                }
                position = Math.min(position,
                    this.traverseEnd(nextNode, startPosition + nextNode.mMargin));
            }
        }

        if (node == run.end) {
            // let's go for our sibling
            let dimension = run.getWrapDimension();
            position = Math.min(position, this.traverseEnd(run.start, startPosition - dimension));
            position = Math.min(position, startPosition - dimension - run.start.mMargin);
        }

        return position;
    }

    computeWrapSize(container: ConstraintWidgetContainer, orientation: number) {
        if (this.mFirstRun instanceof ChainRun) {
            let chainRun = this.mFirstRun as ChainRun
            if (chainRun.orientation != orientation) {
                return 0;
            }
        } else {
            if (orientation == ConstraintWidget.HORIZONTAL) {
                if (!(this.mFirstRun instanceof HorizontalWidgetRun)) {
                    return 0;
                }
            } else {
                if (!(this.mFirstRun instanceof VerticalWidgetRun)) {
                    return 0;
                }
            }
        }
        let containerStart = orientation == ConstraintWidget.HORIZONTAL
            ? container.mHorizontalRun!.start : container.mVerticalRun!.start;
        let containerEnd = orientation == ConstraintWidget.HORIZONTAL
            ? container.mHorizontalRun!.end : container.mVerticalRun!.end;

        let runWithStartTarget = this.mFirstRun.start.mTargets.includes(containerStart);
        let runWithEndTarget = this.mFirstRun.end.mTargets.includes(containerEnd);

        let dimension = this.mFirstRun.getWrapDimension();

        if (runWithStartTarget && runWithEndTarget) {
            let maxPosition = this.traverseStart(this.mFirstRun.start, 0);
            let minPosition = this.traverseEnd(this.mFirstRun.end, 0);

            // to compute the gaps, we subtract the margins
            let endGap = maxPosition - dimension;
            if (endGap >= -this.mFirstRun.end.mMargin) {
                endGap += this.mFirstRun.end.mMargin;
            }
            let startGap = -minPosition - dimension - this.mFirstRun.start.mMargin;
            if (startGap >= this.mFirstRun.start.mMargin) {
                startGap -= this.mFirstRun.start.mMargin;
            }
            let bias = this.mFirstRun.mWidget.getBiasPercent(orientation);
            let gap = 0;
            if (bias > 0) {
                gap = Math.round((startGap / bias) + (endGap / (1 - bias)));
            }

            startGap = Math.round(0.5 + (gap * bias));
            endGap = Math.round(0.5 + (gap * (1 - bias)));

            let runDimension = startGap + dimension + endGap;
            dimension = this.mFirstRun.start.mMargin + runDimension - this.mFirstRun.end.mMargin;

        } else if (runWithStartTarget) {
            let maxPosition = this.traverseStart(this.mFirstRun.start, this.mFirstRun.start.mMargin);
            let runDimension = this.mFirstRun.start.mMargin + dimension;
            dimension = Math.max(maxPosition, runDimension);
        } else if (runWithEndTarget) {
            let minPosition = this.traverseEnd(this.mFirstRun.end, this.mFirstRun.end.mMargin);
            let runDimension = -this.mFirstRun.end.mMargin + dimension;
            dimension = Math.max(-minPosition, runDimension);
        } else {
            dimension = this.mFirstRun.start.mMargin
                + this.mFirstRun.getWrapDimension() - this.mFirstRun.end.mMargin;
        }

        return dimension;
    }

    defineTerminalWidget(run: WidgetRun, orientation: number) {
        if (!run.mWidget.isTerminalWidget[orientation]) {
            return false;
        }
        for (let dependency of run.start.mDependencies) {
            if (dependency instanceof DependencyNode) {
                let node = dependency as DependencyNode
                if (node.mRun == run) {
                    continue;
                }
                if (node == node.mRun.start) {
                    if (run instanceof ChainRun) {
                        let chainRun = run as ChainRun
                        for (let widgetChainRun of chainRun.mWidgets) {
                            this.defineTerminalWidget(widgetChainRun, orientation);
                        }
                    } else {
                        if (!(run instanceof HelperReferences)) {
                            run.mWidget.isTerminalWidget[orientation] = false;
                        }
                    }
                    this.defineTerminalWidget(node.mRun, orientation);
                }
            }
        }
        for (let dependency of run.end.mDependencies) {
            if (dependency instanceof DependencyNode) {
                let node = dependency as DependencyNode
                if (node.mRun == run) {
                    continue;
                }
                if (node == node.mRun.start) {
                    if (run instanceof ChainRun) {
                        let chainRun = run as ChainRun
                        for (let widgetChainRun of chainRun.mWidgets) {
                            this.defineTerminalWidget(widgetChainRun, orientation);
                        }
                    } else {
                        if (!(run instanceof HelperReferences)) {
                            run.mWidget.isTerminalWidget[orientation] = false;
                        }
                    }
                    this.defineTerminalWidget(node.mRun, orientation);
                }
            }
        }
        return false;
    }

    defineTerminalWidgets (horizontalCheck: boolean, verticalCheck: boolean) {
        if (horizontalCheck && this.mFirstRun instanceof HorizontalWidgetRun) {
            this.defineTerminalWidget(this.mFirstRun!, ConstraintWidget.HORIZONTAL);
        }
        if (verticalCheck && this.mFirstRun instanceof VerticalWidgetRun) {
            this.defineTerminalWidget(this.mFirstRun!, ConstraintWidget.VERTICAL);
        }
    }
}