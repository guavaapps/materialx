import {Dependency} from "./Dependency";
import {DimensionDependency} from "./DimensionDependency";
import {WidgetRun} from "./WidgetRun";

export enum DependencyNodeType {
    UNKNOWN, HORIZONTAL_DIMENSION, VERTICAL_DIMENSION,
    LEFT, RIGHT, TOP, BOTTOM, BASELINE
}

export class DependencyNode implements Dependency{
    updateDelegate: Dependency | null = null
    delegateToWidgetRun = false
    readyToSolve = false

    mRun: WidgetRun
    mType = DependencyNodeType.UNKNOWN

    mMargin: number = 0
    value: number = 0
    mMarginFactor = 1

    mMarginDependency: DimensionDependency | null = null

    resolved = false

    constructor(run: WidgetRun) {
        this.mRun = run
    }

    mDependencies: Dependency[] = []
    mTargets: DependencyNode[] = []

    toString () {
        return this.mRun.mWidget.getDebugName() + ":" + this.mType + "("
            + (this.resolved ? this.value : "unresolved") + ") <t="
            + this.mTargets.length + ":d=" + this.mDependencies.length+ ">";
    }

    resolve (value: number) {
        if (this.resolved) {
            return;
        }

        this.resolved = true;
        this.value = value;
        for (let node of this.mDependencies) {
            node.update(node);
        }
    }

    update(node: Dependency) {
        for (let target of this.mTargets) {
            if (!target.resolved) {
                return;
            }
        }
        this.readyToSolve = true;
        if (this.updateDelegate != null) {
            this.updateDelegate.update(this);
        }
        if (this.delegateToWidgetRun) {
            this.mRun.update(this);
            return;
        }
        let target: DependencyNode | null = null;
        let numTargets = 0;
        for (let t of this.mTargets) {
            if (t instanceof DimensionDependency) {
                continue;
            }
            target = t;
            numTargets++;
        }

        if (target != null && numTargets == 1 && target.resolved) {
            if (this.mMarginDependency != null) {
                if (this.mMarginDependency.resolved) {
                    this.mMargin = this.mMarginFactor * this.mMarginDependency.value;
                } else {
                    return;
                }
            }
            this.resolve(target.value + this.mMargin);
        }
        if (this.updateDelegate != null) {
            this.updateDelegate.update(this);
        }
    }

    addDependency (dependency: Dependency) {
        this.mDependencies.push(dependency);
        if (this.resolved) {
            dependency.update(dependency);
        }
    }

    name () {
        let definition = this.mRun.mWidget.getDebugName();
        if (this.mType == DependencyNodeType.LEFT
            || this.mType == DependencyNodeType.RIGHT) {
            definition += "_HORIZONTAL";
        } else {
            definition += "_VERTICAL";
        }
        definition += ":" + this.mType;
        return definition;
    }

    clear () {
        this.mTargets = []
        this.mDependencies = []
        this.resolved = false;
        this.value = 0;
        this.readyToSolve = false;
        this.delegateToWidgetRun = false;
    }


}