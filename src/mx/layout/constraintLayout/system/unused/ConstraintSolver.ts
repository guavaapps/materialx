import {Arrays} from "../utils";

export enum Relation {
    EQ,
    LT,
    GT
}

interface SolverObject {}

export class Constraint implements SolverObject{
    expression: Expression
    relation: Relation
    priority = Priority.HIGHEST

    constructor(expression: Expression, relation: Relation) {
        this.expression = expression
        this.relation = relation
    }

    withPriority(p: number) {
        this.priority = p

        return this
    }
}

export abstract class EquationMember {
    protected _value: number = 0

    get value() {
        return this._value
    }

    abstract isConstant(): boolean

    abstract toExpression(): Expression

    greaterThan(m: EquationMember): Constraint {
        return this.toExpression().greaterThan(m)
    }

    lowerThan(m: EquationMember): Constraint {
        return this.toExpression().lowerThan(m)
    }

    equals(m: EquationMember): Constraint {
        return this.toExpression().equals(m)
    }

    plus(m: EquationMember): Expression {
        return this.toExpression().plus(m)
    }

    minus(m: EquationMember): Expression {
        return this.toExpression().minus(m)

    }

    times(m: EquationMember): Expression {
        return this.toExpression().times(m)

    }

    divideBy(m: EquationMember): Expression {
        return this.toExpression().divideBy(m)
    }
}

export class Expression extends EquationMember {
    terms: Term[];
    constant: number;

    constructor(terms: Term[], constant: number) {
        super();
        this.terms = terms;
        this.constant = constant;
    }

    static fromExpression(expr: Expression) {
        return new Expression(expr.terms, expr.constant)
    }

    get value() {
        let v = this.constant

        for (let term of this.terms) {
            v += term.value
        }

        return v

        // return this.terms.reduce((p, c) => p.plus(c))
        // return Fold(this.terms, 0, (prev, current) => prev.plus(current)) // TODO
    }

    isConstant(): boolean {
        return this.terms.length === 0
    }

    toExpression(): Expression {
        return this
    }

    override greaterThan(m: EquationMember): Constraint {
        return this.createConstraint(m, Relation.GT)
    }

    override lowerThan(m: EquationMember): Constraint {
        return this.createConstraint(m, Relation.LT)
    }

    override equals(m: EquationMember): Constraint {
        console.log("[EQ] equals call")
        return this.createConstraint(m, Relation.EQ)
    }

    private createConstraint(value: EquationMember, relation: Relation) {
        if (value instanceof ConstantMember) {
            return new Constraint(
                new Expression([...this.terms], this.constant - value.value),
                relation
            )
        }

        if (value instanceof Param) {
            const newTerms = [...this.terms]
            newTerms.push(new Term(value.variable, -1))
            return new Constraint(new Expression(newTerms, this.constant), relation)
        }

        if (value instanceof Term) {
            const newTerms = [...this.terms]
            newTerms.push(new Term(value.variable, -value.coeff))

            return new Constraint(new Expression(newTerms, this.constant), relation)
        }

        if (value instanceof Expression) {
            // const newTerms = value.terms.fold<List<Term>>(
            //     List<Term>.from(terms),
            //     (list, t) => list..add(Term(t.variable, -t.coefficient)),
            // );


            // fold
            // const newTerms = [...this.terms]
            // const count = value.terms.length
            //
            // for (let i = 0; i < count; i++) {
            //     const t = value.terms[i]
            //
            //     newTerms.push(new Term(t.variable, -t.coeff))
            // }
            //

            const newTerms = Arrays.fold(value.terms, [...this.terms], (list, t) => list.push(new Term(t.variable, -t.coeff)))

            return new Constraint(
                new Expression(newTerms, this.constant - value.constant),
                relation,
            );
        }
        throw new Error("createConstraint")
    }

    override plus(m: EquationMember): Expression {
        if (m instanceof ConstantMember) {
            return new Expression([...this.terms], this.constant + m.value);
        }

        if (m instanceof Param) {
            const t = [...this.terms]
            t.push(new Term(m.variable, 1))

            return new Expression(
                t,
                this.constant,
            );
        }

        if (m instanceof Term) {
            const t = [...this.terms]
            t.push(m)

            return new Expression(t, this.constant);
        }

        if (m instanceof Expression) {
            const t = [...this.terms]
            t.push(...m.terms)

            return new Expression(
                t,
                this.constant + m.constant,
            );
        }
        throw new Error("plus")
    }

    override minus(m: EquationMember): Expression {
        console.log("[EQ] minus call")

        if (m instanceof ConstantMember) {
            return new Expression([...this.terms], this.constant - m.value);
        }

        if (m instanceof Param) {
            const t = [...this.terms]
            t.push(new Term(m.variable, -1))

            return new Expression(
                t,
                this.constant,
            );
        }

        if (m instanceof Term) {
            const t = [...this.terms]
            t.push(new Term(m.variable, -m.coeff))

            return new Expression(
                t,
                this.constant,
            );
        }

        if (m instanceof Expression) {
            const copiedTerms = [...this.terms]
            for (let t of m.terms) {
                copiedTerms.push(new Term(t.variable, -t.coeff));
            }
            return new Expression(copiedTerms, this.constant - m.constant);
        }
        throw new Error("minus")
    }

    override times(m: EquationMember): Expression {
        const args = this.findMultiplication(m)

        if (args === null) {
            throw new Error("mult")
        }

        return args.by.applyMultiplication(args.of)
    }

    override divideBy(m: EquationMember): Expression {
        if (!m.isConstant()) {
            throw new Error("div")
        }

        return this.applyMultiplication(1 / m.value)
    }

    private findMultiplication(m: EquationMember) {
        if (!this.isConstant() && !m.isConstant) {
            return null;
        }

        if (this.isConstant()) {
            return new Multiplication(m.toExpression(), this.value);
        }

        if (m.isConstant()) {
            return new Multiplication(this.toExpression(), m.value);
        }

        // assert(false);
        return null;
    }

    applyMultiplication(m: number) {
        // const newTerms = terms.fold<List<Term>>(
        //     [],
        //     (list, term) => list..add(Term(term.variable, term.coefficient * m)),
        // );

        const newTerms: Term[] = []
        for (let t of this.terms) {
            newTerms.push(new Term(t.variable, t.coeff * m))
        }

        // const newTerms = Arrays.fold(this.terms,
        //     [] as Term[],
        //     (list, term) => list.push(new Term(term.variable, term.coeff * m)))

        return new Expression(newTerms, this.constant * m);
    }
}

export class ConstantMember extends EquationMember {
    _value: number

    constructor(value: number) {
        super();

        this._value = value

        console.log("[EQ] cm cons")
    }

    isConstant(): boolean {
        return true;
    }

    toExpression(): Expression {
        return new Expression([], this._value);
    }

}

export function cm (value: number) {
    return new ConstantMember(value)
}

export class Variable implements SolverObject{
    value
    private name: string | null = null

    constructor(value: number) {
        this.value = value
    }

    applyUpdate(updated: number) {
        const res = updated !== this.value
        this.value = updated

        return res
    }


} // TODO impl owner

export class Term extends EquationMember {
    variable: Variable
    coeff: number

    constructor(variable: Variable, coeff: number) {
        super();

        this.variable = variable
        this.coeff = coeff
    }

    isConstant(): boolean {
        return false;
    }

    get value() {
        return this.variable.value * this.coeff
    }

    toExpression(): Expression {
        return new Expression([new Term(this.variable, this.coeff)], 0)
    }

}

export class Param extends EquationMember {
    readonly variable: Variable

    constructor(value: number = 0) {
        super()

        this._value = value
        this.variable = new Variable(value)
    }

    isConstant(): boolean {
        return false;
    }

    toExpression(): Expression {
        return new Expression([new Term(this.variable, 1)], 0)
    }

    get value(): number {
        return this.variable.value
    }

}

export class Priority {
    static readonly HIGHEST = Priority.create(1000, 0, 0)
    static readonly HIGH = Priority.create(1, 0, 0)
    static readonly MEDIUM = Priority.create(0, 1, 0)
    static readonly LOW = Priority.create(0, 0, 1)

    private static create(a: number, b: number, c: number) {
        let result = 0

        result += Math.max(0, Math.min(1000, a)) * 1000000
        result += Math.max(0, Math.min(1000, b)) * 1000
        result += Math.max(0, Math.min(1000, c))

        return result
    }
}

export enum SymbolType {
    INVALID, EXTERNAL, SLACK, ERROR, DUMMY
}

export class Symbol {
    type: SymbolType

    constructor(type: SymbolType) {
        this.type = type
    }
}

class Tag {
    marker: Symbol
    other: Symbol

    constructor(marker: Symbol, other: Symbol) {
        this.marker = marker
        this.other = other
    }

    static fromTag(tag: Tag) {
        return new Tag(tag.marker, tag.other)
    }
}

class EditInfo {
    tag!: Tag
    constraint!: Constraint
    constant!: number

    // constructor(tag: Tag, constraint: Constraint, constant: number) {
    //     this.tag = tag;
    //     this.constraint = constraint;
    //     this.constant = constant;
    // }
}

// solver

function isValidNonRequiredPriority(priority: number) {
    return priority >= 0 && priority < Priority.HIGHEST
}

function isNearZero(value: number) {
    const epsilon = 0.00000001
    return value < 0 ? -value < epsilon : value < epsilon
}

class Row {
    cells: Map<Symbol, number> = new Map()
    constant = 0

    constructor(constant: number) {
        this.constant = constant
    }

    static fromRow(row: Row) {
        const newRow = new Row(row.constant)
        newRow.cells = new Map(row.cells)

        return newRow
    }

    add (value: number) {
        return this.constant += value
    }

    insertSymbol(symbol: Symbol, coeff: number = 1) {
        const val = this.cells.get(symbol) || 0

        if (isNearZero(val + coeff)) {
            this.cells.delete(symbol)
        } else {
            this.cells.set(symbol, val + coeff)
        }
    }

    insertRow(other: Row, coeff = 1) {
        this.constant += other.constant * coeff

        other.cells.forEach((v, s) => this.insertSymbol(s, v * coeff))
    }

    removeSymbol(symbol: Symbol) {
        this.cells.delete(symbol)
    }

    reverseSign() {
        this.constant = -this.constant
        this.cells.forEach((v, s) => this.cells.set(s, -v))
    }

    solveForSymbol(symbol: Symbol) {
        if (!this.cells.has(symbol)) {
            throw new Error("solve for symbol")
        }

        const coeff = -1 / this.cells.get(symbol)!

        this.cells.delete(symbol)
        this.constant *= coeff

        this.cells.forEach((v, s) => this.cells.set(s, v * coeff))
    }

    solveForSymbols(lhs: Symbol, rhs: Symbol) {
        this.insertSymbol(lhs, -1)
        this.solveForSymbol(rhs)
    }

    coefficientForSymbol(symbol: Symbol) {
        return this.cells.get(symbol) || 0
    }

    substitute(symbol: Symbol, row: Row) {
        const coeff = this.cells.get(symbol) || null

        if (coeff === null) {
            return
        }

        this.cells.delete(symbol)

        this.insertRow(row, coeff)
    }
}

export class SolverResult {
    private message: string;
    private isError: boolean

    constructor(message: string, isError = true) {
        this.message = message;
        this.isError = isError;
    }

    static SUCCESS = new SolverResult("success")
}

export class Solver {
    readonly constraints: Map<Constraint, Tag> = new Map()
    readonly rows: Map<Symbol, Row> = new Map()
    readonly vars: Map<Variable, Symbol> = new Map()
    readonly edits: Map<Variable, EditInfo> = new Map()
    readonly infeasibleRows: Symbol[] = []
    readonly objective: Row = new Row(0)

    artificial = new Row(0)

    addConstraints(constraints: Constraint[]) {
        const applier = (c: Constraint) => this.addConstraint(c)
        const undoer = (c: Constraint) => this.removeConstraint(c)

        return this.bulkEditConstraints(constraints, applier, undoer)
    }

    addConstraint(constraint: Constraint) {
        if (this.constraints.has(constraint)) {
            // duplicate
            return Result.DUPLICATE
        }

        const tag = new Tag(new Symbol(SymbolType.INVALID), new Symbol(SymbolType.INVALID))

        const row = this.createRow(constraint, tag)

        let subject = this.chooseSubjectFromRow(row, tag)

        this.constraints.set(constraint, tag)

        if (subject.type === SymbolType.INVALID && this.allDummiesInRow(row)) {
            if (!isNearZero(row.constant)) {
                return Result.UNSOLVABLE
            }
            else {
                subject = tag.marker
            }
        }

        if (subject.type === SymbolType.INVALID) {
            if (!this.addWithArtificialVariableOnRow(row)) {
                return Result.UNSOLVABLE
            }
        }
        else {
            row.solveForSymbol(subject)
            this.substitute(subject, row)
            this.rows.set(subject, row)
        }

        return this.optimizeObjectiveRow(this.objective)
    }

    removeConstraints(constraints: Constraint[]) {
        const applier = (c: Constraint) => this.removeConstraint(c)
        const undoer = (c: Constraint) => this.addConstraint(c)

        return this.bulkEditConstraints(constraints, applier, undoer)
    }

    removeConstraint(constraint: Constraint) {
        let tag = this.constraints.get(constraint) || null
        if (tag == null) {
            return Result.UNKNOWN
        }

        tag = Tag.fromTag(tag);
        this.constraints.delete(constraint);

        this.removeConstraintEffects(constraint, tag);

        let row = this.rows.get(tag.marker) || null
        if (row != null) {
            this.rows.delete(tag.marker);
        } else {
            const leaving = this.leavingSymbolForMarkerSymbol(tag.marker);

            row = this.rows.get(leaving)!
            this.rows.delete(leaving)

            row.solveForSymbols(leaving, tag.marker);
            this.substitute(tag.marker, row);
        }

        return this.optimizeObjectiveRow(this.objective);
    }

    hasConstraint(constraint: Constraint) {
        return this.constraints.has(constraint)
    }

    addEditVariables(variables: Variable[], priority: number) {
        const applier = (v: Variable) => this.addEditVariable(v, priority)
        const undoer = (v: Variable) => this.removeEditVariable(v)

        return this.bulkEditVariables(variables, applier, undoer)
    }

    addEditVariable(variable: Variable, priority: number) {
        if (this.edits.has(variable)) {
            return Result.DUPLICATE_EDIT_VAR;
        }

        if (!isValidNonRequiredPriority(priority)) {
            return Result.BAD_REQUIRED_STRENGTH;
        }

        const constraint = new Constraint(
            new Expression([new Term(variable, 1)], 0),
            Relation.EQ,
        )
        constraint.priority = priority;

        // ignore: unused_local_variable
        const result = this.addConstraint(constraint);

        if (result !== Result.SUCCESS) {
            throw new Error("assertion error")
        }
        // assert(result == Result.success);

        const info = new EditInfo()

        info.tag = this.constraints.get(constraint)!
        info.constraint = constraint
        info.constant = 0.0

        this.edits.set(variable, info)

        return Result.SUCCESS
    }

    removeEditVariables(variables: Variable[]) {
        const applier = (v: Variable) => this.removeEditVariable(v)
        const undoer = (v: Variable) => this.addEditVariable(v, this.edits.get(v)!.constraint.priority)

        return this.bulkEditVariables(variables, applier, undoer)
    }

    removeEditVariable(variable: Variable): Result {
        const info = this.edits.get(variable) || null

        if (info === null) {
            return Result.UNKNOWN_EDIT_VAR
        }

        const result = this.removeConstraint(info.constraint)

        if (result !== Result.SUCCESS) {
            throw new Error("assert")
        }

        this.edits.delete(variable)

        return Result.SUCCESS
    }

    hasEditVariable(variable: Variable) {
        return this.edits.has(variable)
    }

    suggestValueForVariable(variable: Variable, value: number) {
        if (!this.edits.has(variable)) {
            return Result.UNKNOWN_EDIT_VAR
        }

        this.suggestValueForEditInfoWithoutDualOptimization(this.edits.get(variable)!, value)

        return this.dualOptimize()
    }

    flushUpdates() {
        const updates = new Set<any>()

        for (let variable of this.vars.keys()) {
            const symbol = this.vars.get(variable)!
            const row = this.rows.get(symbol) || null

            const updatedValue = row === null ? 0 : row.constant

            variable.applyUpdate(updatedValue)
        }
    }

    private bulkEditVariables(items: Variable[], applier: SolverBulkUpdateVariables, undoer: SolverBulkUpdateVariables) {
        const applied: Variable[] = []
        let needsCleanup = false

        let result = Result.SUCCESS

        for (let item of items) {
            result = applier(item)

            if (result === Result.SUCCESS) {
                applied.push(item)
            } else {
                needsCleanup = true
                break
            }
        }

        if (needsCleanup) {
            applied.reverse().forEach(undoer)
        }

        return result
    }
    private bulkEditConstraints(items: Constraint[], applier: SolverBulkUpdateConstraint, undoer: SolverBulkUpdateConstraint) {
        const applied: Constraint[] = []
        let needsCleanup = false

        let result = Result.SUCCESS

        for (let item of items) {
            result = applier(item)

            if (result === Result.SUCCESS) {
                applied.push(item)
            } else {
                needsCleanup = true
                break
            }
        }

        if (needsCleanup) {
            applied.reverse().forEach(undoer)
        }

        return result
    }


    symbolForVariable(variable: Variable) {
        let symbol = this.vars.get(variable) || null

        if (symbol !== null) {
            return symbol
        }

        symbol = new Symbol(SymbolType.EXTERNAL)

        this.vars.set(variable, symbol)

        return symbol
    }

    createRow(constraint: Constraint, tag: Tag) {
        const expr = Expression.fromExpression(constraint.expression)
        const row = new Row(expr.constant)

        for (let term of expr.terms) {
            if (!isNearZero(term.coeff)) {
                const symbol = this.symbolForVariable(term.variable)

                const foundRow = this.rows.get(symbol) || null

                if (foundRow !== null) {
                    row.insertRow(foundRow, term.coeff)
                } else {
                    row.insertSymbol(symbol, term.coeff)
                }
            }
        }

        switch (constraint.relation) {
            case Relation.LT:
            case Relation.GT:
                const coeff = constraint.relation === Relation.LT ? 1 : -1

                const slack = new Symbol(SymbolType.SLACK)
                tag.marker = slack
                row.insertSymbol(slack, coeff)

                if (constraint.priority < Priority.HIGHEST) {
                    const error = new Symbol(SymbolType.ERROR)
                    tag.other = error
                    row.insertSymbol(error, -coeff)
                    this.objective.insertSymbol(error, constraint.priority)
                }

                break

            case Relation.EQ:
                if (constraint.priority < Priority.HIGHEST) {
                    const errPlus = new Symbol(SymbolType.ERROR);
                    const errMinus = new Symbol(SymbolType.ERROR);
                    tag.marker = errPlus
                    tag.other = errMinus;

                    row.insertSymbol(errPlus, -1)
                    row.insertSymbol(errMinus, 1);
                    this.objective.insertSymbol(errPlus, constraint.priority)
                    this.objective.insertSymbol(errMinus, constraint.priority);
                } else {
                    const dummy = new Symbol(SymbolType.DUMMY);
                    tag.marker = dummy;
                    row.insertSymbol(dummy);
                }
                break
        }

        if (row.constant < 0) {
            row.reverseSign()
        }

        return row
    }

    chooseSubjectFromRow(row: Row, tag: Tag) {
        for (let symbol of row.cells.keys()) {
            if (symbol.type === SymbolType.EXTERNAL) {
                return symbol;
            }
        }

        if (tag.marker.type === SymbolType.SLACK ||
            tag.marker.type === SymbolType.ERROR) {
            if (row.coefficientForSymbol(tag.marker) < 0.0) {
                return tag.marker;
            }
        }

        if (tag.other.type === SymbolType.SLACK ||
            tag.other.type === SymbolType.ERROR) {
            if (row.coefficientForSymbol(tag.other) < 0.0) {
                return tag.other;
            }
        }

        return new Symbol(SymbolType.INVALID);
    }

    allDummiesInRow(row: Row) {
        for (let symbol of row.cells.keys()) {
            if (symbol.type !== SymbolType.DUMMY) {
                return false;
            }
        }
        return true;
    }

    addWithArtificialVariableOnRow(row: Row) {
        const artificial = new Symbol(SymbolType.SLACK);
        this.rows.set(artificial, Row.fromRow(row))
        this.artificial = Row.fromRow(row);

        const result = this.optimizeObjectiveRow(this.artificial);

        if (Result.isError(result)) {
            // FIXME(csg): Propagate this up!
            return false;
        }

        const success = isNearZero(this.artificial.constant);
        this.artificial = new Row(0);

        const foundRow = this.rows.get(artificial) || null
        if (foundRow != null) {
            this.rows.delete(artificial);
            if (foundRow.cells.size === 0) {
                return success;
            }

            const entering = this.anyPivotableSymbol(foundRow);
            if (entering.type === SymbolType.INVALID) {
                return false;
            }

            foundRow.solveForSymbols(artificial, entering);
            this.substitute(entering, foundRow);
            this.rows.set(entering, foundRow)
        }

        for (let row of this.rows.values()) {
            row.removeSymbol(artificial);
        }
        this.objective.removeSymbol(artificial);
        return success;
    }

    optimizeObjectiveRow(objective: Row) {
        let entering = this.enteringSymbolForObjectiveRow(objective);
        while (entering.type !== SymbolType.INVALID) {
            const leaving = this.leavingSymbolForEnteringSymbol(entering);

            const row = this.rows.get(leaving)!
            this.rows.delete(leaving)
            row.solveForSymbols(leaving, entering);
            this.substitute(entering, row);
            this.rows.set(entering, row)

            entering = this.enteringSymbolForObjectiveRow(objective);
        }
        return Result.SUCCESS
    }

    enteringSymbolForObjectiveRow(objective: Row) {
        const cells = objective.cells;

        for (let symbol of cells.keys()) {
            if (symbol.type !== SymbolType.DUMMY && cells.get(symbol)! < 0.0) {
                return symbol;
            }
        }

        return new Symbol(SymbolType.INVALID);
    }

    leavingSymbolForEnteringSymbol(entering: Symbol) {
        let ratio = Number.MAX_VALUE//double.maxFinite;
        let result: Symbol
        this.rows.forEach((row, symbol) => {
            if (symbol.type !== SymbolType.EXTERNAL) {
                const temp = row.coefficientForSymbol(entering);
                if (temp < 0.0) {
                    const tempRatio = -row.constant / temp;
                    if (tempRatio < ratio) {
                        ratio = tempRatio;
                        result = symbol;
                    }
                }
            }
        });
        return result!
    }

    substitute(symbol: Symbol, row: Row) {
        this.rows.forEach((second, first) => {
            second.substitute(symbol, row);
            if (first.type !== SymbolType.EXTERNAL && second.constant < 0.0) {
                this.infeasibleRows.push(first);
            }
        });
        this.objective.substitute(symbol, row);
        this.artificial.substitute(symbol, row);
    }

    anyPivotableSymbol(row: Row) {
        for (let symbol of row.cells.keys()) {
            if (symbol.type == SymbolType.SLACK ||
                symbol.type == SymbolType.ERROR) {
                return symbol;
            }
        }
        return new Symbol(SymbolType.INVALID)
    }

    removeConstraintEffects(cn: Constraint, tag: Tag) {
        if (tag.marker.type === SymbolType.ERROR) {
            this.removeMarkerEffects(tag.marker, cn.priority);
        }
        if (tag.other.type === SymbolType.ERROR) {
            this.removeMarkerEffects(tag.other, cn.priority);
        }
    }

    removeMarkerEffects(marker: Symbol, strength: number) {
        const row = this.rows.get(marker) || null
        if (row !== null) {
            this.objective.insertRow(row, -strength);
        } else {
            this.objective.insertSymbol(marker, -strength);
        }
    }

    leavingSymbolForMarkerSymbol(marker: Symbol) {
        let r1 = Number.MAX_VALUE
        let r2 = Number.MAX_VALUE

        let first: Symbol | null = null
        let second: Symbol | null = null
        let third: Symbol | null = null
        // _Symbol? first, second, third;

        this.rows.forEach((row, symbol) => {
            const c = row.coefficientForSymbol(marker);
            if (c === 0.0) {
                return;
            }
            if (symbol.type === SymbolType.EXTERNAL) {
                third = symbol;
            } else if (c < 0.0) {
                const r = -row.constant / c;
                if (r < r1) {
                    r1 = r;
                    first = symbol;
                }
            } else {
                const r = row.constant / c;
                if (r < r2) {
                    r2 = r;
                    second = symbol;
                }
            }
        });

        if (first) {
            return first
        } else if (second) {
            return second
        }

        return third!

        // return first ?? second ?? third!
    }

    suggestValueForEditInfoWithoutDualOptimization(info: EditInfo, value: number) {
        const delta = value - info.constant
        info.constant = value

        let symbol = info.tag.marker
        let row = this.rows.get(info.tag.marker) || null

        if (row !== null) {
            if (row!.add(-delta) < 0) {
                this.infeasibleRows.push(symbol)
            }

            return
        }

        symbol = info.tag.other
        row = this.rows.get(info.tag.other) || null

        if (row !== null) {
            if (row!.add(delta) < 0) {
                this.infeasibleRows.push(symbol)
            }

            return
        }

        for (let s of this.rows.keys()) {
            const row = this.rows.get(symbol)!
            const coeff = row.coefficientForSymbol(info.tag.marker)

            if (coeff !== 0
            && row.add(delta * coeff) < 0
            && s.type !== SymbolType.EXTERNAL) {
                this.infeasibleRows.push(s)
            }
        }
    }

    dualOptimize() {
        while (this.infeasibleRows.length > 0) {
            const leaving = this.infeasibleRows.pop()!
            const row = this.rows.get(leaving) || null

            if (row != null && row.constant < 0.0) {
                const entering = this.dualEnteringSymbolForRow(row);

                assert(entering.type !== SymbolType.INVALID);

                this.rows.delete(leaving);

                row.solveForSymbols(leaving, entering);
                this.substitute(entering, row);
                this.rows.set(entering, row)
            }
        }
        return Result.SUCCESS;
    }

    dualEnteringSymbolForRow(row: Row) {
        let entering: Symbol | null = null

        let ratio = Number.MAX_VALUE//double.maxFinite;

        const rowCells = row.cells;

        for (let symbol of rowCells.keys()) {
            const value = rowCells.get(symbol)!

            if (value > 0.0 && symbol.type !== SymbolType.DUMMY) {
                const coeff = this.objective.coefficientForSymbol(symbol);
                const r = coeff / value;
                if (r < ratio) {
                    ratio = r;
                    entering = symbol;
                }
            }
        }

        return entering ?? new Symbol(SymbolType.INVALID);
    }
}

enum Result {
    SUCCESS,
    DUPLICATE,
    UNSOLVABLE,
    UNKNOWN,
    DUPLICATE_EDIT_VAR,
    BAD_REQUIRED_STRENGTH,
    UNKNOWN_EDIT_VAR
}

namespace Result {
    export function isError(result: Result) {
        if (result === Result.SUCCESS) {
            return false
        }

        return true
    }
}

type SolverBulkUpdateVariables = (o: Variable) => Result
type SolverBulkUpdateConstraint = (o: Constraint) => Result

class Multiplication {
    by: Expression
    of: number

    constructor(by: Expression, of: number) {
        this.by = by
        this.of = of
    }
}

function assert (condition: boolean) {
    if (!condition) {
        throw new Error("assertion error")
    }
}