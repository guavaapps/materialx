import {approxEquals, Strength, SystemMetrics, VariableObject} from "./LinearSystem";
import {Expression} from "./LinearSystem";
import {Constraint} from "./Constraints";

export class AbstractVariable {
    name?: string
    isDummy = false
    isExternal = false
    isPivotable = false
    isRestricted = false

    constructor(name?: string) {
        this.name = name

        SystemMetrics.addVar(this)
    }

    times(x: number | Expression): Expression {
        if (x instanceof Expression) {
            if (x.isConstant()) {
                return new Expression(this, x.constant)
            } else {
                throw new Error()
            }
        }

        return new Expression(this, x)

    }

    divBy(x: number | Expression) {
        if (typeof x === "number") {
            if (approxEquals(x, 0)) {
                throw new Error()
            }

            return new Expression(this, 1 / x)
        }

        if (x.isConstant()) {
            return new Expression(this, 1 / x.constant)
        } else {
            throw new Error()
        }
    }

    plus(x: number | Expression | VariableObject): Expression {
        if (x instanceof Expression) {
            let r = new Expression(this).plus(x)
            console.log("R_C exp", this.toString(), "||" , r.toString(), "||", x.toString())
            return r
        } else if (
            x instanceof Variable
            || x instanceof DummyVariable
            || x instanceof SlackVariable
            || x instanceof ObjectiveVariable
        ) {
            let s = new Expression(this)
            let r = s.plus(new Expression(x))
            console.log("R_C var", s.toString(), "||" , r.toString(), "||", x.toString())
            return r
        }

        let r = new Expression(this, 1, x)
        console.log("R_C num", this, "||" , r.toString(), "||", x.toString())

        return r
    }

    minus(x: number | Expression | AbstractVariable) {
        if (typeof x === "number") {
            return new Expression(this, 1, -x)
        } else if (x instanceof Expression) {
            return new Expression(this).minus(x)
        } else if (x instanceof AbstractVariable) {
            return new Expression(this).minus(new Expression(x))
        }

        throw new Error()
    }
}

export class Variable extends AbstractVariable {
    value: number

    constructor(value = 0, name?: string) {
        super(name);

        this.value = value
        this.isExternal = true

        SystemMetrics.addVar(this)
    }

    equals(other: number | Expression | Variable) {
        return new Constraint(this, Constraint.EQ, other)
    }

    lowerThan(other: number | Expression | Variable) {
        return new Constraint(this, Constraint.LE, other)
    }

    greaterThan(other: number | Expression | Variable) {
        return new Constraint(this, Constraint.GE, other)
    }

    toString() {
        return `${this.name}[${this.value}]`
    }
}

export class DummyVariable extends AbstractVariable {
    constructor(number: number) {
        super(`d${number}`);

        this.isDummy = true
        this.isRestricted = true

        SystemMetrics.addVar(this)
    }

    toString() {
        return `${this.name}:dummy`
    }
}

export class ObjectiveVariable extends AbstractVariable {
    constructor(name: string) {
        super(name);

        SystemMetrics.addVar(this)
    }

    toString() {
        return `${this.name}:obj`
    }
}

export class SlackVariable extends AbstractVariable {
    constructor(prefix: string, number: number) {
        super(`${prefix}${number}`);

        this.isPivotable = true
        this.isRestricted = true
    }

    toString() {
        return `${this.name}:slack`
    }
}


