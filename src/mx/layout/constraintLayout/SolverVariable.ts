import {LinearSystem} from "./LinearSystem";
import {ArrayRow} from "./ArrayRow";
import {AssertionError} from "assert";

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

        throw new AssertionError({message: "type"})
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

export enum SolverVariableType {
    UNRESTRICTED,
    CONSTANT,
    SLACK,
    ERROR,
    UNKNOWN
}