import {Cache} from "./Cache";
import {ArrayRow} from "./ArrayRow";
import {SolverVariable} from "./SolverVariable";

export class GoalRow extends ArrayRow{
    constructor(cache: Cache) {
        super(cache)
    }

    addError(error: SolverVariable) {
        super.addError(error);

        error.usageInRowCount--
    }
}