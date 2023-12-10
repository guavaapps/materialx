import React, {useRef, useState} from 'react';
import './App.scss';
import {Statesheet} from "./mx/styles/statesheet";
import {Component, StyleAdapter, Theme, THEME_LIGHT} from "./mx/theme";
import {CssUtils, Rect2, Shape, ShapeDrawable} from "./mx/styles/style";
import {Layout, StatesheetHandler, TextView, useJoe} from "./mx/components/text_view";
import {Styles} from "./mx/components/button/styles";
import {Animation, Transition, TransitionHandler} from "./mx/transitions/transition";
import {useTransitionService} from "./mx/app/services";
import {useApp} from "./mx/app/app";
import {App as MaterialApp} from "./mx/app/app"
import {Simulate} from "react-dom/test-utils";
import progress = Simulate.progress;
import {ConstraintLayout, LayoutTestComponent} from "./mx/layout/constraint_layout";

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

    const comp = Statesheet.createComposite(ss)
    const startState = "enabled$selected"
    const endState = "disabled"

    const ssHandler = StatesheetHandler.fromStatesheet(comp)
    const newState = ssHandler.applyOn(startState, endState)

    const strt = "M0,0 H100 V50 H0 V0 Z"
    const endd = "M0,0 H50 V25 H0 V0 Z"

    const constraintLayout = (
        <ConstraintLayout>
            <LayoutTestComponent id="text1" text="text1" layoutParams={{
                leftToLeftOf: "parent",
                rightToLeftOf: "text2"
            }}></LayoutTestComponent>

            <LayoutTestComponent id="text2" text="text2" layoutParams={{
                rightToRightOf: "parent",
                leftToRightOf: "text1"
            }}></LayoutTestComponent>
        </ConstraintLayout>
    )

    return (constraintLayout)
}

export default App;
