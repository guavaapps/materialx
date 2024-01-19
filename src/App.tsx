import React, {useMemo} from 'react';
import './App.scss';
import {Statesheet} from "./mx/styles/statesheet";
import {THEME_LIGHT} from "./mx/theme";
import {Rect2, ShapeDrawable} from "./mx/styles/style";
import {StatesheetHandler, useJoe} from "./mx/components/text_view";
import {Styles} from "./mx/components/button/styles";
import {Transition} from "./mx/transitions/transition";
import {useTransitionService} from "./mx/app/services";
import {ConstraintLayout} from "./mx/layout/constraintLayout/constraint_layout";
import {Component} from "./mx/components/Props";
import {Metrics} from "./mx/layout/constraintLayout/system/Metrics";
import {LinearSystem, Strength, SystemMetrics} from "./mx/layout/constraintLayout/system/unused/LinearSystem";
import {Variable} from "./mx/layout/constraintLayout/system/unused/Variables";

function TransitionTestComponent() {
    const transition: Transition = {
        duration: 2000, steps: [0, 10]
    }

    const TransitionService = useTransitionService()

    const anim = TransitionService?.animate(transition, {
        onPause(): void {
        },
        onProgressChanged(progress: number): void {
            if (progress > 0.5) {
                anim?.pause()
            }
        },
        onStart(): void {
            console.log("started")
        }

    })

    anim?.play()

    setTimeout(() => {
    }, 1000)

    setTimeout(() => {
        console.log("animation object", anim)
    }, 10000)

    return <div></div>
}

function App() {
    const s = Statesheet.createComposite({
        enabled: {
            b: 0,

            selected: {
                a: 0
            }
        },
        disabled: {
            d: 1
        }
    })

    const shape = ShapeDrawable.createRect({
        width: 100,
        height: 50,
        cornerRadius: [10, 20, 10, 20],
    })

    const oval = ShapeDrawable.createOval({
        width: 100,
        height: 50,
    })

    const layout = (bounds: Rect2, ss: object) => {
        return {}
    }

    useJoe(layout, Styles.Button.Filled, THEME_LIGHT)

    const ss = {
        enabled: {
            selected: {
                attr: 10
            },

            unselected: {
                cock: 69
            }
        },

        disabled: {
            selected: {
                as: 1,
            },

            unselected: {
                afds: 1
            }
        }
    }

    //

    const memo = useMemo(() => {
        const parentLayoutParams = new ConstraintLayout.LayoutParams ()
        parentLayoutParams.width = 500
        parentLayoutParams.height = 500

        const childLayoutParams1 = new ConstraintLayout.LayoutParams()
        childLayoutParams1.width = 100
        childLayoutParams1.height = 50

        childLayoutParams1.leftToLeft = ConstraintLayout.LayoutParams.PARENT
        childLayoutParams1.topToTop = ConstraintLayout.LayoutParams.PARENT
        childLayoutParams1.bottomToBottom = ConstraintLayout.LayoutParams.PARENT
        childLayoutParams1.rightToLeft = "view2"

        const childLayoutParams2 = new ConstraintLayout.LayoutParams()
        childLayoutParams2.width = 100
        childLayoutParams2.height = 50

        childLayoutParams2.leftToRight = "view1"
        childLayoutParams2.topToTop = ConstraintLayout.LayoutParams.PARENT
        childLayoutParams2.bottomToBottom = ConstraintLayout.LayoutParams.PARENT
        childLayoutParams2.rightToRight = ConstraintLayout.LayoutParams.PARENT

        const parentView: Component = {
            id: "main_layout",
            layoutParams: parentLayoutParams
        }

        const childView1: Component = {
            id: "view1",
            layoutParams: childLayoutParams1
        }

        const childView2: Component = {
            id: "view2",
            layoutParams: childLayoutParams2
        }

        // const system = new ConstraintSystem(parentView, [childView1, childView2])
        // system.measure()

        const system = new LinearSystem()

        const left1 = new Variable(0, "left1")
        const width1 = new Variable(0, "width1")

        const left2 = new Variable(0, "left2")
        const width2 = new Variable(0, "width2")

        const pLeft = new Variable(0, "parentLeft")
        const pRight = new Variable(0, "parentRight")

        pLeft.value = 0
        system.addStay(pLeft)
        system.addStay(pRight, Strength.WEAK)

        system.addConstraint(width1.equals(width2))
        system.addConstraint(left1.equals(pLeft.plus(50)))
        console.log("MARKER")
        system.addConstraint(pLeft.plus(pRight).equals(left2.plus(width2).plus(50)))

        system.addConstraint(left2.equals(left1.plus(width1).plus(100)))

        system.addConstraint(width1.greaterThan(87))
        system.addConstraint(width1.equals(87), Strength.STRONG)

        system.addConstraint(width2.greaterThan(113))
        system.addConstraint(width2.equals(113), Strength.STRONG)

        // system.solve()

        console.log("cs", left1.value, left2.value, width1.value, width2.value)

        // const mid = new Variable(15)
        // solver.addConstraint((left.plus(right)).equals(new Term(mid, 1).times(cm(2))))
        // solver.addEditVariable(mid, Priority.HIGH)
        //solver.flushUpdates()

        Metrics.logAll()

        return "memo"
    }, [])

    console.log("memo", memo)

    //

    const comp = Statesheet.createComposite(ss)
    const startState = "enabled$selected"
    const endState = "disabled"

    const ssHandler = StatesheetHandler.fromStatesheet(comp)
    const newState = ssHandler.applyOn(startState, endState)

    const strt = "M0,0 H100 V50 H0 V0 Z"
    const endd = "M0,0 H50 V25 H0 V0 Z"

    // const constraintLayout = (
    //     <ConstraintLayout>
    //         <LayoutTestComponent id="text1" text="text1" layoutParams={{
    //             leftToLeftOf: "parent",
    //             rightToLeftOf: "text2"
    //         }}></LayoutTestComponent>
    //
    //         <LayoutTestComponent id="text2" text="text2" layoutParams={{
    //             rightToRightOf: "parent",
    //             leftToRightOf: "text1"
    //         }}></LayoutTestComponent>
    //     </ConstraintLayout>
    // )

    // return (constraintLayout)

    return (<div>
        <p>
            hello1
        </p>
        <p>
            hello2
        </p>
    </div>)
}

class TestClass {

}

export default App;
