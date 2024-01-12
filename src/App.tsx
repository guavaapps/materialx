import React, {useMemo, useRef, useState} from 'react';
import './App.scss';
import {Statesheet} from "./mx/styles/statesheet";
import {StyleAdapter, Theme, THEME_LIGHT} from "./mx/theme";
import {CssUtils, Rect2, Shape, ShapeDrawable} from "./mx/styles/style";
import {StatesheetHandler, TextView, useJoe} from "./mx/components/text_view";
import {Styles} from "./mx/components/button/styles";
import {Animation, Transition, TransitionHandler} from "./mx/transitions/transition";
import {useTransitionService} from "./mx/app/services";
import {Ids} from "./mx/resources/id/Id";
import {ConstraintLayout} from "./mx/layout/constraintLayout/constraint_layout";
import {ConstraintSystem} from "./mx/layout/constraintLayout/system/ConstraintSystem";
import {Component} from "./mx/components/Props";
import {Arrays} from "./mx/layout/constraintLayout/system/utils";

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

        const system = new ConstraintSystem(parentView, [childView1, childView2])
        system.measure()

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

export default App;
