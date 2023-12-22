import {SolverVariable, SolverVariableType} from "./SolverVariable";
import {ArrayRow} from "./ArrayRow";
import {Cache} from "./Cache";
import {Metric} from "web-vitals";
import {KeyboardEvent} from "../../ui/event/pointer_event";
import {Arrays} from "./utils";
import {ArrayLinkedVariables} from "./ArrayLinkedVariables";
import {SolverVariableValues} from "./SolverVariableValues";
import {PriorityGoalRow} from "./PriorityGoalRow";
import {ConstraintAnchor, ConstraintAnchorType} from "./ConstraintAnchor";
import {Chain} from "./Chain";
import {ConstraintWidget} from "./ConstraintWidget";


export class LinearSystem {
    public static readonly FULL_DEBUG = false
    public static readonly DEBUG = false
    private static readonly DO_NOT_USE = false

    private static readonly DEBUG_CONSTRAINTS = LinearSystem.FULL_DEBUG

    public static USE_DEPENDENCY_ORDERING = false;
    public static USE_BASIC_SYNONYMS = true;
    public static SIMPLIFY_SYNONYMS = true;
    public static USE_SYNONYMS = true;
    public static SKIP_COLUMNS = true;
    public static OPTIMIZED_ENGINE = false;

    private static sPoolSize = 1000

    public hasSimpleDefinition = false

    mVariablesID = 0

    private mVariables: Map<string, SolverVariable> | null = null

    private mGoal: Row;

    private mTableSize = 32; // default table size for the allocation
    private mMaxColumns = this.mTableSize;
    mRows: (ArrayRow | null)[];

    // if true, will use graph optimizations
    public graphOptimizer = false;
    public newgraphOptimizer = false;

    // Used in optimize()
    private mAlreadyTestedCandidates: boolean[] = new Array(this.mTableSize)

    mNumColumns = 1;
    mNumRows = 0;
    private mMaxRows = this.mTableSize;

    readonly mCache: Cache

    private mPoolVariables: (SolverVariable | null)[] = new Array<SolverVariable>(LinearSystem.sPoolSize)//new SolverVariable[sPoolSize];
    private mPoolVariablesCount = 0;

    // public static sMetrics: Metrics;
    private mTempGoal: Row;

    constructor() {
        this.mRows = new Array<ArrayRow>(this.mTableSize)
        this.releaseRows()
        this.mCache = new Cache()
        this.mGoal = new PriorityGoalRow(this.mCache)
        if (LinearSystem.OPTIMIZED_ENGINE) {
            this.mTempGoal = new ValuesRow(this.mCache)
        } else {
            this.mTempGoal = new ArrayRow(this.mCache)
        }
    }

    private increaseTableSize(): void {
        if (LinearSystem.DEBUG) {
            console.log("###########################");
            console.log("### INCREASE TABLE TO " + (this.mTableSize * 2) + " (num rows: "
                + this.mNumRows + ", num cols: " + this.mNumColumns + "/" + this.mMaxColumns + ")");
            console.log("###########################");
        }
        this.mTableSize *= 2;
        this.mRows = Arrays.copy(this.mRows, this.mTableSize) //Arrays.copyOf(mRows, mTableSize);
        this.mCache.mIndexedVariables = Arrays.copy(this.mCache.mIndexedVariables, this.mTableSize) //Arrays.copyOf(mCache.mIndexedVariables, mTableSize);
        this.mAlreadyTestedCandidates = new Array<boolean>(this.mTableSize)//new boolean[mTableSize];
        this.mMaxColumns = this.mTableSize;
        this.mMaxRows = this.mTableSize;
        // if (sMetrics != null) {
        //     sMetrics.tableSizeIncrease++;
        //     sMetrics.maxTableSize = Math.max(sMetrics.maxTableSize, mTableSize);
        //     sMetrics.lastTableSize = sMetrics.maxTableSize;
        // }
    }

    private releaseRows() {
        if (LinearSystem.OPTIMIZED_ENGINE) {
            for (let i = 0; i < this.mNumRows; i++) {
                let row = (this.mRows)[i];
                if (row != null) {
                    this.mCache.mOptimizedArrayRowPool.release(row);
                }
                (this.mRows)[i] = null;
            }
        } else {
            for (let i = 0; i < this.mNumRows; i++) {
                let row = (this.mRows)[i];
                if (row != null) {
                    this.mCache.mArrayRowPool.release(row);
                }
                (this.mRows)[i] = null;
            }
        }
    }

    public reset() {
        if (LinearSystem.DEBUG) {
            console.log("##################");
            console.log("## RESET SYSTEM ##");
            console.log("##################");
        }
        for (let i = 0; i < this.mCache.mIndexedVariables.length; i++) {
            let variable = this.mCache.mIndexedVariables[i];
            if (variable != null) {
                variable.reset();
            }
        }
        this.mCache.mSolverVariablePool.releaseAll(this.mPoolVariables as SolverVariable[], this.mPoolVariablesCount);
        this.mPoolVariablesCount = 0;

        this.mCache.mIndexedVariables.fill(null) //Arrays.fill(mCache.mIndexedVariables, null);
        if (this.mVariables != null) {
            this.mVariables.clear();
        }
        this.mVariablesID = 0;
        this.mGoal.clear();
        this.mNumColumns = 1;
        for (let i = 0; i < this.mNumRows; i++) {
            if ((this.mRows)[i] != null) {
                (this.mRows)[i]!.mUsed = false;
            }
        }
        this.releaseRows();
        this.mNumRows = 0;
        if (LinearSystem.OPTIMIZED_ENGINE) {
            this.mTempGoal = new ValuesRow(this.mCache);
        } else {
            this.mTempGoal = new ArrayRow(this.mCache);
        }
    }

    public createObjectVariable(anchor: object | null): SolverVariable | null {
        if (anchor == null) {
            return null;
        }
        if (this.mNumColumns + 1 >= this.mMaxColumns) {
            this.increaseTableSize();
        }
        let variable: SolverVariable | null = null;
        if (anchor instanceof ConstraintAnchor) {
            variable = (anchor as ConstraintAnchor).getSolverVariable()
            if (variable == null) {
                (anchor as ConstraintAnchor).resetSolverVariable(this.mCache);
                variable = (anchor as ConstraintAnchor).getSolverVariable();
            }
            if (variable!.id == -1
                || variable!.id > this.mVariablesID
                || this.mCache.mIndexedVariables[variable!.id] == null) {
                if (variable!.id != -1) {
                    variable.reset();
                }
                this.mVariablesID++;
                this.mNumColumns++;
                variable.id = this.mVariablesID;
                variable.mType = SolverVariableType.UNRESTRICTED;
                this.mCache.mIndexedVariables[this.mVariablesID] = variable;
            }
        }
        return variable;
    }

    public static ARRAY_ROW_CREATION = 0;
    public static OPTIMIZED_ARRAY_ROW_CREATION = 0;

    createRow(): ArrayRow {
        let row: ArrayRow | null

        if (LinearSystem.OPTIMIZED_ENGINE) {
            row = this.mCache.mOptimizedArrayRowPool.acquire();
            if (row == null) {
                row = new ValuesRow(this.mCache);
                LinearSystem.OPTIMIZED_ARRAY_ROW_CREATION++;
            } else {
                row.reset();
            }
        } else {
            row = this.mCache.mArrayRowPool.acquire();
            if (row == null) {
                row = new ArrayRow(this.mCache);
                LinearSystem.ARRAY_ROW_CREATION++;
            } else {
                row.reset();
            }
        }
        SolverVariable.increaseErrorId();
        return row;
    }

    public createSlackVariable(): SolverVariable {
        // if (sMetrics != null) {
        //     sMetrics.slackvariables++;
        // }
        if (this.mNumColumns + 1 >= this.mMaxColumns) {
            this.increaseTableSize();
        }
        let variable: SolverVariable = this.acquireSolverVariable(SolverVariableType.SLACK, null);
        this.mVariablesID++;
        this.mNumColumns++;
        variable.id = this.mVariablesID;
        this.mCache.mIndexedVariables[this.mVariablesID] = variable;
        return variable;
    }

    public createExtraVariable(): SolverVariable {
        // if (sMetrics != null) {
        //     sMetrics.extravariables++;
        // }
        if (this.mNumColumns + 1 >= this.mMaxColumns) {
            this.increaseTableSize();
        }
        let variable: SolverVariable = this.acquireSolverVariable(SolverVariableType.SLACK, null);
        this.mVariablesID++;
        this.mNumColumns++;
        variable.id = this.mVariablesID;
        this.mCache.mIndexedVariables[this.mVariablesID] = variable;
        return variable;
    }

    addSingleError(row: ArrayRow, sign: number, strength: number) {
        let prefix: string
        if (LinearSystem.DEBUG) {
            if (sign > 0) {
                prefix = "ep";
            } else {
                prefix = "em";
            }
            prefix = "em";
        }
        let error = this.createErrorVariable(strength, prefix!);
        row.addSingleError(error, sign);
    }

    private createVariable(name: string, type: SolverVariableType): SolverVariable {
        // if (sMetrics != null) {
        //     sMetrics.variables++;
        // }
        if (this.mNumColumns + 1 >= this.mMaxColumns) {
            this.increaseTableSize();
        }
        let variable = this.acquireSolverVariable(type, null);
        variable.setName(name);
        this.mVariablesID++;
        this.mNumColumns++;
        variable.id = this.mVariablesID;
        if (this.mVariables == null) {
            this.mVariables = new Map<string, SolverVariable>();
        }
        this.mVariables.set(name, variable);
        this.mCache.mIndexedVariables[this.mVariablesID] = variable;
        return variable;
    }

    public createErrorVariable(strength: number, prefix: string): SolverVariable {
        // if (sMetrics != null) {
        //     sMetrics.errors++;
        // }
        if (this.mNumColumns + 1 >= this.mMaxColumns) {
            this.increaseTableSize();
        }
        let variable = this.acquireSolverVariable(SolverVariableType.ERROR, prefix);
        this.mVariablesID++;
        this.mNumColumns++;
        variable.id = this.mVariablesID;
        variable.strength = strength;
        this.mCache.mIndexedVariables[this.mVariablesID] = variable;
        this.mGoal.addError(variable);
        return variable;
    }

    private acquireSolverVariable(type: SolverVariableType, prefix: string | null): SolverVariable {
        let variable = this.mCache.mSolverVariablePool.acquire();
        if (variable == null) {
            variable = new SolverVariable(type, prefix);
            variable.setType(type, prefix);
        } else {
            variable.reset();
            variable.setType(type, prefix);
        }
        if (this.mPoolVariablesCount >= LinearSystem.sPoolSize) {
            LinearSystem.sPoolSize *= 2;
            this.mPoolVariables = Arrays.copy(this.mPoolVariables, LinearSystem.sPoolSize)//Arrays.copyOf(mPoolVariables, sPoolSize);
        }
        this.mPoolVariables[this.mPoolVariablesCount++] = variable;
        return variable;
    }

    getGoal(): Row {
        return this.mGoal;
    }

    getRow(n: number) {
        return (this.mRows)[n];
    }

    getValueFor(name: string) {
        let v = this.getVariable(name, SolverVariableType.UNRESTRICTED);
        if (v == null) {
            return 0;
        }
        return v.computedValue;
    }

    public getObjectVariableValue(object: object) {
        let anchor = object as ConstraintAnchor
        if (Chain.USE_CHAIN_OPTIMIZATION) {
            if (anchor.hasFinalValue()) {
                return anchor.getFinalValue();
            }
        }
        let variable = anchor.getSolverVariable();
        if (variable != null) {
            return (variable.computedValue + 0.5) as number
        }
        return 0;
    }

    getVariable(name: string, type: SolverVariableType): SolverVariable {
        if (this.mVariables == null) {
            this.mVariables = new Map<string, SolverVariable>();
        }
        let variable = this.mVariables.get(name);
        if (variable == null) {
            variable = this.createVariable(name, type);
        }
        return variable;
    }

    public minimize() {
        if (this.mGoal.isEmpty()) {
            this.computeValues();
            return;
        }
        if (LinearSystem.DEBUG) {
            console.log("\n*** MINIMIZE ***\n");
        }
        if (this.graphOptimizer || this.newgraphOptimizer) {
            // if (sMetrics != null) {
            //     sMetrics.graphOptimizer++;
            // }
            let fullySolved = true;
            for (let i = 0; i < this.mNumRows; i++) {
                let r = (this.mRows)[i];
                if (!r?.mIsSimpleDefinition) {
                    fullySolved = false;
                    break;
                }
            }
            if (!fullySolved) {
                this.minimizeGoal(this.mGoal);
            } else {
                this.computeValues();
            }
        } else {
            this.minimizeGoal(this.mGoal);
        }
    }

    minimizeGoal(goal: Row) {
        // First, let's make sure that the system is in Basic Feasible Solved Form (BFS), i.e.
        // all the constants of the restricted variables should be positive.
        if (LinearSystem.DEBUG) {
            console.log("minimize goal: " + goal);
        }
        // we don't need this for now as we incrementally built the system
        // goal.updateFromSystem(this);
        this.enforceBFS(goal);
        this.optimize(goal, false);
        this.computeValues();
    }

    cleanupRows() {
        let i = 0;
        while (i < this.mNumRows) {
            let current = (this.mRows)[i];
            if (current?.variables.getCurrentSize() == 0) {
                current.mIsSimpleDefinition = true;
            }
            if (current?.mIsSimpleDefinition) {
                current!.mVariable!.computedValue = current.mConstantValue;
                current?.mVariable?.removeFromRow(current);
                for (let j = i; j < this.mNumRows - 1; j++) {
                    (this.mRows)[j] = (this.mRows)[j + 1];
                }
                (this.mRows)[this.mNumRows - 1] = null;
                this.mNumRows--;
                i--;
                if (LinearSystem.OPTIMIZED_ENGINE) {
                    this.mCache.mOptimizedArrayRowPool.release(current);
                } else {
                    this.mCache.mArrayRowPool.release(current);
                }
            }
            i++;
        }
    }

    public addConstraint(row: ArrayRow) {
        if (row == null) {
            return;
        }
        if (this.mNumRows + 1 >= this.mMaxRows || this.mNumColumns + 1 >= this.mMaxColumns) {
            this.increaseTableSize();
        }

        let added = false;

        if (!row.mIsSimpleDefinition) {
            row.updateFromSystem(this);

            if (row.isEmpty()) {
                return;
            }

            // First, ensure that if we have a constant it's positive
            row.ensurePositiveConstant();

            if (row.chooseSubject(this)) {
                let extra = this.createExtraVariable();
                row.mVariable = extra;
                let numRows = this.mNumRows;
                this.addRow(row);

                if (this.mNumRows == numRows + 1) {
                    added = true;
                    this.mTempGoal.initFromRow(row);
                    this.optimize(this.mTempGoal, true);
                    if (extra.mDefinitionId == -1) {
                        if (row.mVariable == extra) {
                            // move extra to be parametric
                            let pivotCandidate = row.pickPivot(extra);
                            if (pivotCandidate != null) {
                                row.pivot(pivotCandidate);
                            }
                        }
                        if (!row.mIsSimpleDefinition) {
                            row.mVariable.updateReferencesWithNewDefinition(this, row);
                        }
                        if (LinearSystem.OPTIMIZED_ENGINE) {
                            this.mCache.mOptimizedArrayRowPool.release(row);
                        } else {
                            this.mCache.mArrayRowPool.release(row);
                        }
                        this.mNumRows--;
                    }
                }
            }

            if (!row.hasKeyVariable()) {
                // Can happen if row resolves to nil
                return;
            }


        }

        if (!added) {
            this.addRow(row);
        }
    }

    private addRow(row: ArrayRow) {
        if (LinearSystem.SIMPLIFY_SYNONYMS && row.mIsSimpleDefinition) {
            row?.mVariable?.setFinalValue(this, row.mConstantValue);
        } else {
            (this.mRows)[this.mNumRows] = row;
            row!.mVariable!.mDefinitionId = this.mNumRows;
            this.mNumRows++;
            row?.mVariable?.updateReferencesWithNewDefinition(this, row);
        }

        if (LinearSystem.SIMPLIFY_SYNONYMS && this.hasSimpleDefinition) {
            // compact the rows...
            for (let i = 0; i < this.mNumRows; i++) {
                if ((this.mRows)[i] != null && (this.mRows)[i]?.mIsSimpleDefinition) {
                    let removedRow = (this.mRows)[i]!;
                    removedRow!.mVariable!.setFinalValue(this, removedRow.mConstantValue);
                    if (LinearSystem.OPTIMIZED_ENGINE) {
                        this.mCache.mOptimizedArrayRowPool.release(removedRow);
                    } else {
                        this.mCache.mArrayRowPool.release(removedRow);
                    }
                    this.mRows[i] = null;
                    let lastRow = i + 1;
                    for (let j = i + 1; j < this.mNumRows; j++) {
                        (this.mRows)[j - 1] = (this.mRows)[j];
                        if ((this.mRows)[j - 1]?.mVariable?.mDefinitionId === j) {
                            (this.mRows)[j - 1]!.mVariable!.mDefinitionId = j - 1;
                        }
                        lastRow = j;
                    }
                    if (lastRow < this.mNumRows) {
                        (this.mRows)[lastRow] = null;
                    }
                    this.mNumRows--;
                    i--;
                }
            }
            this.hasSimpleDefinition = false;
        }
    }

    public removeRow(row: ArrayRow) {
        if (row.mIsSimpleDefinition && row.mVariable != null) {
            if (row.mVariable.mDefinitionId != -1) {
                for (let i = row.mVariable.mDefinitionId; i < this.mNumRows - 1; i++) {
                    let rowVariable = (this.mRows)[i + 1]!.mVariable;
                    if (rowVariable!.mDefinitionId == i + 1) {
                        rowVariable!.mDefinitionId = i;
                    }
                    (this.mRows)[i] = (this.mRows)[i + 1];
                }
                this.mNumRows--;
            }
            if (!row.mVariable.isFinalValue) {
                row.mVariable.setFinalValue(this, row.mConstantValue);
            }
            if (LinearSystem.OPTIMIZED_ENGINE) {
                this.mCache.mOptimizedArrayRowPool.release(row);
            } else {
                this.mCache.mArrayRowPool.release(row);
            }
        }
    }

    private optimize(goal: Row, b: boolean) {
        let done = false;
        let tries = 0;
        for (let i = 0; i < this.mNumColumns; i++) {
            (this.mAlreadyTestedCandidates)[i] = false;
        }

        while (!done) {
            tries++;

            if (tries >= 2 * this.mNumColumns) {
                return tries;
            }

            if (goal.getKey() != null) {
                (this.mAlreadyTestedCandidates)[goal.getKey()!.id] = true;
            }
            let pivotCandidate = goal.getPivotCandidate(this, this.mAlreadyTestedCandidates);

            if (pivotCandidate != null) {
                if ((this.mAlreadyTestedCandidates)[pivotCandidate.id]) {
                    return tries;
                } else {
                    (this.mAlreadyTestedCandidates)[pivotCandidate.id] = true;
                }
            }

            if (pivotCandidate !== null) {
                let min = Number.MAX_VALUE;
                let pivotRowIndex = -1;

                for (let i = 0; i < this.mNumRows; i++) {
                    let current = (this.mRows)[i]!;
                    let variable = current.mVariable!;
                    if (variable.mType == SolverVariableType.UNRESTRICTED) {
                        // skip unrestricted variables equations (to only look at Cs)
                        continue;
                    }
                    if (current.mIsSimpleDefinition) {
                        continue;
                    }

                    if (current.hasVariable(pivotCandidate)) {
                        // the current row does contains the variable
                        // we want to pivot on
                        let a_j = current.variables.get(pivotCandidate);
                        if (a_j < 0) {
                            let value = -current.mConstantValue / a_j;
                            if (value < min) {
                                min = value;
                                pivotRowIndex = i;
                            }
                        }
                    }
                }

                if (pivotRowIndex > -1) {
                    // We found an equation to pivot on
                    let pivotEquation = (this.mRows)[pivotRowIndex]!;
                    pivotEquation.mVariable!.mDefinitionId = -1;

                    pivotEquation.pivot(pivotCandidate);
                    pivotEquation.mVariable!.mDefinitionId = pivotRowIndex;
                    pivotEquation.mVariable!.updateReferencesWithNewDefinition(this, pivotEquation);
                    /*
                    try {
                        enforceBFS(goal);
                    } catch (Exception e) {
                        System.out.println("### EXCEPTION " + e);
                        e.printStackTrace();
                    }
                    */
                    // now that we pivoted, we're going to continue looping on the next goal
                    // columns, until we exhaust all the possibilities of improving the system
                } else {
                }
            } else {
            }
        }
        return tries
    }

    private enforceBFS(goal: Row) {
        let tries = 0
        let done: boolean

        let infeasibleSystem = false;
        for (let i = 0; i < this.mNumRows; i++) {
            let variable = (this.mRows)[i]!.mVariable!;
            if (variable.mType == SolverVariableType.UNRESTRICTED) {
                continue; // C can be either positive or negative.
            }
            if ((this.mRows)[i]!.mConstantValue < 0) {
                infeasibleSystem = true;
                break;
            }
        }

        if (infeasibleSystem) {
            done = false;
            tries = 0;

            while (!done) {
                tries++

                let min = Number.MAX_VALUE;
                let strength = 0;
                let pivotRowIndex = -1;
                let pivotColumnIndex = -1;

                for (let i = 0; i < this.mNumRows; i++) {
                    let current = (this.mRows)[i]!;
                    let variable = current.mVariable!;
                    if (variable.mType == SolverVariableType.UNRESTRICTED) {
                        // skip unrestricted variables equations, as C
                        // can be either positive or negative.
                        continue;
                    }
                    if (current.mIsSimpleDefinition) {
                        continue;
                    }

                    if (current.mConstantValue < 0) {
                        if (LinearSystem.SKIP_COLUMNS) {
                            const size = current.variables.getCurrentSize();
                            for (let j = 0; j < size; j++) {
                                let candidate = current.variables.getVariable(j)!
                                let a_j = current.variables.get(candidate);
                                if (a_j <= 0) {
                                    continue;
                                }
                                for (let k = 0; k < SolverVariable.MAX_STRENGTH; k++) {
                                    let value = candidate.mStrengthVector[k] / a_j;
                                    if ((value < min && k == strength) || k > strength) {
                                        min = value;
                                        pivotRowIndex = i;
                                        pivotColumnIndex = candidate.id;
                                        strength = k;
                                    }
                                }
                            }
                        } else {
                            for (let j = 1; j < this.mNumColumns; j++) {
                                let candidate = this.mCache.mIndexedVariables[j]!;
                                let a_j = current.variables.get(candidate);
                                if (a_j <= 0) {
                                    continue;
                                }
                                for (let k = 0; k < SolverVariable.MAX_STRENGTH; k++) {
                                    let value = candidate.mStrengthVector[k] / a_j;
                                    if ((value < min && k == strength) || k > strength) {
                                        min = value;
                                        pivotRowIndex = i;
                                        pivotColumnIndex = j;
                                        strength = k;
                                    }
                                }
                            }
                        }
                    }
                }

                if (pivotRowIndex != -1) {
                    // We have a pivot!
                    let pivotEquation = (this.mRows)[pivotRowIndex]!;
                    pivotEquation.mVariable!.mDefinitionId = -1;
                    pivotEquation.pivot(this.mCache.mIndexedVariables[pivotColumnIndex]!);
                    pivotEquation.mVariable!.mDefinitionId = pivotRowIndex;
                    pivotEquation.mVariable!.updateReferencesWithNewDefinition(this, pivotEquation);
                } else {
                    done = true;
                }
                if (tries > this.mNumColumns / 2) {
                    // fail safe -- tried too many times
                    done = true;
                }
            }
        }

        return tries
    }

    private computeValues() {
        for (let i = 0; i < this.mNumRows; i++) {
            let row = (this.mRows)[i]!;
            row.mVariable!.computedValue = row.mConstantValue;
        }
    }

    public getMemoryUsed() {
        let actualRowSize = 0;
        for (let i = 0; i < this.mNumRows; i++) {
            if ((this.mRows)[i] != null) {
                actualRowSize += (this.mRows)[i]!.sizeInBytes();
            }
        }
        return actualRowSize;
    }

    public getNumEquations() {
        return this.mNumRows;
    }

    public getNumVariables() {
        return this.mVariablesID;
    }

    public getCache() {
        return this.mCache;
    }

    private getDisplayStrength(strength: number) {
        if (strength == SolverVariable.STRENGTH_LOW) {
            return "LOW";
        }
        if (strength == SolverVariable.STRENGTH_MEDIUM) {
            return "MEDIUM";
        }
        if (strength == SolverVariable.STRENGTH_HIGH) {
            return "HIGH";
        }
        if (strength == SolverVariable.STRENGTH_HIGHEST) {
            return "HIGHEST";
        }
        if (strength == SolverVariable.STRENGTH_EQUALITY) {
            return "EQUALITY";
        }
        if (strength == SolverVariable.STRENGTH_FIXED) {
            return "FIXED";
        }
        if (strength == SolverVariable.STRENGTH_BARRIER) {
            return "BARRIER";
        }
        return "NONE";
    }

    public addGreaterThan(a: SolverVariable | null, b: SolverVariable | null, margin: number, strength: number) {
        let row = this.createRow();
        let slack = this.createSlackVariable();
        slack.strength = 0;
        row.createRowGreaterThan(a!, b!, slack, margin);
        if (strength != SolverVariable.STRENGTH_FIXED) {
            let slackValue = row.variables.get(slack);
            this.addSingleError(row, (-1 * slackValue), strength);
        }
        this.addConstraint(row);
    }

    public addGreaterBarrier(a: SolverVariable,
                             b: SolverVariable,
                             margin: number,
                             hasMatchConstraintWidgets: boolean) {
        let row = this.createRow();
        let slack = this.createSlackVariable();
        slack.strength = 0;
        row.createRowGreaterThan(a, b, slack, margin);
        this.addConstraint(row);
    }

    public addLowerThan(a: SolverVariable | null, b: SolverVariable | null, margin: number, strength: number) {
        let row = this.createRow();
        let slack = this.createSlackVariable();
        slack.strength = 0;
        row.createRowLowerThan(a!, b!, slack, margin);
        if (strength != SolverVariable.STRENGTH_FIXED) {
            let slackValue = row.variables.get(slack);
            this.addSingleError(row, (-1 * slackValue), strength);
        }
        this.addConstraint(row);
    }

    public addLowerBarrier(a: SolverVariable,
                           b: SolverVariable,
                           margin: number,
                           hasMatchConstraintWidgets: boolean) {
        let row = this.createRow();
        let slack = this.createSlackVariable();
        slack.strength = 0;
        row.createRowLowerThan(a, b, slack, margin);
        this.addConstraint(row);
    }

    public addCentering(a: SolverVariable, b: SolverVariable, m1: number, bias: number,
                        c: SolverVariable, d: SolverVariable, m2: number, strength: number) {

        let row = this.createRow();
        row.createRowCentering(a, b, m1, bias, c, d, m2);
        if (strength != SolverVariable.STRENGTH_FIXED) {
            row.addErrorToSystem(this, strength);
        }
        this.addConstraint(row);
    }

    public addRatio(a: SolverVariable, b: SolverVariable, c: SolverVariable, d: SolverVariable,
                    ratio: number, strength: number) {
        let row = this.createRow();
        row.createRowDimensionRatio(a, b, c, d, ratio);
        if (strength != SolverVariable.STRENGTH_FIXED) {
            row.addErrorToSystem(this, strength);
        }
        this.addConstraint(row);
    }

    public addSynonym(a: SolverVariable, b: SolverVariable, margin: number) {
        if (a.mDefinitionId == -1 && margin == 0) {
            if (b.mIsSynonym) {
                margin += b.mSynonymDelta;
                b = this.mCache.mIndexedVariables[b.mSynonym]!
            }
            if (a.mIsSynonym) {
                margin -= a.mSynonymDelta;
                a = this.mCache.mIndexedVariables[a.mSynonym]!
            } else {
                a.setSynonym(this, b, 0);
            }
        } else {
            this.addEquality(a, b, margin, SolverVariable.STRENGTH_FIXED);
        }
    }

    public addEquality(a: SolverVariable | null, b: SolverVariable | null, margin: number, strength: number) {
        if (LinearSystem.USE_BASIC_SYNONYMS && strength == SolverVariable.STRENGTH_FIXED && b!.isFinalValue && a!.mDefinitionId == -1) {
            a!.setFinalValue(this, b!.computedValue + margin);
            return null;
        }

        if (LinearSystem.DO_NOT_USE && LinearSystem.USE_SYNONYMS && strength == SolverVariable.STRENGTH_FIXED
            && a!.mDefinitionId == -1 && margin == 0) {
            if (b!.mIsSynonym) {
                margin += b!.mSynonymDelta;
                b = this.mCache.mIndexedVariables[b!.mSynonym]!;
            }
            if (a!.mIsSynonym) {
                margin -= a!.mSynonymDelta;
                a = this.mCache.mIndexedVariables[a!.mSynonym]!;
            } else {
                a!.setSynonym(this, b!, margin);
                return null;
            }
        }
    }

    public addEqualityConstant(a: SolverVariable, value: number) {
        if (LinearSystem.USE_BASIC_SYNONYMS && a.mDefinitionId == -1) {
            if (LinearSystem.DEBUG_CONSTRAINTS) {
                console.log("=> " + a + " = " + value + " (Synonym)");
            }
            a.setFinalValue(this, value);
            for (let i = 0; i < this.mVariablesID + 1; i++) {
                let variable = this.mCache.mIndexedVariables[i];
                if (variable != null && variable.mIsSynonym && variable.mSynonym == a.id) {
                    variable.setFinalValue(this, value + variable.mSynonymDelta);
                }
            }
            return;
        }

        let idx = a.mDefinitionId;
        if (a.mDefinitionId != -1) {
            let row = (this.mRows)[idx]!;
            if (row.mIsSimpleDefinition) {
                row.mConstantValue = value;
            } else {
                if (row.variables.getCurrentSize() == 0) {
                    row.mIsSimpleDefinition = true;
                    row.mConstantValue = value;
                } else {
                    let newRow = this.createRow();
                    newRow.createRowEqualsConstant(a, value);
                    this.addConstraint(newRow);
                }
            }
        } else {
            let row = this.createRow();
            row.createRowDefinition(a, value);
            this.addConstraint(row);
        }
    }

    public static createRowDimensionPercent(linearSystem: LinearSystem, variableA: SolverVariable, variableC: SolverVariable, percent: number) {
        let row = linearSystem.createRow();
        return row.createRowDimensionPercent(variableA, variableC, percent);
    }

    public addCenterPoint(widget: ConstraintWidget, target: ConstraintWidget, angle: number, radius: number) {
        let Al = this.createObjectVariable(widget.getAnchor(ConstraintAnchorType.LEFT))!;
        let At = this.createObjectVariable(widget.getAnchor(ConstraintAnchorType.TOP))!;
        let Ar = this.createObjectVariable(widget.getAnchor(ConstraintAnchorType.RIGHT))!;
        let Ab = this.createObjectVariable(widget.getAnchor(ConstraintAnchorType.BOTTOM))!;

        let Bl = this.createObjectVariable(target.getAnchor(ConstraintAnchorType.LEFT))!;
        let Bt = this.createObjectVariable(target.getAnchor(ConstraintAnchorType.TOP))!;
        let Br = this.createObjectVariable(target.getAnchor(ConstraintAnchorType.RIGHT))!;
        let Bb = this.createObjectVariable(target.getAnchor(ConstraintAnchorType.BOTTOM))!;

        let row = this.createRow();
        let angleComponent = Math.sin(angle) * radius;
        row.createRowWithAngle(At, Ab, Bt, Bb, angleComponent);
        this.addConstraint(row);
        row = this.createRow();
        angleComponent = (Math.cos(angle) * radius);
        row.createRowWithAngle(Al, Ar, Bl, Br, angleComponent);
        this.addConstraint(row);
    }
}

export class ValuesRow extends ArrayRow {
    constructor(cache: Cache) {
        super();

        this.variables = new SolverVariableValues(this, cache)
    }
}

export interface Row {
    getPivotCandidate(system: LinearSystem, avoid: boolean[]): SolverVariable | null

    clear(): void

    initFromRow(row: Row): void

    addError(variable: SolverVariable): void

    updateFromSystem(system: LinearSystem): void

    getKey(): SolverVariable | null

    isEmpty(): boolean

    updateFromRow(system: LinearSystem, definition: ArrayRow, b: boolean): void

    updateFromFinalVariable(system: LinearSystem,
                            variable: SolverVariable,
                            removeFromDefinition: boolean): void
}