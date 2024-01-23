import {Expression, Strength} from "./LinearSystem";
import {AbstractVariable, Variable} from "./Variables";

export class AbstractConstraint {
    strength: Strength
    weight: number

    isEditConstraint = false
    isInequality = false
    isStayConstraint = false

    constructor(strength: Strength, weight = 1) {
        this.strength = strength
        this.weight = weight
    }

    isRequired() {
        return this.strength === Strength.REQUIRED
    }
}

export class EditConstraint extends AbstractConstraint {
    variable: AbstractVariable;
    expression: Expression

    constructor(variable: Variable, strength = Strength.STRONG, weight = 1) {
        super(strength, weight);

        this.variable = variable
        this.expression = new Expression(variable, -1, variable.value)
        this.isEditConstraint = true
    }

    toString () {
        let s

        switch (this.strength){
            case Strength.STRONG:
                s = "Strong"
                break
            case Strength.MEDIUM:
                s = "Medium"
                break
            case Strength.WEAK:
                s = "Weak"
                break

            default:
                s = "Required"
        }

        return `edit:${s}:{${this.weight}}(${this.expression})`
    }
}

export class StayConstraint extends AbstractConstraint {
    variable: Variable;
    expression: Expression

    constructor(variable: Variable, strength = Strength.STRONG, weight = 1) {
        super(strength, weight);

        this.variable = variable
        this.expression = new Expression(variable, -1, variable.value)
        this.isStayConstraint = true
    }

    toString () {
        let s

        switch (this.strength){
            case Strength.STRONG:
                s = "Strong"
                break
            case Strength.MEDIUM:
                s = "Medium"
                break
            case Strength.WEAK:
                s = "Weak"
                break

            default:
                s = "Required"
        }

        return `stay:${s}:{${this.weight}}(${this.expression})`
    }
}

export class Constraint extends AbstractConstraint {
    static LE = -1
    static EQ = 0
    static GE = 1

    expression!: Expression

    // param types correct
    constructor(param1: number | Expression | Variable, operator = Constraint.EQ, param2?: number | Expression | Variable, strength = Strength.REQUIRED, weight = 1) {
        super(strength, weight)

        if (param1 instanceof Expression) {
            if (param2 === undefined) {
                this.expression = param1
            }
            else if (param2 instanceof Expression) {
                this.expression = param1.clone()

                if (operator === Constraint.LE) {
                    this.expression.multiply(-1)
                    this.expression.addExpression(param2, 1)
                } else if (operator === Constraint.EQ) {
                    this.expression.addExpression(param2, -1)
                } else if (operator === Constraint.GE) {
                    this.expression.addExpression(param2, -1)
                } else {
                    throw new Error()
                }
            }
            else if (param2 instanceof Variable) {
                this.expression = param1.clone()

                if (operator === Constraint.LE) {
                    this.expression.multiply(-1)
                    this.expression.addVariable(param2, 1)
                } else if (operator === Constraint.EQ) {
                    this.expression.addVariable(param2, -1)
                } else if (operator === Constraint.GE) {
                    this.expression.addVariable(param2, -1)
                } else {
                    throw new Error()
                }
            }
            else if (typeof param2 === "number") {
                this.expression = param1.clone()

                if (operator === Constraint.LE) {
                    this.expression.multiply(-1)
                    this.expression.addExpression(new Expression(undefined, 1, param2), 1)
                } else if (operator === Constraint.EQ) {
                    this.expression.addExpression(new Expression(undefined, 1, param2), -1)
                } else if (operator === Constraint.GE) {
                    this.expression.addExpression(new Expression(undefined, 1, param2), -1)
                } else {
                    throw new Error()
                }
            }
            else {
                throw new Error()
            }
        }
        else if (param1 instanceof Variable) {
            if (!param2) {
                this.expression = new Expression(param1)
            }
            else if (param2 instanceof Expression) {
                this.expression = param2.clone()

                if (operator === Constraint.LE) {
                    this.expression.addVariable(param1, -1)
                } else if (operator === Constraint.EQ) {
                    this.expression.addVariable(param1, -1)
                } else if (operator === Constraint.GE) {
                    this.expression.multiply(-1)
                    this.expression.addVariable(param1, 1)
                } else {
                    throw new Error()
                }
            }
            else if (param2 instanceof Variable) {
                this.expression = new Expression(param2)

                if (operator === Constraint.LE) {
                    this.expression.addVariable(param1, -1)
                } else if (operator === Constraint.EQ) {
                    this.expression.addVariable(param1, -1)
                } else if (operator === Constraint.GE) {
                    this.expression.multiply(-1)
                    this.expression.addVariable(param1, 1)
                } else {
                    throw new Error()
                }
            }
            else if (typeof param2 === "number") {
                this.expression = new Expression(undefined, 1, param2)

                if (operator === Constraint.LE) {
                    this.expression.addVariable(param1, -1)
                }
                else if (operator === Constraint.EQ) {
                    this.expression.addVariable(param1, -1)
                }
                else if (operator === Constraint.GE) {
                    this.expression.multiply(-1)
                    this.expression.addVariable(param1, 1)
                }
            }
        }
        else if (typeof param1 === "number") {
            if (!param2) {
                this.expression = new Expression(undefined, 1, param1)
            }
            else if (param2 instanceof Expression) {
                this.expression = param2.clone()

                if (operator === Constraint.LE) {
                    this.expression.addExpression(new Expression(undefined, 1, param1), -1)
                } else if (operator === Constraint.EQ) {
                    this.expression.addExpression(new Expression(undefined, 1, param1), -1)
                } else if (operator === Constraint.GE) {
                    this.expression.multiply(-1)
                    this.expression.addExpression(new Expression(undefined, 1, param1), 1)
                } else {
                    throw new Error()
                }
            }
            else if (param2 instanceof Variable) {
                this.expression = new Expression(undefined, 1, param1)

                if (operator === Constraint.LE) {
                    this.expression.addVariable(param2, -1)
                } else if (operator === Constraint.EQ) {
                    this.expression.addVariable(param2, -1)
                } else if (operator === Constraint.GE) {
                    this.expression.multiply(-1)
                    this.expression.addVariable(param2, 1)
                } else {
                    throw new Error()
                }
            }
            else if (typeof param2 === "number") {
                throw new Error()
            }
        }
        else {
            throw new Error()
        }

        this.isInequality = operator !== Constraint.EQ
    }

    clone() {
        let c = new Constraint(this.expression, Constraint.EQ, undefined, this.strength, this.weight)
        c.isInequality = this.isInequality

        return c
    }

    toString () {
        let s

        switch (this.strength){
            case Strength.STRONG:
                s = "Strong"
                break
            case Strength.MEDIUM:
                s = "Medium"
                break
            case Strength.WEAK:
                s = "Weak"
                break

            default:
                s = "Required"
        }

        return `${s}:{${this.weight}}(${this.expression})`
    }
}