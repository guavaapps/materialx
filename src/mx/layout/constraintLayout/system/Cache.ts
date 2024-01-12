import {ArrayRow} from "./SolverVariable";
import {Pools} from "./Pools";
import {SolverVariable} from "./SolverVariable";
import {Arrays} from "./utils";

export class Cache {
    mOptimizedArrayRowPool: Pools.Pool<ArrayRow> = new Pools.SimplePool<ArrayRow>(256);
    mArrayRowPool: Pools.Pool<ArrayRow> = new Pools.SimplePool<ArrayRow>(256);
    mSolverVariablePool: Pools.Pool<SolverVariable> = new Pools.SimplePool<SolverVariable>(256);
    mIndexedVariables: (SolverVariable | null)[] = Arrays.ofType<SolverVariable | null>(32)//new Array<SolverVariable>(32)
}