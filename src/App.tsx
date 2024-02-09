import React, {forwardRef, ReactElement, ReactNode} from 'react';
import './App.scss';
import {Component, ComponentUtils} from "./mx/components/Component";
import add from "./add.svg"
import logo from "./appLogo.png"
import {Vector} from "./mx/drawable/Vector";
import {ImageView} from "./mx/components/ImageView/ImageView";
import {render} from "@testing-library/react";
import {LayoutManager, useOnLayoutHandler} from "./mx/layout/Layout";
import {Measurer} from "./mx/layout/Measurer";
import useMeasurer = Measurer.useMeasurer;
import {CoordinatorLayout} from "./mx/layout/coordinator-layout/CoordinatorLayout";
import {LayoutParams} from "./mx/layout/LayoutParams";
import MATCH_PARENT = LayoutParams.MATCH_PARENT;
import WRAP_CONTENT = LayoutParams.WRAP_CONTENT;

function App() {
    console.log("START app")

    return (
        <CoordinatorLayout id={"l1"} width={500} height={500}>
            <Component id={"c1"} width={WRAP_CONTENT} height={50} x={10}>
                <div>helloooooooooooooooo</div>
            </Component>
        </CoordinatorLayout>
    )
}

/*
<div style={{
            display: "block",
            position: "absolute",
            width: 500,
            height: 500,
            background: "red"
        }}>
            <div style={{
                display: "block",
                position: "absolute",
                // width: "100%",
                // height: "100%",
                background: "green",
                top: 10,
                left: 10
            }}>
                <p style={{
                    all: "unset",
                    display: "block",
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    background: "blue",
                }}>helloooo</p>
            </div>
        </div>
 */

/*
<CoordinatorLayout width={500} height={500}>
            <Component width={WRAP_CONTENT} height={50}>
                <p>helloooooooooooooooo</p>
            </Component>
        </CoordinatorLayout>
 */



/*
<div style={{
            width: 400,
            height: 50
        }}>
            <div style={{
                width: 100,
                height: 50,
                position: "relative",
                display: "inline-block"
            }}>
                <svg style={{
                    width: 110,
                    height: 60
                }}>
                    <path d={"M0,0 H100 V50 H0 Z"} stroke={"red"} strokeWidth={10} fill={"#00000000"}/>
                </svg>
            </div>

            <div style={{
                width: 200,
                height: 50,
                backgroundColor: "green",
                position: "relative",
                display: "inline-block"
            }}/>
        </div>
 */

export default App;
