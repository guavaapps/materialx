import {ArrayRow} from "./ArrayRow";
import {Cache} from "./Cache";
import {SolverVariable} from "./SolverVariable";
import ArrayRowVariables = ArrayRow.ArrayRowVariables;
import {Arrays} from "./utils";

export class ArrayLinkedVariables implements ArrayRow.ArrayRowVariables {
    static readonly NONE = -1

    mCurrentSize = 0

    private mRow: ArrayRow
    protected mCache: Cache

    private mRowSize = 8
    private mCandidate: SolverVariable | null = null

    private mArrayIndices = new Array<number>(this.mRowSize)

    private mArrayNextIndices = new Array<number>(this.mRowSize)

    private mArrayValues = new Array<number>(this.mRowSize)

    private mHead = ArrayLinkedVariables.NONE

    private mLast = ArrayLinkedVariables.NONE

    private mDidFillOnce = false
    private static sEpsilon = 0.001

    constructor(arrayRow: ArrayRow, cache: Cache) {
        this.mRow = arrayRow
        this.mCache = cache
    }

    put(variable: SolverVariable, value: number) {
        if (value === 0) {
            this.remove(variable, true)

            return
        }

        if (this.mHead === ArrayLinkedVariables.NONE) {
            this.mHead = 0

            this.mArrayValues[this.mHead] = value;
            this.mArrayIndices[this.mHead] = variable.id;
            this.mArrayNextIndices[this.mHead] = ArrayLinkedVariables.NONE;
            variable.usageInRowCount++;
            variable.addToRow(this.mRow);
            this.mCurrentSize++;
            if (!this.mDidFillOnce) {
                // only increment mLast if we haven't done the first filling pass
                this.mLast++;
                if (this.mLast >= this.mArrayIndices.length) {
                    this.mDidFillOnce = true;
                    this.mLast = this.mArrayIndices.length - 1;
                }
            }
            return;
        }

        let current = this.mHead
        let previous = ArrayLinkedVariables.NONE
        let counter = 0;
        while (current != ArrayLinkedVariables.NONE && counter < this.mCurrentSize) {
            if (this.mArrayIndices[current] == variable.id) {
                this.mArrayValues[current] = value;
                return;
            }
            if (this.mArrayIndices[current] < variable.id) {
                previous = current;
            }
            current = this.mArrayNextIndices[current];
            counter++;
        }

        // Not found, we need to insert

        // First, let's find an available spot
        let availableIndice = this.mLast + 1; // start from the previous spot
        if (this.mDidFillOnce) {
            // ... but if we traversed the array once, check the last index, which might have been
            // set by an element removed
            if (this.mArrayIndices[this.mLast] === ArrayLinkedVariables.NONE) {
                availableIndice = this.mLast;
            } else {
                availableIndice = this.mArrayIndices.length;
            }
        }
        if (availableIndice >= this.mArrayIndices.length) {
            if (this.mCurrentSize < this.mArrayIndices.length) {
                // find an available spot
                for (let i = 0; i < this.mArrayIndices.length; i++) {
                    if (this.mArrayIndices[i] === ArrayLinkedVariables.NONE) {
                        availableIndice = i;
                        break;
                    }
                }
            }
        }
        // ... make sure to grow the array as needed
        if (availableIndice >= this.mArrayIndices.length) {
            availableIndice = this.mArrayIndices.length;
            this.mRowSize *= 2;
            this.mDidFillOnce = false;
            this.mLast = availableIndice - 1;
            this.mArrayValues = Arrays.copy(this.mArrayValues, this.mRowSize)//Arrays.copyOf(mArrayValues, mRowSize);
            this.mArrayIndices = Arrays.copy(this.mArrayIndices, this.mRowSize)//Arrays.copyOf(mArrayIndices, mRowSize);
            this.mArrayNextIndices = Arrays.copy(this.mArrayNextIndices, this.mRowSize) //Arrays.copyOf(mArrayNextIndices, mRowSize);
        }

        // Finally, let's insert the element
        this.mArrayIndices[availableIndice] = variable.id;
        this.mArrayValues[availableIndice] = value;
        if (previous !== ArrayLinkedVariables.NONE) {
            this.mArrayNextIndices[availableIndice] = this.mArrayNextIndices[previous];
            this.mArrayNextIndices[previous] = availableIndice;
        } else {
            this.mArrayNextIndices[availableIndice] = this.mHead;
            this.mHead = availableIndice;
        }
        variable.usageInRowCount++;
        variable.addToRow(this.mRow);
        this.mCurrentSize++;
        if (!this.mDidFillOnce) {
            // only increment mLast if we haven't done the first filling pass
            this.mLast++;
        }
        if (this.mCurrentSize >= this.mArrayIndices.length) {
            this.mDidFillOnce = true;
        }
        if (this.mLast >= this.mArrayIndices.length) {
            this.mDidFillOnce = true;
            this.mLast = this.mArrayIndices.length - 1;
        }
    }

    add(variable: SolverVariable, value: number, removeFromDefinition: boolean): void {
        if (value > -ArrayLinkedVariables.sEpsilon && value < ArrayLinkedVariables.sEpsilon) {
            return;
        }
        // Special casing empty list...
        if (this.mHead == ArrayLinkedVariables.NONE) {
            this.mHead = 0;
            (this.mArrayValues)[this.mHead] = value;
            (this.mArrayIndices)[this.mHead] = variable.id;
            (this.mArrayNextIndices)[this.mHead] = ArrayLinkedVariables.NONE;
            variable.usageInRowCount++;
            variable.addToRow(this.mRow);
            this.mCurrentSize++;
            if (!this.mDidFillOnce) {
                // only increment mLast if we haven't done the first filling pass
                this.mLast++;
                if (this.mLast >= this.mArrayIndices.length) {
                    this.mDidFillOnce = true;
                    this.mLast = this.mArrayIndices.length - 1;
                }
            }
            return;
        }

        let current = this.mHead;
        let previous = ArrayLinkedVariables.NONE;
        let counter = 0;

        while (current != ArrayLinkedVariables.NONE && counter < this.mCurrentSize) {
            let idx = (this.mArrayIndices)[current];
            if (idx == variable.id) {
                let v = (this.mArrayValues)[current] + value;
                if (v > -ArrayLinkedVariables.sEpsilon && v < ArrayLinkedVariables.sEpsilon) {
                    v = 0;
                }
                (this.mArrayValues)[current] = v;
                // Possibly delete immediately
                if (v == 0) {
                    if (current == this.mHead) {
                        this.mHead = (this.mArrayNextIndices)[current];
                    } else {
                        (this.mArrayNextIndices)[previous] = (this.mArrayNextIndices)[current];
                    }
                    if (removeFromDefinition) {
                        variable.removeFromRow(this.mRow);
                    }
                    if (this.mDidFillOnce) {
                        // If we did a full pass already, remember that spot
                        this.mLast = current;
                    }
                    variable.usageInRowCount--;
                    this.mCurrentSize--;
                }
                return;
            }
            if ((this.mArrayIndices)[current] < variable.id) {
                previous = current;
            }
            current = (this.mArrayNextIndices)[current];
            counter++;
        }

        let availableIndice = this.mLast + 1; // start from the previous spot
        if (this.mDidFillOnce) {
            // ... but if we traversed the array once, check the last index, which might have been
            // set by an element removed
            if ((this.mArrayIndices)[this.mLast] == ArrayLinkedVariables.NONE) {
                availableIndice = this.mLast;
            } else {
                availableIndice = this.mArrayIndices.length;
            }
        }
        if (availableIndice >= this.mArrayIndices.length) {
            if (this.mCurrentSize < this.mArrayIndices.length) {
                // find an available spot
                for (let i = 0; i < this.mArrayIndices.length; i++) {
                    if ((this.mArrayIndices)[i] == ArrayLinkedVariables.NONE) {
                        availableIndice = i;
                        break;
                    }
                }
            }
        }

        if (availableIndice >= this.mArrayIndices.length) {
            availableIndice = this.mArrayIndices.length;
            this.mRowSize *= 2;
            this.mDidFillOnce = false;
            this.mLast = availableIndice - 1;
            this.mArrayValues = Arrays.copy(this.mArrayValues, this.mRowSize)//Arrays.copyOf(mArrayValues, mRowSize);
            this.mArrayIndices = Arrays.copy(this.mArrayIndices, this.mRowSize)//Arrays.copyOf(mArrayIndices, mRowSize);
            this.mArrayNextIndices = Arrays.copy(this.mArrayNextIndices, this.mRowSize)//Arrays.copyOf(mArrayNextIndices, mRowSize);
        }

        // Finally, let's insert the element
        (this.mArrayIndices)[availableIndice] = variable.id;
        (this.mArrayValues)[availableIndice] = value;
        if (previous != ArrayLinkedVariables.NONE) {
            (this.mArrayNextIndices)[availableIndice] = (this.mArrayNextIndices)[previous];
            (this.mArrayNextIndices)[previous] = availableIndice;
        } else {
            (this.mArrayNextIndices)[availableIndice] = this.mHead;
            this.mHead = availableIndice;
        }
        variable.usageInRowCount++;
        variable.addToRow(this.mRow);
        this.mCurrentSize++;
        if (!this.mDidFillOnce) {
            // only increment mLast if we haven't done the first filling pass
            this.mLast++;
        }
        if (this.mLast >= this.mArrayIndices.length) {
            this.mDidFillOnce = true;
            this.mLast = this.mArrayIndices.length - 1;
        }
    }

    clear(): void {
        let current = this.mHead;
        let counter = 0;
        while (current != ArrayLinkedVariables.NONE && counter < this.mCurrentSize) {
            let variable = this.mCache.mIndexedVariables[(this.mArrayIndices)[current]];
            if (variable != null) {
                variable.removeFromRow(this.mRow);
            }
            current = (this.mArrayNextIndices)[current];
            counter++;
        }

        this.mHead = ArrayLinkedVariables.NONE;
        this.mLast = ArrayLinkedVariables.NONE;
        this.mDidFillOnce = false;
        this.mCurrentSize = 0;
    }

    contains(variable: SolverVariable): boolean {
        if (this.mHead == ArrayLinkedVariables.NONE) {
            return false;
        }
        let current = this.mHead;
        let counter = 0;
        while (current != ArrayLinkedVariables.NONE && counter < this.mCurrentSize) {
            if (this.mArrayIndices[current] == variable.id) {
                return true;
            }
            current = this.mArrayNextIndices[current];
            counter++;
        }
        return false;
    }

    hasAtLeastOnePositiveVariable () {
        let current = this.mHead;
        let counter = 0;
        while (current != ArrayLinkedVariables.NONE && counter < this.mCurrentSize) {
            if ((this.mArrayValues)[current] > 0) {
                return true;
            }
            current = (this.mArrayNextIndices)[current];
            counter++;
        }
        return false;
    }

    display(): void {
        let count = this.mCurrentSize;
        console.log("{ ");
        for (let i = 0; i < count; i++) {
            let v = this.getVariable(i);
            if (v == null) {
                continue;
            }
            console.log(v + " = " + this.getVariableValue(i) + " ");
        }
        console.log(" }");
    }

    divideByAmount(amount: number): void {
        let current = this.mHead;
        let counter = 0;
        while (current != ArrayLinkedVariables.NONE && counter < this.mCurrentSize) {
            (this.mArrayValues)[current] /= amount;
            current = (this.mArrayNextIndices)[current];
            counter++;
        }
    }

    getHead () {
        return this.mHead
    }

    get(v: SolverVariable): number {
        let current = this.mHead;
        let counter = 0;
        while (current != ArrayLinkedVariables.NONE && counter < this.mCurrentSize) {
            if ((this.mArrayIndices)[current] == v.id) {
                return (this.mArrayValues)[current];
            }
            current = (this.mArrayNextIndices)[current];
            counter++;
        }
        return 0;
    }

    getCurrentSize(): number {
        return this.mCurrentSize
    }

    getId (index: number) {
        return this.mArrayIndices[index]
    }

    getValue (index: number) {
        return this.mArrayValues[index]
    }

    getNextIndices (index : number) {
        return this.mArrayNextIndices[index]
    }

    getPivotCandidate () {
        if (this.mCandidate == null) {
            // if no candidate is known, let's figure it out
            let current = this.mHead;
            let counter = 0;
            let pivot = null;
            while (current != ArrayLinkedVariables.NONE && counter < this.mCurrentSize) {
                if ((this.mArrayValues)[current] < 0) {
                    // We can return the first negative candidate as in ArrayLinkedVariables
                    // they are already sorted by id

                    let v = this.mCache.mIndexedVariables[(this.mArrayIndices)[current]]!
                    if (pivot == null || pivot.strength < v.strength) {
                        pivot = v;
                    }
                }
                current = (this.mArrayNextIndices)[current];
                counter++;
            }
            return pivot;
        }
        return this.mCandidate;
    }

    getVariable(index: number): SolverVariable | null {
        let current = this.mHead;
        let counter = 0;
        while (current != ArrayLinkedVariables.NONE && counter < this.mCurrentSize) {
            if (counter == index) {
                return this.mCache.mIndexedVariables[(this.mArrayIndices)[current]];
            }
            current = (this.mArrayNextIndices)[current];
            counter++;
        }
        return null;
    }

    getVariableValue(index: number): number {
        let current = this.mHead;
        let counter = 0;
        while (current != ArrayLinkedVariables.NONE && counter < this.mCurrentSize) {
            if (counter == index) {
                return (this.mArrayValues)[current];
            }
            current = (this.mArrayNextIndices)[current];
            counter++;
        }
        return 0;
    }

    indexOf(variable: SolverVariable): number {
        if (this.mHead == ArrayLinkedVariables.NONE) {
            return -1;
        }
        let current = this.mHead;
        let counter = 0;
        while (current != ArrayLinkedVariables.NONE && counter < this.mCurrentSize) {
            if (this.mArrayIndices[current] == variable.id) {
                return current;
            }
            current = this.mArrayNextIndices[current];
            counter++;
        }
        return -1;
    }

    invert(): void {
        let current = this.mHead;
        let counter = 0;
        while (current != ArrayLinkedVariables.NONE && counter < this.mCurrentSize) {
            (this.mArrayValues)[current] *= -1;
            current = (this.mArrayNextIndices)[current];
            counter++;
        }
    }

    remove(variable: SolverVariable, removeFromDefinition: boolean): number | null {
        if (this.mCandidate == variable) {
            this.mCandidate = null;
        }
        if (this.mHead == ArrayLinkedVariables.NONE) {
            return 0;
        }
        let current = this.mHead;
        let previous = ArrayLinkedVariables.NONE;
        let counter = 0;
        while (current != ArrayLinkedVariables.NONE && counter < this.mCurrentSize) {
            let idx = (this.mArrayIndices)[current];
            if (idx == variable.id) {
                if (current == this.mHead) {
                    this.mHead = (this.mArrayNextIndices)[current];
                } else {
                    (this.mArrayNextIndices)[previous] = (this.mArrayNextIndices)[current];
                }

                if (removeFromDefinition) {
                    variable.removeFromRow(this.mRow);
                }
                variable.usageInRowCount--;
                this.mCurrentSize--;
                (this.mArrayIndices)[current] = ArrayLinkedVariables.NONE;
                if (this.mDidFillOnce) {
                    // If we did a full pass already, remember that spot
                    this.mLast = current;
                }
                return (this.mArrayValues)[current];
            }
            previous = current;
            current = (this.mArrayNextIndices)[current];
            counter++;
        }

        return 0
    }

    sizeInBytes(): number {
        let size = 0;
        size += 3 * (this.mArrayIndices.length * 4);
        size += 9 * 4;
        return size;
    }

    use(definition: ArrayRow, removeFromDefinition: boolean): number {
        let value = this.get(definition.mVariable!)
        this.remove(definition.mVariable!, removeFromDefinition);
        let definitionVariables = definition.variables!
        let definitionSize = definitionVariables.getCurrentSize();
        for (let i = 0; i < definitionSize; i++) {
            let definitionVariable = definitionVariables.getVariable(i)!
            let definitionValue = definitionVariables.get(definitionVariable);
            this.add(definitionVariable, definitionValue * value, removeFromDefinition);
        }
        return value;
    }

    toString () {
        let result = "";
        let current = this.mHead;
        let counter = 0;
        while (current != ArrayLinkedVariables.NONE && counter < this.mCurrentSize) {
            result += " -> ";
            result += (this.mArrayValues)[current] + " : ";
            result += this.mCache.mIndexedVariables[(this.mArrayIndices)[current]];
            current = (this.mArrayNextIndices)[current];
            counter++;
        }
        return result;
    }
}