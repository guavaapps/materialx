import {AbstractVariable, DummyVariable, ObjectiveVariable, SlackVariable, Variable} from "./Variables";
import {AbstractConstraint, Constraint, EditConstraint, StayConstraint} from "./Constraints";

export type ConstraintObject = EditConstraint | StayConstraint | Constraint
export type VariableObject = Variable | DummyVariable | SlackVariable | ObjectiveVariable

export function asObject(obj: object) {
    return JSON.parse(JSON.stringify(obj))
}

export class Expression {
    constant: number
    terms = new Map<VariableObject, number>() // was abstract variable

    // was variable?: AbstractVariable
    constructor(variable?: VariableObject, value = 1, constant = 0) {
        this.constant = constant

        if (variable) {
            this.setVariable(variable, value)
        }
    }

    clone() {
        let expression = new Expression(undefined, 1, this.constant)

        this.terms.forEach((value, variable) => expression.setVariable(variable, value))

        return expression
    }

    isConstant() {
        return this.terms.size === 0
    }

    times(x: number | Expression | Variable) {
        let result: Expression
        if (x instanceof Expression) {
            if (this.isConstant()) {
                result = x.times(this.constant)
            } else if (x.isConstant()) {
                result = this.times(x.constant)
            } else {
                throw Error("impl")
            }
        } else if (x instanceof Variable) {
            if (this.isConstant()) {
                result = new Expression(undefined, this.constant)
            } else {
                throw new Error()
            }
        }

        let constant = x as number
        result = new Expression(undefined, 1, this.constant * constant)
        this.terms.forEach((value, variable) => result.setVariable(variable as Variable, value * constant))

        return result
    }

    divideBy(x: number | Expression) {
        let result: Expression

        if (typeof x === "number") {
            if (approxEquals(x, 0)) {
                throw new Error()
            }

            result = new Expression(undefined, 1, this.constant / x)

            this.terms.forEach((value, variable) => result.setVariable(variable as Variable, value / x))
        } else {
            if (x.isConstant()) {
                result = this.divideBy(x.constant)
            } else {
                throw new Error()
            }
        }

        return result
    }

    plus(x: number | Expression | Variable) {
        let result

        if (x instanceof Expression) {
            result = this.clone()
            result.addExpression(x, 1)

            return result
        } else if (x instanceof Variable) {
            result = this.clone()

            result.addVariable(x, 1)
            return result
        }

        result = this.clone()
        result.addExpression(new Expression(undefined, 1, x), 1)

        return result
    }

    minus(x: number | Expression | Variable) {
        let result

        if (x instanceof Expression) {
            result = this.clone()
            result.addExpression(x, -1)
            return result
        } else if (x instanceof Variable) {
            result = this.clone()
            result.addVariable(x, -1)
            return result
        }

        result = this.clone()
        result.addExpression(new Expression(undefined, 1, x), -1)
        return result
    }

    equals(other: Expression | Variable | number) { // types correct
        return new Constraint(this, Constraint.EQ, other)
    }

    lowerThan(other: Expression | Variable | number) {
        return new Constraint(this, Constraint.LE, other)
    }

    greaterThan(other: Expression | Variable | number) {
        return new Constraint(this, Constraint.GE, other)
    }

    addExpression(expression: Expression | VariableObject, n = 1, subject?: any, solver?: any) {
        if (expression instanceof Variable
            || expression instanceof DummyVariable
            || expression instanceof SlackVariable
            || expression instanceof ObjectiveVariable
        ) {
            expression = new Expression(expression)
        }

        this.constant = this.constant + n * expression.constant

        expression.terms.forEach((coeff, variable) => this.addVariable(variable, coeff * n, subject, solver))
    }

    addVariable(variable: VariableObject, cd = 1, subject?: VariableObject, solver?: LinearSystem) {
        let coeff = this.terms.get(variable)

        if (coeff !== undefined) {
            let newCoeff = coeff + cd

            if (approxEquals(newCoeff, 0)) {
                if (solver) {
                    solver.noteRemovedVariable(variable, subject)
                }

                this.removeVariable(variable)
            } else {
                this.setVariable(variable, newCoeff)
            }
        } else {
            if (!approxEquals(cd, 0)) {
                this.setVariable(variable, cd)
                if (solver) {
                    solver.noteAddedVariable(variable, subject)
                }
            }
        }
    }

    setVariable(variable: VariableObject, constant: number) {
        this.terms.set(variable, constant)
    }

    removeVariable(variable: VariableObject) {
        this.terms.delete(variable)
    }

    anyPivotableVariable() {
        if (this.isConstant()) {
            throw new Error()
        }

        let returnValue

        // this.terms.forEach((c, v) => {
        //     if (v.isPivotable) {
        //         returnValue = v
        //         break
        //     }
        // })

        for (let t of this.terms) {
            let v = t[0]
            let c = t[1]

            if (v.isPivotable) {
                returnValue = v
                break
            }
        }

        return returnValue
    }

    substituteOut(variable: VariableObject, expression: Expression, subject?: any, solver?: any) {
        let multiplier = this.terms.get(variable)!
        this.terms.delete(variable)

        this.constant = this.constant + multiplier * expression.constant

        expression.terms.forEach((coeff, v) => {
            let prevCoeff = this.terms.get(v)

            if (prevCoeff) {
                let newCoeff = prevCoeff + multiplier * coeff

                if (approxEquals(newCoeff, 0)) {
                    solver.noteRemovedVariable(v, subject)
                    this.terms.delete(v)
                } else {
                    this.setVariable(v as Variable, newCoeff)
                }
            } else {
                this.setVariable(v as Variable, multiplier * coeff)

                if (solver) {
                    solver.noteAddedVariable(v, subject)
                }
            }
        })
    }

    changeSubject(prevSubject: VariableObject, newSubject: VariableObject) {
        this.setVariable(prevSubject, this.newSubject(newSubject))
    }

    multiply(x: number) {
        this.constant = this.constant * x

        this.terms.forEach((value, variable) => this.setVariable(variable as Variable, value * x))
    }

    newSubject(subject: VariableObject) {
        let value = this.terms.get(subject)!
        this.terms.delete(subject)

        let r = 1 / value

        this.multiply(-r)

        return r
    }

    coefficientFor(variable: VariableObject) {
        return this.terms.get(variable) || 0
    }

    toString() {
        let parts: string[] = []

        if (!approxEquals(this.constant, 0) || this.isConstant()) {
            parts.push(this.constant.toString())
        }

        for (let [clv, coeff] of this.terms) {
            if (approxEquals(coeff, 1)) {
                parts.push(clv.toString())
            } else {
                parts.push(coeff.toString() + "*" + clv.toString())
            }
        }

        return parts.join(" + ")
    }
}

export class EditInfo {
    constraint: ConstraintObject;
    editPlus: any;
    editMinus: any;
    prevEditConstant: any;
    index: any;

    constructor(constraint: ConstraintObject, editPlus: any, editMinus: any, prevEditConstant: any, index: any) {
        this.constraint = constraint;
        this.editPlus = editPlus;
        this.editMinus = editMinus;
        this.prevEditConstant = prevEditConstant;
        this.index = index;
    }
}

export class Table {
    columns = new Map<VariableObject, Set<VariableObject>>()
    rows = new Map<VariableObject, Expression>()
    infeasibleRows = new Set<VariableObject>()
    externalRows = new Set<Variable>()
    externalParametricVariables = new Set<Variable>()

    noteRemovedVariable(variable: VariableObject, subject?: VariableObject) {
        if (subject) {
            this.columns.get(variable)!.delete(subject)
        }
    }

    noteAddedVariable(variable: VariableObject, subject?: VariableObject) {
        if (subject) {
            setDefault(this.columns, variable, new Set<VariableObject>()).add(subject)

            assert(this.columns.has(variable)) // TODO debug, remove
        }
    }

    addRow(variable: VariableObject, expression: Expression) {
        this.rows.set(variable, expression)

        expression.terms.forEach((value, it) => {
            setDefault(this.columns, it, new Set<VariableObject>()).add(variable)

            if (it.isExternal) {
                this.externalParametricVariables.add(it as Variable)
            }
        })

        if (variable.isExternal) {
            this.externalRows.add(variable as Variable)
        }
    }

    removeColumn(variable: VariableObject) {
        let rows = popFromMap(this.columns, variable, undefined)//this.columns.get(variable)

        if (rows) {
            for (let row of rows) {
                let expression = this.rows.get(row)!
                expression.removeVariable(variable)
            }
        }

        if (variable.isExternal) {
            // try {
            this.externalRows.delete(variable as Variable)
            // } catch (e) {
            //
            // }

            // try {
            this.externalParametricVariables.delete(variable as Variable)
            // } catch (e) {
            // }
        }
    }

    removeRow(variable: VariableObject) {
        let expression = this.rows.get(variable)!
        this.rows.delete(variable)

        for (let v of expression.terms.keys()) {
            let variableSet = this.columns.get(v)

            if (variableSet && variableSet.size > 0) {
                variableSet.delete(variable)
            }
        }

        // try {
        this.infeasibleRows.delete(variable)
        // } catch (e) {
        // }

        if (variable.isExternal) {
            // try {
            this.externalRows.delete(variable as Variable)
            // } catch (e) {
            // }
        }

        return expression
    }

    substituteOut(prevVariable: VariableObject, expression: Expression) {
        let variableSet = this.columns.get(prevVariable)!

        for (let v of variableSet) { // TODO !!!! problem with 2x in this loop
            let row = this.rows.get(v)!
            row.substituteOut(prevVariable, expression, v, this) // TODO !!!! problem with 2x here

            if (v.isRestricted && row.constant < 0) {
                this.infeasibleRows.add(v)
            }
        }

        if (prevVariable.isExternal) {
            this.externalRows.add(prevVariable as Variable)

            this.externalParametricVariables.delete(prevVariable as Variable)
        }

        this.columns.delete(prevVariable)
    }
}

export class SolverEditContext {
    solver: LinearSystem

    constructor(solver: LinearSystem) {
        this.solver = solver
    }

    enter() {
        this.solver.beginEdit()
    }

    exit() {
        this.solver.endEdit()
    }
}

export class LinearSystem extends Table {
    stayErrorVariables: SlackVariable[][] = []

    errorVariables = new Map<ConstraintObject | VariableObject, Set<VariableObject>>()
    markerVariables = new Map<ConstraintObject, VariableObject>()

    objective = new ObjectiveVariable('Z')
    editVariablesMap = new Map<VariableObject, EditInfo>()
    editVariableStack = [0]

    slackCounter = 0
    artificialCounter = 0
    dummyCounter = 0
    autoSolve = true
    needsSolving = false

    optimizeCount = 0

    constructor() {
        super();

        this.rows.set(this.objective, new Expression())
    }

    addConstraint(constraint: ConstraintObject, strength?: Strength, weight?: number) {
        if (strength || weight) {
            constraint = (constraint as Constraint).clone()

            if (strength) {
                constraint.strength = strength
            }

            if (weight) {
                constraint.weight = weight
            }
        }

        const [
            expression,
            ePlus, eMinus,
            prevEditConstant
        ] = this.newExpression(constraint)

        if (!this.tryAddingDirectly(expression)) {
            this.addWithArtificialVariable(expression) // TODO !!!! hereeeee
        }

        this.needsSolving = true

        if (constraint.isEditConstraint) {
            constraint = constraint as EditConstraint

            let i = this.editVariablesMap.size

            this.editVariablesMap.set(constraint.variable, new EditInfo(constraint, ePlus, eMinus, prevEditConstant, i))
        }

        if (this.autoSolve) {
            this.optimize(this.objective)
            this.setExternalVariables()
        }

        return constraint
    }

    addEditVariable(v: Variable, strength = Strength.STRONG) {
        return this.addConstraint(new EditConstraint(v, strength))
    }

    removeEditVariable(v: VariableObject) {
        this.removeConstraint(this.editVariablesMap.get(v)!.constraint)
    }

    edit() {
        return new SolverEditContext(this)
    }

    resolve() {
        this.dualOptimize()
        this.setExternalVariables()
        this.infeasibleRows.clear()
        this.resetStayConstraints()
    }

    //

    newExpression(constraint: ConstraintObject):
        [Expression, DummyVariable | SlackVariable | undefined, DummyVariable | SlackVariable | undefined, number | undefined] {
        let expression = new Expression(undefined, 1, constraint.expression.constant)
        let ePlus = undefined
        let eMinus = undefined
        let prevEditConstant = undefined

        for (let t of constraint.expression.terms) {
            let variable = t[0]
            let value = t[1]

            let e = this.rows.get(variable)

            if (!e) {
                expression.addVariable(variable, value)
            } else {
                expression.addExpression(e, value)
            }
        }

        if (constraint.isInequality) {
            constraint = constraint as Constraint

            this.slackCounter++
            let slackVariable = new SlackVariable("s", this.slackCounter)

            expression.setVariable(slackVariable, -1)

            this.markerVariables.set(constraint, slackVariable)

            if (!constraint.isRequired()) {
                this.slackCounter++

                eMinus = new SlackVariable("em", this.slackCounter)
                expression.setVariable(eMinus, 1)

                let zRow = this.rows.get(this.objective)!
                zRow.setVariable(eMinus, constraint.strength * constraint.weight)
                this.insertErrorVariable(constraint, eMinus)
                this.noteAddedVariable(eMinus, this.objective)
            }
        } else {
            if (constraint.isRequired()) {
                this.dummyCounter++
                let dummyVariable = new DummyVariable(this.dummyCounter)
                ePlus = dummyVariable
                eMinus = dummyVariable
                prevEditConstant = constraint.expression.constant

                expression.setVariable(dummyVariable, 1)
                this.markerVariables.set(constraint, dummyVariable)
            } else {
                this.slackCounter++

                ePlus = new SlackVariable("ep", this.slackCounter)
                eMinus = new SlackVariable("em", this.slackCounter)

                expression.setVariable(ePlus, -1)
                expression.setVariable(eMinus, 1)

                this.markerVariables.set(constraint, ePlus)

                let zRow = this.rows.get(this.objective)!

                let swCoeff = constraint.strength * constraint.weight

                zRow.setVariable(ePlus, swCoeff)
                this.noteAddedVariable(ePlus, this.objective)

                zRow.setVariable(eMinus, swCoeff)
                this.noteAddedVariable(eMinus, this.objective)

                this.insertErrorVariable(constraint, eMinus)
                this.insertErrorVariable(constraint, ePlus)

                if (constraint.isStayConstraint) {
                    this.stayErrorVariables.push([ePlus, eMinus])
                } else if (constraint.isEditConstraint) {
                    prevEditConstant = constraint.expression.constant
                }
            }
        }

        if (expression.constant < 0) {
            expression.multiply(-1)
        }

        return [expression, ePlus, eMinus, prevEditConstant]
    }

    beginEdit() {
        assert(this.editVariablesMap.size > 0)

        this.infeasibleRows.clear()
        this.resetStayConstraints()
        this.editVariableStack.push(this.editVariablesMap.size)
    }

    endEdit() {
        assert(this.editVariablesMap.size > 0)

        this.resolve()
        this.editVariableStack.pop()
        this.removeEditVariablesTo(this.editVariableStack[this.editVariableStack.length - 1])
    }

    removeAllEditVariables() {
        this.removeEditVariablesTo(0)
    }

    removeEditVariablesTo(n: number) {
        try {
            let removals: VariableObject[] = []

            this.editVariablesMap.forEach((cei, v) => {
                if (cei.index >= n) {
                    removals.push(v)
                }
            })

            for (let v of removals) {
                this.removeEditVariable(v)
            }

            assert(this.editVariablesMap.size === n)
        } catch (e) {
            throw new Error()
        }
    }

    addStay(variable: Variable, strength = Strength.WEAK, weight = 1) {
        return this.addConstraint(new StayConstraint(variable, strength, weight))
    }

    removeConstraint(constraint: ConstraintObject) {
        this.needsSolving = true
        this.resetStayConstraints()

        let zRow = this.rows.get(this.objective)!

        let eVars = this.errorVariables.get(constraint)

        if (eVars && eVars.size > 0) {
            for (let c of eVars) {
                // try {
                //     zRow.addExpression(this.rows.get(c), -constraint.weight * constraint.strength, this.objective, this)
                // }
                // catch (e) {
                //     zRow.addVariable(c, -constraint.weight * constraint.strength, this.objective, this)
                // } TODO confirmed change
                // if (c instanceof Constraint || c instanceof EditConstraint || c instanceof StayConstraint) {
                //     continue
                // }

                let r = this.rows.get(c)

                if (r) {
                    zRow.addExpression(r, -constraint.weight * constraint.strength, this.objective, this)
                } else {
                    zRow.addVariable(c, -constraint.weight * constraint.strength, this.objective, this)
                }
            }
        }


        // try {
        //     marker = this.markerVariables.get(constraint)
        //     this.markerVariables.delete(constraint)
        // } catch (e) {
        //     throw new Error("keyerror: constraint not found")
        // } // TODO replaced by popFromMap()

        // marker = marker!

        let marker = popFromMapDefault(this.markerVariables, constraint)

        let expression

        if (!this.rows.get(marker)) {
            let col = this.columns.get(marker)!

            let exitVariable = undefined

            let minRatio = 0

            for (let v of col) {
                if (v.isRestricted) {
                    expression = this.rows.get(v)!

                    let coeff = expression.coefficientFor(marker)

                    if (coeff < 0) {
                        let r = -expression.constant / coeff

                        if (exitVariable === undefined || r < minRatio) {
                            minRatio = r
                            exitVariable = v
                        }
                    }
                }
            }

            if (exitVariable === undefined) {
                for (let v of col) {
                    if (v.isRestricted) {
                        expression = this.rows.get(v)!
                        let coeff = expression.coefficientFor(marker)

                        let r = expression.constant / coeff

                        if (exitVariable === undefined || r < minRatio) {
                            minRatio = r
                            exitVariable = v
                        }
                    }
                }
            }

            if (exitVariable === undefined) {
                if (col.size === 0) {
                    this.removeColumn(marker)
                } else {
                    let eV = []
                    for (let v of col) {
                        if (v !== this.objective) {
                            eV.push(v)
                        }
                    }

                    exitVariable = eV[eV.length - 1]
                }
            }

            if (exitVariable !== undefined) {
                this.pivot(marker, exitVariable)
            }
        }

        if (this.rows.get(marker)) {
            expression = this.removeRow(marker)

        }

        if (eVars && eVars.size > 0) {
            for (let v of eVars) {
                if (v !== marker) {
                    this.removeColumn(v as VariableObject)
                }
            }
        }

        if (constraint.isStayConstraint) {
            constraint = constraint as StayConstraint

            if (eVars && eVars.size > 0) {
                let remaining: SlackVariable[][] = []
                let found = false

                while (this.stayErrorVariables.length > 0) {
                    let [pErrorVariable, mErrorVariable] = this.stayErrorVariables.pop()!

                    found = false

                    // try {
                    //     eVars.delete(pErrorVariable)
                    //     found = true
                    // } catch (e) {
                    // } // TODO replaced by next line

                    found = eVars.delete(pErrorVariable)

                    // try {
                    //     eVars.delete(mErrorVariable)
                    //     found = true
                    // } catch (e) {
                    // } // TODO replaced by next line

                    found = eVars.delete(mErrorVariable)

                    if (!found) {
                        remaining.push([pErrorVariable, mErrorVariable])
                    }
                }

                this.stayErrorVariables = remaining
            }
        } else if (constraint.isEditConstraint) {
            constraint = constraint as EditConstraint
            assert(eVars !== undefined)

            this.removeColumn(this.editVariablesMap.get(constraint.variable)!.editMinus)
            this.editVariablesMap.delete(constraint.variable)
        }

        if (eVars && eVars.size > 0) {
            for (let eVar of eVars) {
                this.errorVariables.delete(eVar)
            }
        }

        if (this.autoSolve) {
            this.optimize(this.objective)
            this.setExternalVariables()
        }
    }

    resolveArray(newEditConstraints: number[]) {
        this.editVariablesMap.forEach((c, v) => this.suggestValue(v, newEditConstraints[c.index]))
    }

    suggestValue(v: VariableObject, x: number) {
        let c = this.editVariablesMap.get(v)

        if (!c) {
            throw new Error()
        }

        let delta = x - c.prevEditConstant
        c.prevEditConstant = x
        this.deltaEditConstant(delta, c.editPlus, c.editMinus)
    }

    solve() {
        if (this.needsSolving) {
            this.optimize(this.objective)
            this.setExternalVariables()
        }
    }

    setEditedValue(v: Variable, n: number) {
        if (!this.columns.has(v) || !this.rows.has(v)) {
            v.value = n
        }

        if (!approxEquals(n, v.value)) {
            this.addEditVariable(v)
            this.beginEdit()

            this.suggestValue(v, n)

            this.endEdit()
        }
    }

    addVariable(v: Variable) {
        if (!this.columns.has(v) || !this.rows.has(v)) {
            this.addStay(v)
        }
    }

    addWithArtificialVariable(expression: Expression) {
        this.artificialCounter++

        let av = new SlackVariable("a", this.artificialCounter)
        let az = new ObjectiveVariable("az")

        let azRow = expression.clone()

        this.addRow(az, azRow)
        this.addRow(av, expression)

        this.optimize(az)

        let azTableRow = this.rows.get(az)!

        if (!approxEquals(azTableRow.constant, 0)) {
            this.removeRow(az)
            this.removeColumn(av)

            throw new Error()
        }

        let e = this.rows.get(av)

        if (e !== undefined) {
            if (e.isConstant()) {
                this.removeRow(av)
                this.removeRow(az)
                return
            }

            let entryVariable = e.anyPivotableVariable()
            this.pivot(entryVariable!, av)
        }

        assert(!this.rows.has(av))

        this.removeColumn(av)
        this.removeRow(az)
    }

    tryAddingDirectly(expression: Expression) {
        let subject = this.chooseSubject(expression)

        if (subject === undefined) {
            return false
        }

        expression.newSubject(subject)

        if (this.columns.has(subject)) {
            this.substituteOut(subject, expression) // TODO !!!! problem with 2xdummy here
        }

        this.addRow(subject, expression)

        return true
    }

    static csCount = 0

    chooseSubject(expression: Expression) {
        LinearSystem.csCount++

        let subject = undefined

        let foundUnrestricted = false
        let foundNewRestricted = false

        let returnValueFound = false
        let returnValue = undefined

        // expression.terms.forEach((c, v) => {
        //     if (foundUnrestricted) {
        //         if (!v.isRestricted) {
        //             if (!this.columns.has(v)) {
        //                 returnValueFound = true
        //                 returnValue = v
        //                 break
        //             }
        //         }
        //     } else {
        //         if (v.isRestricted) {
        //             if (!foundNewRestricted && !v.isDummy && c < 0) {
        //                 let col = this.columns.get(v)
        //
        //                 if (col === undefined || col.size === 1 && this.columns.has(this.objective)) {
        //                     subject = v
        //                     foundNewRestricted = true
        //                 }
        //             }
        //         } else {
        //             subject = v
        //             foundUnrestricted = true
        //         }
        //     }
        // })

        for (let t of expression.terms) {
            let v = t[0]
            let c = t[1]

            if (foundUnrestricted) {
                if (!v.isRestricted) {
                    if (!this.columns.has(v)) {
                        returnValueFound = true
                        returnValue = v
                        break
                    }
                }
            } else {
                if (v.isRestricted) {
                    if (!foundNewRestricted && !v.isDummy && c < 0) {
                        let col = this.columns.get(v)

                        if (col === undefined || (col.size === 1 && this.columns.has(this.objective))) {
                            subject = v
                            foundNewRestricted = true
                        }
                    }
                } else {
                    subject = v
                    foundUnrestricted = true
                }
            }
        }

        if (returnValueFound) {
            return returnValue
        }

        if (subject) {
            return subject
        }

        let coeff = 0

        // expression.terms.forEach((c, v) => {
        //     if (!v.isDummy) {
        //         returnValueFound = true
        //         returnValue = undefined
        //         return//break
        //     }
        //
        //     if (!this.columns.has(v)) {
        //         subject = v
        //         coeff = c
        //     }
        // })

        for (let t of expression.terms) {
            let v = t[0]
            let c = t[1]

            if (!v.isDummy) {
                returnValueFound = true
                returnValue = undefined
                break
            }

            if (!this.columns.has(v)) {
                subject = v
                coeff = c
            }
        }

        if (returnValueFound) {
            return returnValue
        }

        if (!approxEquals(expression.constant, 0)) {
            throw new Error()
        }

        if (coeff > 0) {
            expression = expression.times(-1)
        }

        return subject
    }

    deltaEditConstant(delta: number, plusErrorVariable: VariableObject, minusErrorVariable: VariableObject) {
        let expressionPlus = this.rows.get(plusErrorVariable)
        if (expressionPlus !== undefined) {
            expressionPlus.constant += delta

            if (expressionPlus.constant < 0) {
                this.infeasibleRows.add(plusErrorVariable)
            }

            return
        }

        let expressionMinus = this.rows.get(minusErrorVariable)
        if (expressionMinus !== undefined) {
            expressionMinus.constant -= delta

            if (expressionMinus.constant < 0) {
                this.infeasibleRows.add(minusErrorVariable)
            }
            return;
        }

        try {
            for (let basicVariable of this.columns.get(minusErrorVariable)!) {
                let expression = this.rows.get(basicVariable)!
                let c = expression.coefficientFor(minusErrorVariable)
                expression.constant += (c * delta)

                if (basicVariable.isRestricted && expression.constant < 0) {
                    this.infeasibleRows.add(basicVariable)
                }
            }
        } catch (e) {
        }
    }

    dualOptimize() {
        let zRow = this.rows.get(this.objective)!

        while (this.infeasibleRows.size > 0) {
            // exitVariable is non-null as long as infeasibleRows.size > 0
            let exitVariable = pop(this.infeasibleRows)!
            let entryVariable = undefined

            let expression = this.rows.get(exitVariable)

            if (expression) {
                if (expression.constant < 0) {
                    let ratio = Number.MAX_VALUE

                    for (let t of expression.terms) {
                        let v = t[0]
                        let cd = t[1]

                        if (cd > 0 && v.isPivotable) {
                            let zc = zRow.coefficientFor(v)

                            let r = zc / cd

                            if (r < ratio) {
                                entryVariable = v
                                ratio = r
                            }
                        }
                    }

                    if (ratio === Number.MAX_VALUE) {
                        throw new Error()
                    }

                    // entryVariable is guaranteed to be non-null
                    // if ratio != MAX_VALUE
                    this.pivot(entryVariable!, exitVariable)
                }
            }
        }
    }

    optimize(zVar: VariableObject) {
        this.optimizeCount++

        let zRow = this.rows.get(zVar)!

        let entryVariable = undefined
        let exitVariable = undefined

        while (true) {
            let objectiveCoeff = 0

            // sort zRow terms
            // const tail: AbstractVariable[] = []
            // const availableKeys = [...zRow.terms.keys()].filter(it => {
            //     if (it.name) {
            //         return true
            //     }
            //
            //     tail.push(it)
            // })
            // const sortedKeys = availableKeys.sort((a, b) => a.name!.localeCompare(b.name!))
            // const zRowSortedTerms: [AbstractVariable, number][] = sortedKeys.map(it => [it, zRow.terms.get(it)!])

            for (let t of zRow.terms) { // ... of zRow.terms // 2: zRowSortedTerms
                let v = t[0]
                let c = t[1]

                if (v.isPivotable && c < objectiveCoeff) {
                    objectiveCoeff = c
                    entryVariable = v
                    break
                }
            }

            if (objectiveCoeff >= -EPSILON || entryVariable === undefined) {
                return
            }

            let minRatio = Number.MAX_VALUE
            let r = 0

            for (let v of this.columns.get(entryVariable)!) {
                if (v.isPivotable) {
                    let expression = this.rows.get(v)!

                    let coeff = expression.coefficientFor(entryVariable)

                    if (coeff < 0) {
                        r = -expression.constant / coeff

                        if (r < minRatio) {
                            minRatio = r
                            exitVariable = v
                        }
                    }
                }
            }

            if (minRatio === Number.MAX_VALUE) {
                throw new Error()
            }

            // exit variable non-null if minRatio < MAX_VALUE
            this.pivot(entryVariable, exitVariable!) // TODO !! problem probs here
        }

    }

    pivot(entryVariable: VariableObject, exitVariable: VariableObject) {
        let pExpression = this.removeRow(exitVariable)
        pExpression.changeSubject(exitVariable, entryVariable)

        this.substituteOut(entryVariable, pExpression)
        this.addRow(entryVariable, pExpression)
    }

    resetStayConstraints() {
        for (let [pVariable, mVariable] of this.stayErrorVariables) {
            let expression = this.rows.get(pVariable)

            if (expression === undefined) {
                expression = this.rows.get(mVariable)
            }
            if (expression) {
                expression.constant = 0
            }
        }
    }

    setExternalVariables() {
        for (let v of this.externalParametricVariables) {
            if (this.rows.get(v)) {
                continue
            }

            v.value = 0
        }

        for (let v of this.externalRows) {
            let expression = this.rows.get(v)!
            v.value = expression.constant
        }

        this.needsSolving = false
    }

    insertErrorVariable(constraint: ConstraintObject, variable: VariableObject) {
        let constraintSet = this.errorVariables.get(variable)

        if (!constraintSet) {
            constraintSet = new Set()

            this.errorVariables.set(constraint, constraintSet)
        }

        constraintSet.add(variable)

        setDefault(this.errorVariables, variable, new Set()).add(variable)
    }
}

export const EPSILON = 0.00000001

export function assert(condition: boolean) {
    if (condition) {
        return true
    }

    throw new Error("assertion error")
}

export function setDefault<K, V>(map: Map<K, V>, key: K, value: V) {
    if (!map.get(key)) {
        map.set(key, value)
    }

    return map.get(key)!
}

export function pop<T>(set: Set<T>) {
    const array = Array.from(set)
    return array.pop()
}

export function popFromMapDefault<K, V>(map: Map<K, V>, key: K, defaultValue?: V) {
    return popFromMap(map, key, defaultValue)!
}

export function popFromMap<K, V>(map: Map<K, V>, key: K, defaultValue: V | undefined = undefined) {
    const value = map.get(key)

    return value ?? defaultValue
}

export function approxEquals(a: number, b: number) {
    const epsilon = 0.00000001

    return Math.abs(a - b) < epsilon
}

export enum Strength {
    REQUIRED = 1001001000,
    STRONG = 1000000,
    MEDIUM = 1000,
    WEAK = 1
}

export class SystemMetrics {
    private static _vars: any[] = []

    static get vars() {
        return this._vars
    }

    static addVar(variable: any) {
        this._vars.push(variable)

        if ((variable as AbstractVariable).name === "ep1") {
            //throw new Error("stack trace for ep1 add")
        }
    }
}

function formatRows (rows: Map<VariableObject, Expression>) {
    let pRows = new Map<string, string>()
    Array.from(rows.keys()).forEach(it => {
        const v = rows.get(it)!.toString()

        pRows.set(it.toString(), v)
    })

    return pRows
}

function formatCols (columns: Map<VariableObject, Set<VariableObject>>) {
    let pCols = new Map<string, string>()
    Array.from(columns.keys()).forEach(it => {
        const v = columns.get(it)!//.toString()

        let set = Array.from(v).join(", ")

        set = `[${set}]`

        pCols.set(it.toString(), set)
    })

    return pCols
}

