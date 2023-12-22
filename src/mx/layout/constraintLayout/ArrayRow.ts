import {LinearSystem, Row} from "./LinearSystem";
import {SolverVariable, SolverVariableType} from "./SolverVariable";
import ArrayRowVariables = ArrayRow.ArrayRowVariables;
import {ArrayLinkedVariables} from "./ArrayLinkedVariables";
import {Cache} from "./Cache";

export class ArrayRow implements Row {
    mVariable: SolverVariable | null = null
    mConstantValue = 0
    mUsed = false

    private static readonly FULL_NEW_CHECK = false

    private mVariablesToUpdate: SolverVariable[] = []

    public variables: ArrayRowVariables

    mIsSimpleDefinition = false

    constructor(cache?: Cache) {
        if (! cache) { // added
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

    createRowLowerThan (variableA: SolverVariable, variableB: SolverVariable, slack: SolverVariable, margin: number) {
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

    createRowEqualMatchDimensions (currentWeight: number, totalWeights: number, nextWeight: number,
                                   variableStartA: SolverVariable, variableEndA: SolverVariable,
                                   variableStartB: SolverVariable, variableEndB: SolverVariable): ArrayRow {
        this.mConstantValue = 0

        if (totalWeights == 0 || (currentWeight == nextWeight)) {
            // endA - startA == endB - startB
            // 0 = startA - endA + endB - startB
            this.variables.put(variableStartA, 1);
            this.variables.put(variableEndA, -1);
            this.variables.put(variableEndB, 1);
            this.variables.put(variableStartB, -1);
        }
        else {
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

    createRowEqualDimension (currentWeight: number, totalWeights: number, nextWeight: number,
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
        }
        else {
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

    createRowCentering (variableA: SolverVariable, variableB: SolverVariable,
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
        }
        else if (bias <= 0) {
            // A = B + m
            this.variables.put(variableA, -1);
            this.variables.put(variableB, 1);
            this.mConstantValue = marginA;
        } else if (bias >= 1) {
            // D = C - m
            this.variables.put(variableD, -1);
            this.variables.put(variableC, 1);
            this.mConstantValue = -marginB;
        }
        else {
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

    addErrorToSystem (system: LinearSystem, strength: number): ArrayRow { // addError
        this.variables.put(system.createErrorVariable(strength, "ep"), -1)
        this.variables.put(system.createErrorVariable(strength, "em"), 1)

        return this
    }

    createRowDimensionPercent (variableA: SolverVariable, variableC: SolverVariable, percent: number) {
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

    createRowWithAngle (at: SolverVariable, ab: SolverVariable, bt: SolverVariable, bb: SolverVariable, angleComponent: number) {
        this.variables.put(bt, 0.5);
        this.variables.put(bb, 0.5);
        this.variables.put(at, -0.5);
        this.variables.put(ab, -0.5);
        this.mConstantValue = -angleComponent;
        return this;
    }

    sizeInBytes () {
        let size = 0

        if (this.mVariable !== null) {
            size += 4
        }

        size += 4
        size += 4

        size += this.variables.sizeInBytes()

        return size
    }

    ensurePositiveConstant () {
        if (this.mConstantValue < 0) {
            this.mConstantValue *= -1
            this.variables.invert()
        }
    }

    chooseSubject (system: LinearSystem) {
        let addedExtra = false
        let pivotCandidate = this.chooseSubjectInVariables(system)

        if (pivotCandidate === null) {
            addedExtra = true
        }
        else {
            this.pivot(pivotCandidate)
        }

        if (this.variables.getCurrentSize() === 0) {
            this.mIsSimpleDefinition = true
        }

        return addedExtra
    }

    chooseSubjectInVariables (system: LinearSystem): SolverVariable | null {
        let restrictedCandidate: SolverVariable | null = null;
        let unrestrictedCandidate: SolverVariable | null = null;
        let unrestrictedCandidateAmount = 0;
        let restrictedCandidateAmount = 0;
        let unrestrictedCandidateIsNew = false;
        let restrictedCandidateIsNew = false;

        const currentSize = this.variables.getCurrentSize();

        for (let i = 0; i < currentSize; i ++) {
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
            }
            else if (unrestrictedCandidate == null) {
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

    isNew (variable: SolverVariable, system: LinearSystem) {
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

    pivot (v: SolverVariable) {
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

        this.mConstantValue = this.mConstantValue / amount
        this.variables.divideByAmount(amount)
    }

    isEmpty () {
        return (this.mVariable === null && this.mConstantValue === 0 && this.variables.getCurrentSize() === 0)
    }

    updateFromRow (system: LinearSystem, definition: ArrayRow, removeFromDefinition: boolean) {
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
            && this.variables.getCurrentSize() == 0) {
            this.mIsSimpleDefinition = true;
            system.hasSimpleDefinition = true;
        }
    }

    updateFromSynonymVariable (system: LinearSystem, variable: SolverVariable, removeFromDefinition: boolean) {
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
            && this.variables.getCurrentSize() == 0) {
            this.mIsSimpleDefinition = true;
            system.hasSimpleDefinition = true;
        }
    }

    pickPivotInVariables (avoid: boolean[] | null, exclude: SolverVariable | null) {
        let all = true;
        let value = 0;
        let pivot: SolverVariable | null = null;
        let pivotSlack: SolverVariable | null = null;
        let valueSlack = 0;

        const currentSize = this.variables.getCurrentSize();

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

        if (all) {
            return pivot;
        }
        return pivot != null ? pivot : pivotSlack;
    }

    pickPivot (exclude: SolverVariable) {
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
        if (system.mRows.length == 0) {
            return;
        }

        let done = false;

        while (!done) {
            let currentSize = this.variables.getCurrentSize();
            for (let i = 0; i < currentSize; i++) {
                let variable = this.variables.getVariable(i)!;
                if (variable.mDefinitionId !== -1 || variable!.isFinalValue || variable!.mIsSynonym) {
                    this.mVariablesToUpdate.push(variable!)//this.mVariablesToUpdate.add(variable);
                }
            }
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