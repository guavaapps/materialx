import {Cache} from "./Cache";
import {ArrayRow} from "./ArrayRow";
import {SolverVariable} from "./SolverVariable";
import {LinearSystem} from "./LinearSystem";
import {Arrays} from "./utils";

export class PriorityGoalRow extends ArrayRow {
    static readonly EPSILON = 0.0001

    private mTableSize = 128;
    private mArrayGoals: SolverVariable[] = new Array(this.mTableSize)
    private mSortArray: SolverVariable[] = new Array(this.mTableSize)
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
        let pivot = PriorityGoalRow.NOT_FOUND;
        for (let i = 0; i < this.mNumGoals; i++) {
            let variable = (this.mArrayGoals)[i];
            if (avoid[variable.id]) {
                continue;
            }
            this.mAccessor.init(variable);
            if (pivot == PriorityGoalRow.NOT_FOUND) {
                if (this.mAccessor.isNegative()) {
                    pivot = i;
                }
            } else if (this.mAccessor.isSmallerThan((this.mArrayGoals)[pivot])) {
                pivot = i;
            }
        }
        if (pivot == PriorityGoalRow.NOT_FOUND) {
            return null;
        }
        return (this.mArrayGoals)[pivot];
    }

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

        if (this.mNumGoals > 1 && (this.mArrayGoals)[this.mNumGoals - 1].id > variable.id) {
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
            this.mAccessor.init(v);
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

    isNegative() {
        for (let i = SolverVariable.MAX_STRENGTH - 1; i >= 0; i--) {
            let value = this.mVariable!.mGoalStrengthVector[i];
            if (value > 0) {
                return false;
            }
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
            if (value == comparedValue) {
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
