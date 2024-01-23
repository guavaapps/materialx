import {Cache} from "./Cache";
import {ArrayRow} from "./SolverVariable";
import {SolverVariable} from "./SolverVariable";
import {Arrays} from "./utils";

export class SolverVariableValues implements ArrayRow.ArrayRowVariables {
    private static sEpsilon = 0.001
    private readonly mNone = -1;
    private mSize = 16;
    private mHashSize = 16;

    mKeys: number[] = new Array<number>(this.mSize)
    mNextKeys: (number | null)[] = new Array(this.mSize)

    mVariables: (number | null)[] = new Array(this.mSize)
    mValues: (number | null)[] = new Array(this.mSize)
    mPrevious: (number | null)[] = new Array(this.mSize)
    mNext: (number | null)[] = new Array(this.mSize)
    mCount = 0;
    mHead = -1;

    private mRow: ArrayRow; // our owner
    // pointer to the system-wide cache, allowing access to SolverVariables
    protected mCache: Cache;

    constructor(row: ArrayRow, cache: Cache) {
        this.mRow = row
        this.mCache = cache
        this.clear()
    }

    getCurrentSize(): number {
        return this.mCount
    }

    getVariable(index: number): SolverVariable | null {
        console.log("[APC] [GET_VAR] check")

        const count = this.mCount;
        if (count === 0) {
            console.log("[APC] [GET_VAR] is 0")

            return null;
        }

        let j = this.mHead;
        for (let i = 0; i < count; i++) {
            if (i === index && j !== this.mNone) {
                console.log("[APC] [GET_VAR] found non-none index")

                let r = this.mCache.mIndexedVariables[(this.mVariables)[j]!];

                console.log("[APC] [GET_VAR] var", r)

                return r
            }
            j = (this.mNext)[j]!
            if (j === this.mNone) {
                break;
            }
        }
        return null;
    }

    getVariableValue(index: number): number {
        const count = this.mCount;
        let j = this.mHead;
        for (let i = 0;i < count;i++){
            if (i == index) {
                return (this.mValues)[j]!
            }
            j = (this.mNext)[j]!
            if (j == this.mNone) {
                break;
            }
        }
        return 0;
    }

    contains(variable: SolverVariable): boolean {
        return this.indexOf(variable) != this.mNone;
    }

    indexOf(variable: SolverVariable): number {
        if (this.mCount == 0 || variable == null) {
            return this.mNone;
        }
        let id = variable.id;
        let key = id % this.mHashSize;
        key = (this.mKeys)[key];
        if (key == this.mNone) {
            return this.mNone;
        }
        if ((this.mVariables)[key] == id) {
            return key;
        }
        while ((this.mNextKeys)[key] != this.mNone && (this.mVariables)[(this.mNextKeys)[key]!] != id) {
            key = (this.mNextKeys)[key]!
        }
        if ((this.mNextKeys)[key] == this.mNone) {
            return this.mNone;
        }
        if ((this.mVariables)[(this.mNextKeys)[key]!] == id) {
            return (this.mNextKeys)[key]!;
        }
        return this.mNone;
    }

    get(variable: SolverVariable): number {
        const index = this.indexOf(variable);
        if (index != this.mNone) {
            return (this.mValues)[index]!;
        }
        return 0;
    }

    display() {
        const count = this.mCount;
        console.log("{ ");
        for (let i = 0;i < count;i++){
            let v = this.getVariable(i);
            if (v == null) {
                continue;
            }
            console.log(v + " = " + this.getVariableValue(i) + " ");
        }
        console.log(" }");
    }

    toString() {
        let str = "hashCode()" + " { ";
        const count = this.mCount;
        for (let i = 0; i < count;i++){
            let v = this.getVariable(i);
            if (v == null) {
                continue;
            }
            str += v + " = " + this.getVariableValue(i) + " ";
            let index = this.indexOf(v);
            str += "[p: ";
            if ((this.mPrevious)[index] != this.mNone) {
                str += this.mCache.mIndexedVariables[(this.mVariables)[(this.mPrevious)[index]!]!];
            } else {
                str += "none";
            }
            str += ", n: ";
            if ((this.mNext)[index] != this.mNone) {
                str += this.mCache.mIndexedVariables[(this.mVariables)[(this.mNext)[index]!]!];
            } else {
                str += "none";
            }
            str += "]";
        }
        str += " }";
        return str;
    }

    clear() {
        const count = this.mCount;
        for (let i = 0; i < count; i++) {
            let v = this.getVariable(i);
            if (v != null) {
                v.removeFromRow(this.mRow);
            }
        }
        for (let i = 0; i < this.mSize;i++){
            (this.mVariables)[i] = this.mNone;
            (this.mNextKeys)[i] = this.mNone;
        }
        for (let i = 0; i < this.mHashSize; i++) {
            (this.mKeys)[i] = this.mNone;
        }
        let mCount = 0;
        let mHead = -1;
    }

    increaseSize() {
        let size = this.mSize * 2;
        this.mVariables = Arrays.copy(this.mVariables, size)//Arrays.copyOf(mVariables, size);
        this.mValues = Arrays.copy(this.mValues, size)// Arrays.copyOf(mValues, size);
        this.mPrevious = Arrays.copy(this.mPrevious, size)//Arrays.copyOf(mPrevious, size);
        this.mNext = Arrays.copy(this.mNext, size) //Arrays.copyOf(mNext, size);
        this.mNextKeys = Arrays.copy(this.mNextKeys, size) //Arrays.copyOf(mNextKeys, size);
        for (let i = this.mSize; i < size; i++){
            (this.mVariables)[i] = this.mNone;
            (this.mNextKeys)[i] = this.mNone;
        }
        this.mSize = size;
    }

    addToHashMap(variable: SolverVariable, index: number) {
        let hash = variable.id % this.mHashSize;
        let key = (this.mKeys)[hash];
        if (key == this.mNone) {
            (this.mKeys)[hash] = index;
        } else {
            while ((this.mNextKeys)[key] != this.mNone) {
                key = (this.mNextKeys)[key]!;
            }
            (this.mNextKeys)[key] = index;
        }
        (this.mNextKeys)[index] = this.mNone;
    }

    removeFromHashMap(variable: SolverVariable) {
        let hash = variable.id % this.mHashSize;
        let key = (this.mKeys)[hash];
        if (key == this.mNone) {
            return;
        }
        let id = variable.id;
        // let's first find it
        if ((this.mVariables)[key] == id) {
            (this.mKeys)[hash] = (this.mNextKeys)[key]!;
            (this.mNextKeys)[key] = this.mNone;
        } else {
            while ((this.mNextKeys)[key] != this.mNone && (this.mVariables)[(this.mNextKeys)[key]!] != id) {
                key = (this.mNextKeys)[key]!;
            }
            let currentKey = (this.mNextKeys)[key]!;
            if (currentKey != this.mNone && (this.mVariables)[currentKey] == id) {
                (this.mNextKeys)[key] = (this.mNextKeys)[currentKey];
                (this.mNextKeys)[currentKey] = this.mNone;
            }
        }
    }

    addVariable(index: number, variable: SolverVariable, value: number) {
        (this.mVariables)[index] = variable.id;
        (this.mValues)[index] = value;
        (this.mPrevious)[index] = this.mNone;
        (this.mNext)[index] = this.mNone;
        variable.addToRow(this.mRow);
        variable.usageInRowCount++;
        this.mCount++;
    }

    findEmptySlot() {
        for (let i = 0; i < this.mSize; i++) {
            if ((this.mVariables)[i] == this.mNone) {
                return i;
            }
        }
        return -1;
    }

    private insertVariable(index: number, variable: SolverVariable, value: number) {
        let availableSlot = this.findEmptySlot();
        this.addVariable(availableSlot, variable, value);
        if (index != this.mNone) {
            (this.mPrevious)[availableSlot] = index;
            (this.mNext)[availableSlot] = (this.mNext)[index];
            (this.mNext)[index] = availableSlot;
        } else {
            (this.mPrevious)[availableSlot] = this.mNone;
            if (this.mCount > 0) {
                (this.mNext)[availableSlot] = this.mHead;
                this.mHead = availableSlot;
            } else {
                (this.mNext)[availableSlot] = this.mNone;
            }
        }
        if ((this.mNext)[availableSlot] != this.mNone) {
            (this.mPrevious)[(this.mNext)[availableSlot]!] = availableSlot;
        }
        this.addToHashMap(variable, availableSlot);
    }

    put(variable: SolverVariable, value: number) {
        if (value > -SolverVariableValues.sEpsilon && value < SolverVariableValues.sEpsilon) {
            this.remove(variable, true);
            return;
        }
        if (this.mCount == 0) {
            this.addVariable(0, variable, value);
            this.addToHashMap(variable, 0);
            this.mHead = 0;
        }
        else {
            const index = this.indexOf(variable);
            if (index != this.mNone) {
                (this.mValues)[index] = value;
            } else {
                if (this.mCount + 1 >= this.mSize) {
                    this.increaseSize();
                }
                const count = this.mCount;
                let previousItem = -1;
                let j = this.mHead;
                for (let i = 0; i < count; i++) {
                    if ((this.mVariables)[j] == variable.id) {
                        (this.mValues)[j] = value;
                        return;
                    }
                    if ((this.mVariables)[j]! < variable.id) {
                        previousItem = j;
                    }
                    j = (this.mNext)[j]!
                    if (j == this.mNone) {
                        break;
                    }
                }
                this.insertVariable(previousItem, variable, value);
            }
        }
    }

    sizeInBytes(): number {
        return 0
    }

    remove(v: SolverVariable, removeFromDefinition: boolean): number | null {
        let index = this.indexOf(v);
        if (index == this.mNone) {
            return 0;
        }
        this.removeFromHashMap(v);
        let value = (this.mValues)[index];
        if (this.mHead == index) {
            this.mHead = (this.mNext)[index]!;
        }
        (this.mVariables)[index] = this.mNone;
        if ((this.mPrevious)[index] != this.mNone) {
            (this.mNext)[(this.mPrevious)[index]!] = (this.mNext)[index];
        }
        if ((this.mNext)[index] != this.mNone) {
            (this.mPrevious)[(this.mNext)[index]!] = (this.mPrevious)[index];
        }
        this.mCount--;
        v.usageInRowCount--;
        if (removeFromDefinition) {
            v.removeFromRow(this.mRow);
        }
        return value;
    }

    add(v: SolverVariable, value: number, removeFromDefinition: boolean) {
        if (value > -SolverVariableValues.sEpsilon && value < SolverVariableValues.sEpsilon) {
            return;
        }
        const index = this.indexOf(v);
        if (index == this.mNone) {
            this.put(v, value);
        } else {
            (this.mValues)[index]! += value;
            if ((this.mValues)[index]! > -SolverVariableValues.sEpsilon && (this.mValues)[index]! < SolverVariableValues.sEpsilon) {
                (this.mValues)[index] = 0;
                this.remove(v, removeFromDefinition);
            }
        }
    }

    use(definition: ArrayRow, removeFromDefinition: boolean): number {

        let value = this.get(definition.mVariable!);
        this.remove(definition.mVariable!, removeFromDefinition);
        if (false) {
            let definitionVariables = definition.variables;
            let definitionSize = definitionVariables.getCurrentSize();
            for (let i = 0; i < definitionSize; i++) {
                let definitionVariable = definitionVariables.getVariable(i);
                let definitionValue = definitionVariables.get(definitionVariable!);
                this.add(definitionVariable!, definitionValue * value, removeFromDefinition);
            }
            return value;
        }
        let localDef = definition.variables as SolverVariableValues;
        const definitionSize = localDef.getCurrentSize();
        let j = localDef.mHead;
        if (false) {
            for (let i = 0; i < definitionSize; i++) {
                let definitionValue = localDef.mValues[j];
                let definitionVariable = this.mCache.mIndexedVariables[localDef.mVariables[j]!];
                this.add(definitionVariable!, definitionValue! * value, removeFromDefinition);
                j = localDef.mNext[j]!
                if (j == this.mNone) {
                    break;
                }
            }
        }
        else {
            j = 0;
            for (let i = 0; j < definitionSize; i++) {
                if (localDef.mVariables[i] != this.mNone) {
                    let definitionValue = localDef.mValues[i];
                    let definitionVariable =
                        this.mCache.mIndexedVariables[localDef.mVariables[i]!];
                    this.add(definitionVariable!, definitionValue! * value, removeFromDefinition);
                    j++;
                }
            }
        }
        return value;
    }

    invert() {
        const count = this.mCount;
        let j = this.mHead;
        for (let i = 0; i < count; i++) {
            (this.mValues)[j]! *= -1;
            j = (this.mNext)[j]!
            if (j == this.mNone) {
                break;
            }
        }
    }

    divideByAmount(amount: number) {
        const count = this.mCount;
        let j = this.mHead;
        for (let i = 0; i < count; i++) {
            (this.mValues)[j]! /= amount;
            j = (this.mNext)[j]!;
            if (j == this.mNone) {
                break;
            }
        }
    }
}