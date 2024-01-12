// import {ArrayRow} from "./ArrayRow";
import {Cache} from "./Cache";
import {ArrayLinkedVariables} from "./ArrayLinkedVariables";
import {Arrays} from "./utils";
import {ConstraintAnchor, ConstraintAnchorType} from "./ConstraintAnchor";
import {Chain} from "./Chain";
import {ConstraintWidget} from "./ConstraintWidget";
import {SolverVariableValues} from "./SolverVariableValues";

export enum SolverVariableType {
    UNRESTRICTED,
    CONSTANT,
    SLACK,
    ERROR,
    UNKNOWN
}

export class ArrayRow implements Row {
    mVariable: SolverVariable | null = null
    mConstantValue = 0
    mUsed = false

    private static readonly FULL_NEW_CHECK = false

    private mVariablesToUpdate: SolverVariable[] = []

    public variables: ArrayRow.ArrayRowVariables

    mIsSimpleDefinition = false

    constructor(cache?: Cache) {
        if (!cache) { // added
            cache = new Cache()
        }

        // if (cache) {
        this.variables = new ArrayLinkedVariables(this, cache)
        // }
    }

    hasKeyVariable(): boolean {
        return !(
            (this.mVariable === null)
            || (this.mVariable.mType !== SolverVariableType.UNRESTRICTED
                && this.mConstantValue < 0)
        )
    }

    toString() {
        return this.toReadableString()
    }

    toReadableString(): string {
        let s = ""
        if (this.mVariable === null) {
            s += "0"
        } else {
            s += this.mVariable
        }

        s += " = "

        let addedVariable = false

        if (this.mConstantValue != 0) {
            s += this.mConstantValue;
            addedVariable = true;
        }
        let count = this.variables.getCurrentSize();

        for (let i = 0; i < count; i++) {
            let v: SolverVariable = this.variables.getVariable(i)!
            if (v == null) {
                continue;
            }
            let amount = this.variables.getVariableValue(i);
            if (amount == 0) {
                continue;
            }
            let name = v.toString();
            if (!addedVariable) {
                if (amount < 0) {
                    s += "- ";
                    amount *= -1;
                }
            } else {
                if (amount > 0) {
                    s += " + ";
                } else {
                    s += " - ";
                    amount *= -1;
                }
            }
            if (amount === 1) {
                s += name;
            } else {
                s += amount + " " + name;
            }
            addedVariable = true;
        }
        if (!addedVariable) {
            s += "0.0";
        }

        return s;
    }

    reset(): void {
        this.mVariable = null
        this.variables.clear()
        this.mConstantValue = 0
        this.mIsSimpleDefinition = false
    }

    hasVariable(v: SolverVariable): boolean {
        return this.variables.contains(v)
    }

    createRowDefinition(variable: SolverVariable, value: number): ArrayRow {
        this.mVariable = variable
        variable.computedValue = value
        this.mConstantValue = value
        this.mIsSimpleDefinition = true

        return this
    }

    createRowEquals(variableA: SolverVariable, variableB: SolverVariable, margin: number): ArrayRow {
        let inverse = false
        if (margin !== 0) {
            let m = margin

            if (m < 0) {
                m = -1 * m
                inverse = true
            }

            this.mConstantValue = m
        }

        if (!inverse) {
            this.variables.put(variableA, -1)
            this.variables.put(variableB, 1)
        } else {
            this.variables.put(variableA, 1)
            this.variables.put(variableB, -1)
        }

        return this
    }

    createRowEqualsConstant(variableA: SolverVariable, value: number): ArrayRow {
        let variable = variableA
        if (value < 0) {
            this.mConstantValue = -1 * value
            this.variables.put(variable, 1)
        } else {
            this.mConstantValue = value;
            this.variables.put(variable, -1);
        }
        return this;
    }

    addSingleError(error: SolverVariable, sign: number): ArrayRow {
        this.variables.put(error, sign)

        return this
    }

    createRowGreaterThanConstant(a: SolverVariable, b: number, slack: SolverVariable) {
        this.mConstantValue = b
        this.variables.put(a, -1)
        return this
    }

    createRowGreaterThan(variableA: SolverVariable, variableB: SolverVariable, slack: SolverVariable, margin: number) {
        let inverse = false

        if (margin !== 0) {
            let m = margin

            if (m < 0) {
                m = -1 * m
                inverse = true
            }
            this.mConstantValue = m
        }

        if (!inverse) {
            this.variables.put(variableA, -1);
            this.variables.put(variableB, 1);
            this.variables.put(slack, 1);
        } else {
            this.variables.put(variableA, 1);
            this.variables.put(variableB, -1);
            this.variables.put(slack, -1);
        }
        return this;
    }

    createRowLowerThan(variableA: SolverVariable, variableB: SolverVariable, slack: SolverVariable, margin: number) {
        let inverse = false

        if (margin !== 0) {
            let m = margin

            if (m < 0) {
                m = -1 * m
                inverse = true
            }

            this.mConstantValue = m
        }

        if (!inverse) {
            this.variables.put(variableA, -1);
            this.variables.put(variableB, 1);
            this.variables.put(slack, -1);
        } else {
            this.variables.put(variableA, 1);
            this.variables.put(variableB, -1);
            this.variables.put(slack, 1);
        }
        return this;
    }

    createRowEqualMatchDimensions(currentWeight: number, totalWeights: number, nextWeight: number,
                                  variableStartA: SolverVariable, variableEndA: SolverVariable,
                                  variableStartB: SolverVariable, variableEndB: SolverVariable): ArrayRow {
        this.mConstantValue = 0

        if (totalWeights === 0 || (currentWeight === nextWeight)) {
            // endA - startA == endB - startB
            // 0 = startA - endA + endB - startB
            this.variables.put(variableStartA, 1);
            this.variables.put(variableEndA, -1);
            this.variables.put(variableEndB, 1);
            this.variables.put(variableStartB, -1);
        } else {
            if (currentWeight == 0) {
                this.variables.put(variableStartA, 1);
                this.variables.put(variableEndA, -1);
            } else if (nextWeight == 0) {
                this.variables.put(variableStartB, 1);
                this.variables.put(variableEndB, -1);
            } else {
                let cw = currentWeight / totalWeights;
                let nw = nextWeight / totalWeights;
                let w = cw / nw;

                // endA - startA == w * (endB - startB)
                // 0 = startA - endA + w * (endB - startB)
                this.variables.put(variableStartA, 1);
                this.variables.put(variableEndA, -1);
                this.variables.put(variableEndB, w);
                this.variables.put(variableStartB, -w);
            }
        }

        return this
    }

    createRowEqualDimension(currentWeight: number, totalWeights: number, nextWeight: number,
                            variableStartA: SolverVariable, marginStartA: number,
                            variableEndA: SolverVariable, marginEndA: number,
                            variableStartB: SolverVariable, marginStartB: number,
                            variableEndB: SolverVariable, marginEndB: number): ArrayRow {

        if (totalWeights == 0 || (currentWeight == nextWeight)) {
            this.mConstantValue = -marginStartA - marginEndA + marginStartB + marginEndB;
            this.variables.put(variableStartA, 1);
            this.variables.put(variableEndA, -1);
            this.variables.put(variableEndB, 1);
            this.variables.put(variableStartB, -1);
        } else {
            let cw = currentWeight / totalWeights;
            let nw = nextWeight / totalWeights;
            let w = cw / nw;

            this.mConstantValue = -marginStartA - marginEndA + w * marginStartB + w * marginEndB;
            this.variables.put(variableStartA, 1);
            this.variables.put(variableEndA, -1);
            this.variables.put(variableEndB, w);
            this.variables.put(variableStartB, -w);
        }

        return this
    }

    createRowCentering(variableA: SolverVariable, variableB: SolverVariable,
                       marginA: number, bias: number, variableC: SolverVariable,
                       variableD: SolverVariable, marginB: number) {

        if (variableB === variableC) {
            // centering on the same position
            // B - A == D - B
            // 0 = A + D - 2 * B
            this.variables.put(variableA, 1);
            this.variables.put(variableD, 1);
            this.variables.put(variableB, -2);
            return this;
        }
        if (bias === 0.5) {
            // don't bother applying the bias, we are centered
            // A - B = C - D
            // 0 = A - B - C + D
            // with margin:
            // A - B - Ma = C - D - Mb
            // 0 = A - B - C + D - Ma + Mb
            this.variables.put(variableA, 1)
            this.variables.put(variableB, -1)
            this.variables.put(variableC, -1)
            this.variables.put(variableD, 1)
            if (marginA > 0 || marginB > 0) {
                this.mConstantValue = -marginA + marginB;
            }
        } else if (bias <= 0) {
            // A = B + m
            this.variables.put(variableA, -1);
            this.variables.put(variableB, 1);
            this.mConstantValue = marginA;
        } else if (bias >= 1) {
            // D = C - m
            this.variables.put(variableD, -1);
            this.variables.put(variableC, 1);
            this.mConstantValue = -marginB;
        } else {
            this.variables.put(variableA, 1 * (1 - bias));
            this.variables.put(variableB, -1 * (1 - bias));
            this.variables.put(variableC, -1 * bias);
            this.variables.put(variableD, 1 * bias);
            if (marginA > 0 || marginB > 0) {
                this.mConstantValue = -marginA * (1 - bias) + marginB * bias;
            }
        }
        return this;
    }

    addErrorToSystem(system: LinearSystem, strength: number): ArrayRow { // addError
        this.variables.put(system.createErrorVariable(strength, "ep"), -1)
        this.variables.put(system.createErrorVariable(strength, "em"), 1)

        return this
    }

    createRowDimensionPercent(variableA: SolverVariable, variableC: SolverVariable, percent: number) {
        this.variables.put(variableA, -1)
        this.variables.put(variableC, percent)

        return this
    }

    createRowDimensionRatio(variableA: SolverVariable, variableB: SolverVariable,
                            variableC: SolverVariable, variableD: SolverVariable,
                            ratio: number) {

        this.variables.put(variableA, -1);
        this.variables.put(variableB, 1);
        this.variables.put(variableC, ratio);
        this.variables.put(variableD, -ratio);
        return this;
    }

    createRowWithAngle(at: SolverVariable, ab: SolverVariable, bt: SolverVariable, bb: SolverVariable, angleComponent: number) {
        this.variables.put(bt, 0.5);
        this.variables.put(bb, 0.5);
        this.variables.put(at, -0.5);
        this.variables.put(ab, -0.5);
        this.mConstantValue = -angleComponent;
        return this;
    }

    sizeInBytes() {
        let size = 0

        if (this.mVariable !== null) {
            size += 4
        }

        size += 4
        size += 4

        size += this.variables.sizeInBytes()

        return size
    }

    ensurePositiveConstant() {
        if (this.mConstantValue < 0) {
            this.mConstantValue *= -1
            this.variables.invert()
        }
    }

    chooseSubject(system: LinearSystem) {
        let addedExtra = false
        let pivotCandidate = this.chooseSubjectInVariables(system)

        if (pivotCandidate === null) {
            addedExtra = true
        } else {
            this.pivot(pivotCandidate)
        }

        if (this.variables.getCurrentSize() === 0) {
            this.mIsSimpleDefinition = true
        }

        return addedExtra
    }

    chooseSubjectInVariables(system: LinearSystem): SolverVariable | null {
        let restrictedCandidate: SolverVariable | null = null;
        let unrestrictedCandidate: SolverVariable | null = null;
        let unrestrictedCandidateAmount = 0;
        let restrictedCandidateAmount = 0;
        let unrestrictedCandidateIsNew = false;
        let restrictedCandidateIsNew = false;

        const currentSize = this.variables.getCurrentSize();

        for (let i = 0; i < currentSize; i++) {
            let amount = this.variables.getVariableValue(i)

            let variable = this.variables.getVariable(i)!

            if (variable.mType === SolverVariableType.UNRESTRICTED) {
                if (unrestrictedCandidate == null) {
                    unrestrictedCandidate = variable;
                    unrestrictedCandidateAmount = amount;
                    unrestrictedCandidateIsNew = this.isNew(variable, system);
                } else if (unrestrictedCandidateAmount > amount) {
                    unrestrictedCandidate = variable;
                    unrestrictedCandidateAmount = amount;
                    unrestrictedCandidateIsNew = this.isNew(variable, system);
                } else if (!unrestrictedCandidateIsNew && this.isNew(variable, system)) {
                    unrestrictedCandidate = variable;
                    unrestrictedCandidateAmount = amount;
                    unrestrictedCandidateIsNew = true;
                }
            } else if (unrestrictedCandidate == null) {
                if (amount < 0) {
                    if (restrictedCandidate == null) {
                        restrictedCandidate = variable;
                        restrictedCandidateAmount = amount;
                        restrictedCandidateIsNew = this.isNew(variable, system);
                    } else if (restrictedCandidateAmount > amount) {
                        restrictedCandidate = variable;
                        restrictedCandidateAmount = amount;
                        restrictedCandidateIsNew = this.isNew(variable, system);
                    } else if (!restrictedCandidateIsNew && this.isNew(variable, system)) {
                        restrictedCandidate = variable;
                        restrictedCandidateAmount = amount;
                        restrictedCandidateIsNew = true;
                    }
                }
            }
        }

        if (unrestrictedCandidate != null) {
            return unrestrictedCandidate;
        }
        return restrictedCandidate
    }

    isNew(variable: SolverVariable, system: LinearSystem) {
        if (ArrayRow.FULL_NEW_CHECK) {
            let isNew = true;
            for (let i = 0; i < system.mNumRows; i++) {
                let row = system.mRows[i]!
                if (row.hasVariable(variable)) {
                    isNew = false;
                }
            }
            if (variable.usageInRowCount <= 1 != isNew) {
                console.log("Problem with usage tracking");
            }
            return isNew;
        }
        // We maintain a usage count -- variables are ref counted if they are present
        // in the right side of a row or not. If the count is zero or one, the variable
        // is new (if one, it means it exist in a row, but this is the row we insert)
        return variable.usageInRowCount <= 1;
    }

    pivot(v: SolverVariable) {
        if (this.mVariable !== null) {
            this.variables.put(this.mVariable, -1)
            this.mVariable.mDefinitionId = -1
            this.mVariable = null
        }

        let amount = this.variables.remove(v, true)! * -1
        this.mVariable = v

        if (amount === 1) {
            return
        }

        const val = this.mConstantValue

        this.mConstantValue = this.mConstantValue / amount

        console.log("[pivoting]", val, this.mConstantValue)

        this.variables.divideByAmount(amount)
    }

    isEmpty() {
        return (this.mVariable === null && this.mConstantValue === 0 && this.variables.getCurrentSize() === 0)
    }

    updateFromRow(system: LinearSystem, definition: ArrayRow, removeFromDefinition: boolean) {
        let value = this.variables.use(definition, removeFromDefinition)

        this.mConstantValue += definition.mConstantValue * value;
        if (removeFromDefinition) {
            definition.mVariable!.removeFromRow(this);
        }
        if (LinearSystem.SIMPLIFY_SYNONYMS
            && this.mVariable != null && this.variables.getCurrentSize() == 0) {
            this.mIsSimpleDefinition = true;
            system.hasSimpleDefinition = true;
        }
    }

    updateFromFinalVariable(system: LinearSystem, variable: SolverVariable, removeFromDefinition: boolean): void {
        if (variable == null || !variable.isFinalValue) {
            return;
        }
        let value = this.variables.get(variable);
        this.mConstantValue += variable.computedValue * value;
        this.variables.remove(variable, removeFromDefinition);
        if (removeFromDefinition) {
            variable.removeFromRow(this);
        }
        if (LinearSystem.SIMPLIFY_SYNONYMS
            && this.variables.getCurrentSize() === 0) {
            this.mIsSimpleDefinition = true;
            system.hasSimpleDefinition = true;
        }
    }

    updateFromSynonymVariable(system: LinearSystem, variable: SolverVariable, removeFromDefinition: boolean) {
        if (variable == null || !variable.mIsSynonym) {
            return;
        }
        let value = this.variables.get(variable);
        this.mConstantValue += variable.mSynonymDelta * value;
        this.variables.remove(variable, removeFromDefinition);
        if (removeFromDefinition) {
            variable.removeFromRow(this);
        }
        this.variables.add(system.mCache.mIndexedVariables[variable.mSynonym]!,
            value, removeFromDefinition);
        if (LinearSystem.SIMPLIFY_SYNONYMS
            && this.variables.getCurrentSize() === 0) {
            this.mIsSimpleDefinition = true;
            system.hasSimpleDefinition = true;
        }
    }

    pickPivotInVariables(avoid: boolean[] | null, exclude: SolverVariable | null) {
        let all = true;
        let value = 0;
        let pivot: SolverVariable | null = null;
        let pivotSlack: SolverVariable | null = null;
        let valueSlack = 0;

        const currentSize = this.variables.getCurrentSize();

        console.log("####picking pivot point####")
        console.log("   variables:", this.variables)
        console.log("####                   ####")

        for (let i = 0; i < currentSize; i++) {
            let currentValue = this.variables.getVariableValue(i);
            if (currentValue < 0) {
                // We can return the first negative candidate as in ArrayLinkedVariables
                // they are already sorted by id
                let v = this.variables.getVariable(i)!
                if (!((avoid != null && avoid[v.id]) || (v == exclude))) {
                    if (all) {
                        if (v.mType == SolverVariableType.SLACK
                            || v.mType == SolverVariableType.ERROR) {
                            if (currentValue < value) {
                                value = currentValue;
                                pivot = v;
                            }
                        }
                    } else {
                        if (v.mType == SolverVariableType.SLACK) {
                            if (currentValue < valueSlack) {
                                valueSlack = currentValue;
                                pivotSlack = v;
                            }
                        } else if (v.mType == SolverVariableType.ERROR) {
                            if (currentValue < value) {
                                value = currentValue;
                                pivot = v;
                            }
                        }
                    }
                }
            }
        }

        console.log("[pivot] returning", pivot)

        if (all) {
            return pivot;
        }
        return pivot != null ? pivot : pivotSlack;
    }

    pickPivot(exclude: SolverVariable) {
        return this.pickPivotInVariables(null, exclude)
    }

    getPivotCandidate(system: LinearSystem, avoid: boolean[]): SolverVariable | null {
        return this.pickPivotInVariables(avoid, null);
    }

    clear(): void {
        this.variables.clear()
        this.mVariable = null
        this.mConstantValue = 0
    }

    initFromRow(row: Row): void {
        if (row instanceof ArrayRow) {
            let copiedRow = row as ArrayRow
            this.mVariable = null
            this.variables.clear()

            for (let i = 0; i < copiedRow.variables.getCurrentSize(); i++) {
                let v = copiedRow.variables.getVariable(i)!;
                let val = copiedRow.variables.getVariableValue(i);
                this.variables.add(v, val, true);
            }
        }
    }

    addError(error: SolverVariable): void {
        let weight = 1;
        if (error.strength == SolverVariable.STRENGTH_LOW) {
            weight = 1;
        } else if (error.strength == SolverVariable.STRENGTH_MEDIUM) {
            weight = 1E3;
        } else if (error.strength == SolverVariable.STRENGTH_HIGH) {
            weight = 1E6;
        } else if (error.strength == SolverVariable.STRENGTH_HIGHEST) {
            weight = 1E9;
        } else if (error.strength == SolverVariable.STRENGTH_EQUALITY) {
            weight = 1E12;
        }
        this.variables.put(error, weight);
    }

    getKey(): SolverVariable | null {
        return this.mVariable;
    }


    updateFromSystem(system: LinearSystem): void {
        if (system.mRows.length === 0) {
            return;
        }

        let done = false;

        console.log("[APC] [UFS] start")

        while (!done) {
            let currentSize = this.variables.getCurrentSize();
            console.log("[APC] [UFS] currentSize")

            for (let i = 0; i < currentSize; i++) {
                // TODO here?
                let variable = this.variables.getVariable(i)!
                console.log("[APC] [UFS] var", variable)

                if (variable.mDefinitionId !== -1 || variable!.isFinalValue || variable!.mIsSynonym) {
                    this.mVariablesToUpdate.push(variable!)//this.mVariablesToUpdate.add(variable);
                }

                console.log("[APC] [UFS] got to for end")
            }

            console.log("[APC] [UFS] for end")

            const size = this.mVariablesToUpdate.length//this.mVariablesToUpdate.size();
            if (size > 0) {
                for (let i = 0; i < size; i++) {
                    let variable = this.mVariablesToUpdate[i] //this.mVariablesToUpdate.get(i);
                    if (variable.isFinalValue) {
                        this.updateFromFinalVariable(system, variable, true);
                    } else if (variable.mIsSynonym) {
                        this.updateFromSynonymVariable(system, variable, true);
                    } else {
                        this.updateFromRow(system, system.mRows[variable.mDefinitionId]!, true);
                    }
                }
                this.mVariablesToUpdate = [] //this.mVariablesToUpdate.clear();
            } else {
                done = true;
            }
        }

        console.log("[APC] [UFS] while end")

        if (LinearSystem.SIMPLIFY_SYNONYMS
            && this.mVariable != null && this.variables.getCurrentSize() == 0) {
            this.mIsSimpleDefinition = true;
            system.hasSimpleDefinition = true;
        }
    }

}

export namespace ArrayRow {
    export interface ArrayRowVariables {
        getCurrentSize(): number

        getVariable(index: number): SolverVariable | null

        getVariableValue(index: number): number

        // @TODO: add description
        get(variable: SolverVariable): number

        // @TODO: add description
        indexOf(variable: SolverVariable): number

        // @TODO: add description
        display(): void

        // @TODO: add description
        clear(): void

        // @TODO: add description
        contains(variable: SolverVariable): boolean

        // @TODO: add description
        put(variable: SolverVariable, value: number): void

        // @TODO: add description
        sizeInBytes(): number

        // @TODO: add description
        invert(): void

        // @TODO: add description
        remove(v: SolverVariable, removeFromDefinition: boolean): number | null

        // @TODO: add description
        divideByAmount(amount: number): void

        // @TODO: add description
        add(v: SolverVariable, value: number, removeFromDefinition: boolean): void

        // @TODO: add description
        use(definition: ArrayRow, removeFromDefinition: boolean): number
    }
}

//

export class PriorityGoalRow extends ArrayRow {
    static readonly EPSILON = 0.0001

    private mTableSize = 128;
    private mArrayGoals: (SolverVariable | null)[] = new Array(this.mTableSize)
    private mSortArray: (SolverVariable | null)[] = new Array(this.mTableSize)
    private mNumGoals = 0;
    mAccessor: GoalVariableAccessor = new GoalVariableAccessor(this, this);

    clear() {
        this.mNumGoals = 0
        this.mConstantValue = 0
    }

    mCache: Cache

    constructor(cache: Cache) {
        super(cache);

        this.mCache = cache
    }

    isEmpty(): boolean {
        return this.mNumGoals == 0
    }

    static readonly NOT_FOUND = -1

    getPivotCandidate(system: LinearSystem, avoid: boolean[]): SolverVariable | null {
        console.log("pivot candidate", this.mArrayGoals)

        let pivot = PriorityGoalRow.NOT_FOUND;
        for (let i = 0; i < this.mNumGoals; i++) {
            let variable = (this.mArrayGoals)[i]!
            if (avoid[variable.id]) {
                continue;
            }
            this.mAccessor.init(variable);
            // console.log("##mAccessor", i, pivot, variable.mGoalStrengthVector)
            if (pivot === PriorityGoalRow.NOT_FOUND) {
                // console.log("##mAccessor, NOT FOUND", this.mAccessor.isNegative(true))
                if (this.mAccessor.isNegative()) {
                    pivot = i;
                    // console.log("##mAccessor, neg", pivot)
                }
            } else if (this.mAccessor.isSmallerThan((this.mArrayGoals)[pivot]!)) {
                // console.log("##mAccessor, sm", pivot)
                pivot = i;
            }
        }

        if (pivot !== -1 && !PriorityGoalRow.sLogged) {
            PriorityGoalRow.sLogged = true

            console.log("##mAccessor", pivot, this.mArrayGoals[pivot])
        }

        if (pivot === PriorityGoalRow.NOT_FOUND) {
            return null;
        }

        return (this.mArrayGoals)[pivot];
    }

    static sLogged = false

    addError(error: SolverVariable) {
        this.mAccessor.init(error)
        this.mAccessor.reset()
        error.mGoalStrengthVector[error.strength] = 1

        this.addToGoal(error)
    }

    addToGoal(variable: SolverVariable) {
        if (this.mNumGoals + 1 > this.mArrayGoals.length) {
            this.mArrayGoals = Arrays.copy(this.mArrayGoals, this.mArrayGoals.length * 2)//Arrays.copyOf(mArrayGoals, mArrayGoals.length * 2);
            this.mSortArray = Arrays.copy(this.mArrayGoals, this.mArrayGoals.length * 2)//Arrays.copyOf(mArrayGoals, mArrayGoals.length * 2);
        }
        (this.mArrayGoals)[this.mNumGoals] = variable;
        this.mNumGoals++;

        if (this.mNumGoals > 1 && (this.mArrayGoals)[this.mNumGoals - 1]!.id > variable.id) {
            for (let i = 0; i < this.mNumGoals; i++) {
                (this.mSortArray)[i] = (this.mArrayGoals)[i];
            }
            /* TODO
            Arrays.sort(mSortArray, 0, mNumGoals, new Comparator<SolverVariable>() {
            @Override
            public int compare(SolverVariable variable1, SolverVariable variable2) {
                    return variable1.id - variable2.id;
                }
            });
            */
            for (let i = 0; i < this.mNumGoals; i++) {
                (this.mArrayGoals)[i] = (this.mSortArray)[i];
            }
        }

        variable.inGoal = true;
        variable.addToRow(this);
    }

    removeGoal(variable: SolverVariable) {
        for (let i = 0; i < this.mNumGoals; i++) {
            if ((this.mArrayGoals)[i] == variable) {
                for (let j = i; j < this.mNumGoals - 1; j++) {
                    (this.mArrayGoals)[j] = (this.mArrayGoals)[j + 1];
                }
                this.mNumGoals--;
                variable.inGoal = false;
                return;
            }
        }
    }

    updateFromRow(system: LinearSystem, definition: ArrayRow, removeFromDefinition: boolean) {
        let goalVariable = definition.mVariable;
        if (goalVariable == null) {
            return;
        }

        let rowVariables = definition.variables;
        let currentSize = rowVariables.getCurrentSize();
        for (let i = 0; i < currentSize; i++) {
            let solverVariable = rowVariables.getVariable(i);
            let value = rowVariables.getVariableValue(i);
            this.mAccessor.init(solverVariable!);
            if (this.mAccessor.addToGoal(goalVariable, value)) {
                this.addToGoal(solverVariable!);
            }
            this.mConstantValue += definition.mConstantValue * value;
        }
        this.removeGoal(goalVariable);
    }

    public toString() {
        let result = "";
        result += " goal -> (" + this.mConstantValue + ") : ";
        for (let i = 0; i < this.mNumGoals; i++) {
            let v = (this.mArrayGoals)[i];
            this.mAccessor.init(v!);
            result += this.mAccessor + " ";
        }
        return result;
    }
}

class GoalVariableAccessor {
    private priorityGoalRow: PriorityGoalRow

    mVariable: SolverVariable | null = null
    mRow: PriorityGoalRow

    constructor(row: PriorityGoalRow, enclosing: PriorityGoalRow) {
        this.priorityGoalRow = enclosing
        this.mRow = row
    }

    init(variable: SolverVariable) {
        this.mVariable = variable
    }

    public addToGoal(other: SolverVariable, value: number) {
        if (this.mVariable!.inGoal) {
            let empty = true;
            for (let i = 0; i < SolverVariable.MAX_STRENGTH; i++) {
                this.mVariable!.mGoalStrengthVector[i] += other.mGoalStrengthVector[i] * value;
                let v = (this.mVariable)!.mGoalStrengthVector[i];
                if (Math.abs(v) < PriorityGoalRow.EPSILON) {
                    this.mVariable!.mGoalStrengthVector[i] = 0;
                } else {
                    empty = false;
                }
            }
            if (empty) {
                this.priorityGoalRow.removeGoal(this.mVariable!);
            }
        } else {
            for (let i = 0; i < SolverVariable.MAX_STRENGTH; i++) {
                let strength = other.mGoalStrengthVector[i];
                if (strength != 0) {
                    let v = value * strength;
                    if (Math.abs(v) < PriorityGoalRow.EPSILON) {
                        v = 0;
                    }
                    this.mVariable!.mGoalStrengthVector[i] = v;
                } else {
                    this.mVariable!.mGoalStrengthVector[i] = 0;
                }
            }
            return true;
        }
        return false;
    }

    add(other: SolverVariable) {
        for (let i = 0; i < SolverVariable.MAX_STRENGTH; i++) {
            this.mVariable!.mGoalStrengthVector[i] += other.mGoalStrengthVector[i];
            let value = this.mVariable!.mGoalStrengthVector[i];
            if (Math.abs(value) < PriorityGoalRow.EPSILON) {
                this.mVariable!.mGoalStrengthVector[i] = 0;
            }
        }
    }

    isNegative(log: boolean = false) {
        console.log("[ACS] check")
        for (let i = SolverVariable.MAX_STRENGTH - 1; i >= 0; i--) {
            let value = this.mVariable!.mGoalStrengthVector[i];
            console.log("[ACS] value", value)

            if (log) {
                console.log("##mAccessor", value)
            }

            // if (value > 0) { TODO changed from og
            //     return false;
            // }
            if (value < 0) {
                return true;
            }
        }
        return false;
    }

    public isSmallerThan(other: SolverVariable) {
        for (let i = SolverVariable.MAX_STRENGTH - 1; i >= 0; i--) {
            let comparedValue = other.mGoalStrengthVector[i];
            let value = this.mVariable!.mGoalStrengthVector[i];
            if (value === comparedValue) {
                continue;
            }
            return value < comparedValue;
        }
        return false;
    }

    isNull() {
        for (let i = 0; i < SolverVariable.MAX_STRENGTH; i++) {
            if (this.mVariable!.mGoalStrengthVector[i] != 0) {
                return false;
            }
        }
        return true;
    }

    public reset() {
        this.mVariable!.mGoalStrengthVector.fill(0)
    }

    toString() {
        let result = "[ ";
        if (this.mVariable != null) {
            for (let i = 0; i < SolverVariable.MAX_STRENGTH; i++) {
                result += this.mVariable.mGoalStrengthVector[i] + " ";
            }
        }
        result += "] " + this.mVariable;
        return result;
    }

}

//

export class SolverVariable {
    private static readonly VAR_USE_HASH = false
    private static readonly DO_NOT_USE = false

    static readonly STRENGTH_NONE = 0
    static readonly STRENGTH_LOW = 1
    static readonly STRENGTH_MEDIUM = 2
    static readonly STRENGTH_HIGH = 3
    static readonly STRENGTH_HIGHEST = 4
    static readonly STRENGTH_EQUALITY = 5
    static readonly STRENGTH_BARRIER = 6
    static readonly STRENGTH_CENTERING = 7
    static readonly STRENGTH_FIXED = 8

    private static sUniqueSlackId = 1
    private static sUniqueErrorId = 1
    private static sUniqueUnrestrictedId = 1
    private static sUniqueConstantId = 1
    private static sUniqueId = 1

    public inGoal: boolean = false

    private mName: string | null = null

    public id = -1;
    mDefinitionId = -1;
    public strength = 0;
    public computedValue: number = 0
    public isFinalValue = false;

    static readonly MAX_STRENGTH = 9;
    mStrengthVector: number[] = new Array<number>(SolverVariable.MAX_STRENGTH); // float
    mGoalStrengthVector: number[] = new Array<number>(SolverVariable.MAX_STRENGTH);

    mType: SolverVariableType = SolverVariableType.UNKNOWN;

    mClientEquations: (ArrayRow | null)[] = new Array<ArrayRow | null>(16)
    mClientEquationsCount = 0;
    public usageInRowCount = 0;
    mIsSynonym = false;
    mSynonym = -1;
    mSynonymDelta = 0;

    static increaseErrorId() {
        this.sUniqueErrorId++
    }

    private static getUniqueName(type: SolverVariableType, prefix: string | null): string {
        if (prefix !== null) {
            return prefix + this.sUniqueErrorId
        }

        switch (type) {
            case SolverVariableType.UNRESTRICTED:
                return `U${++this.sUniqueUnrestrictedId}`
            case SolverVariableType.CONSTANT:
                return `C${++this.sUniqueConstantId}`
            case SolverVariableType.SLACK:
                return `S${++this.sUniqueSlackId}`
            case SolverVariableType.ERROR:
                return `e${++this.sUniqueErrorId}`
            case SolverVariableType.UNKNOWN:
                return `V${++this.sUniqueId}`
        }

        throw new Error("type")
    }

    constructor(type: SolverVariableType, name?: string | null, prefix?: string | null) {
        if (name) {
            this.mName = name
            this.mType = type
        } else if (prefix) {
            this.mType = type
        }
    }

    clearStrengths(): void {
        for (let i = 0; i < SolverVariable.MAX_STRENGTH; i++) {
            this.mStrengthVector[i] = 0
        }
    }

    strengthsToString(): string {
        let representation: string = this + "["
        let negative = false
        let empty = true

        for (let j = 0; j < this.mStrengthVector.length; j++) {
            representation += this.mStrengthVector[j];
            if (this.mStrengthVector[j] > 0) {
                negative = false;
            } else if (this.mStrengthVector[j] < 0) {
                negative = true;
            }
            if (this.mStrengthVector[j] != 0) {
                empty = false;
            }
            if (j < this.mStrengthVector.length - 1) {
                representation += ", ";
            } else {
                representation += "] ";
            }
        }

        if (negative) {
            representation += " (-)"
        }

        if (empty) {
            representation += " (*)"
        }

        return representation
    }

    mInRows: Set<ArrayRow> | null = SolverVariable.VAR_USE_HASH ? new Set<ArrayRow>() : null

    addToRow(row: ArrayRow) {
        for (let i = 0; i < this.mClientEquationsCount; i++) {
            if (this.mClientEquations[i] === row) {
                return
            }
        }

        if (this.mClientEquationsCount >= this.mClientEquations.length) {
            let copy = new Array<ArrayRow>(this.mClientEquations.length * 2).map((it, i) => {
                if (i < this.mClientEquations.length) {
                    return this.mClientEquations[i]
                } else return it
            })
            this.mClientEquations = [...copy]
        }

        this.mClientEquations[this.mClientEquationsCount] = row
        this.mClientEquationsCount++
    }

    removeFromRow(row: ArrayRow) {
        const count = this.mClientEquationsCount;
        for (let i = 0; i < count; i++) {
            if (this.mClientEquations[i] == row) {
                for (let j = i; j < count - 1; j++) {
                    this.mClientEquations[j] = this.mClientEquations[j + 1];
                }
                this.mClientEquationsCount--;
                return;
            }
        }
    }

    updateReferencesWithNewDefinition(system: LinearSystem, definition: ArrayRow) {
        const count = this.mClientEquationsCount;
        for (let i = 0; i < count; i++) {
            this.mClientEquations[i]?.updateFromRow(system, definition, false);
        }
        this.mClientEquationsCount = 0;
    }

    setFinalValue(system: LinearSystem, value: number) {
        this.computedValue = value
        this.isFinalValue = true
        this.mIsSynonym = false
        this.mSynonym = -1
        this.mSynonymDelta = 0

        const count = this.mClientEquationsCount

        this.mDefinitionId = -1
        for (let i = 0; i < count; i++) {
            this.mClientEquations[i]?.updateFromFinalVariable(system, this, false)
        }

        this.mClientEquationsCount = 0
    }

    setSynonym(system: LinearSystem, synonymVariable: SolverVariable, value: number) {
        this.mIsSynonym = true
        this.mSynonym = synonymVariable.id
        this.mSynonymDelta = value

        const count = this.mClientEquationsCount

        this.mDefinitionId = -1
        for (let i = 0; i < count; i++) {
            this.mClientEquations[i]?.updateFromSynonymVariable(system, this, false)
        }

        this.mClientEquationsCount = 0
        // system.displayReadableRows()
    }

    reset() {
        this.mName = null
        this.mType = SolverVariableType.UNKNOWN
        this.strength = SolverVariable.STRENGTH_NONE
        this.id = -1
        this.mDefinitionId = -1
        this.computedValue = 0
        this.isFinalValue = false
        this.mIsSynonym = false
        this.mSynonym = -1
        this.mSynonymDelta = 0

        const count = this.mClientEquationsCount;
        for (let i = 0; i < count; i++) {
            this.mClientEquations[i] = null;
        }
        this.mClientEquationsCount = 0;

        this.usageInRowCount = 0
        this.inGoal = false
        this.mGoalStrengthVector.fill(0)
    }

    getName() {
        return this.mName
    }

    setName(name: string) {
        this.mName = name
    }

    setType(type: SolverVariableType, prefix: string | null) {
        this.mType = type
    }

    compareTo(v: SolverVariable) {
        return this.id - v.id
    }

    toString() {
        let result = ""
        if (this.mName !== null) {
            result += this.mName
        } else {
            result += this.id
        }

        return result
    }
}

//

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
        console.log("[TABLE]", this.mCache.mIndexedVariables)
        this.mCache.mIndexedVariables = Arrays.copy(this.mCache.mIndexedVariables, this.mTableSize) //Arrays.copyOf(mCache.mIndexedVariables, mTableSize);
        console.log("[TABLE]", this.mCache.mIndexedVariables)
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

    public createObjectVariable(anchor: ConstraintAnchor | null): SolverVariable | null {
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

            if (variable!.id === -1
                || variable!.id > this.mVariablesID
                || this.mCache.mIndexedVariables[variable!.id] == null) {
                if (variable!.id !== -1) {
                    variable!.reset();
                }

                this.mVariablesID++;
                this.mNumColumns++;
                variable!.id = this.mVariablesID;
                variable!.mType = SolverVariableType.UNRESTRICTED;
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

            console.log("[ROW-O]", "try cached row", row)

            if (row == null) {
                row = new ValuesRow(this.mCache);

                console.log("[ROW-O]", "not cached", row)

                LinearSystem.OPTIMIZED_ARRAY_ROW_CREATION++;
            } else {
                row.reset();
            }
        } else {
            row = this.mCache.mArrayRowPool.acquire();

            console.log("[ROW]", "try cached row", row)

            if (row == null) {
                row = new ArrayRow(this.mCache);
                LinearSystem.ARRAY_ROW_CREATION++;

                console.log("[ROW]", "not cached", row)
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
        console.log("CREATE VARIABLE")

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
        console.log("GET VARIABLE")
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
            console.log("solving goal is empty")

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

            console.log("[check] isFullySolved", fullySolved)

            console.log("GOAL", this.mGoal)

            if (!fullySolved) {
                this.minimizeGoal(this.mGoal);
            } else {
                this.computeValues();
            }
        } else {
            console.log("[update] noOpt")
            console.log("[GOAL]", this.mGoal)
            this.minimizeGoal(this.mGoal);
        }
    }

    minimizeGoal(goal: Row) {
        // First, let's make sure that the system is in Basic Feasible Solved Form (BFS), i.e.
        // all the constants of the restricted variables should be positive.
        if (LinearSystem.DEBUG || true) {
            console.log("minimize goal: " + goal);
        }
        // we don't need this for now as we incrementally built the system
        // goal.updateFromSystem(this); // was disabled TODO
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
            console.log("[APC] inc check")

            this.increaseTableSize();

            console.log("[APC] inc table size")
        }

        let added = false;

        if (!row.mIsSimpleDefinition) {
            console.log("[APC] SimDef check")

            // TODO problem here
            row.updateFromSystem(this);

            console.log("[APC] update from system")

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

        console.log("[APC] is simpdef")

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
        console.log("Linear System", this, this.mRows)

        let done = false;
        let tries = 0;
        for (let i = 0; i < this.mNumColumns; i++) {
            (this.mAlreadyTestedCandidates)[i] = false;
        }

        let returnMin = Number.MAX_VALUE

        while (!done) {
            tries++;

            if (tries >= 2 * this.mNumColumns) {
                return tries;
            }

            if (goal.getKey() != null) {
                (this.mAlreadyTestedCandidates)[goal.getKey()!.id] = true;
                console.log("not null key")
            }
            let pivotCandidate = goal.getPivotCandidate(this, this.mAlreadyTestedCandidates);
            console.log("C_pivot", pivotCandidate)

            if (pivotCandidate != null) {
                console.log("not null pc")

                if ((this.mAlreadyTestedCandidates)[pivotCandidate.id]) {
                    console.log("[done]", tries, returnMin)

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
                    if (variable.mType === SolverVariableType.UNRESTRICTED) {
                        // skip unrestricted variables equations (to only look at Cs)
                        console.log("[skip] unrestricted")
                        continue; //TODO changed
                    }
                    if (current.mIsSimpleDefinition) {
                        console.log("[skip] simple def")

                        continue;
                    }

                    if (current.hasVariable(pivotCandidate)) {
                        // the current row does contains the variable
                        // we want to pivot on
                        let a_j = current.variables.get(pivotCandidate);

                        console.log("new a_j", a_j)

                        if (a_j < 0) {
                            let value = -current.mConstantValue / a_j;
                            if (value < min) {
                                min = value;
                                pivotRowIndex = i;

                                // TODO debug
                                returnMin = min
                                console.log("[min] update", min)
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

        console.log("final", this.mRows)
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

        console.log("[SYSTEM]", "gt", row)

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
        console.log("LOWER")
        let row = this.createRow();
        let slack = this.createSlackVariable();
        slack.strength = 0;
        row.createRowLowerThan(a!, b!, slack, margin);
        if (strength !== SolverVariable.STRENGTH_FIXED) {
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
            console.log("[APC] [ADD] CHECK")

            a!.setFinalValue(this, b!.computedValue + margin);
            console.log("[APC] [ADD] null")

            return null;
        }

        if (LinearSystem.DO_NOT_USE && LinearSystem.USE_SYNONYMS && strength === SolverVariable.STRENGTH_FIXED
            && a!.mDefinitionId === -1 && margin === 0) {

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

        console.log("[APC] [ADD] no margin")

        let row = this.createRow()
        row.createRowEquals(a!, b!, margin)

        console.log("[APC] [ADD] create row")

        if (strength !== SolverVariable.STRENGTH_FIXED) {
            row.addErrorToSystem(this, strength)
        }

        console.log("[APC] [ADD] add error")

        console.log("[APC] [ADD-EQ] [CHECK]", row)

        // TODO problem here
        this.addConstraint(row)

        console.log("[APC] [ADD] add constraint")

        return row
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