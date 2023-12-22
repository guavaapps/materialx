import {ArrayRow} from "./ArrayRow";
import {Pools} from "./Pools";
import {SolverVariable} from "./SolverVariable";

export class Cache {
    mOptimizedArrayRowPool: Pools.Pool<ArrayRow> = new Pools.SimplePool<ArrayRow>(256);
    mArrayRowPool: Pools.Pool<ArrayRow> = new Pools.SimplePool<ArrayRow>(256);
    mSolverVariablePool: Pools.Pool<SolverVariable> = new Pools.SimplePool<SolverVariable>(256);
    mIndexedVariables: (SolverVariable | null)[] = new Array<SolverVariable>(32)
}