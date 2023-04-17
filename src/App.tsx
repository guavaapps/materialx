import React from 'react';
import './App.scss';
import "./style.scss"
import {Hct} from "./mx/ui/color/Hct";
import {ColorUtils} from "./mx/ui/color/ColorUtils";
import {_Button, ButtonStyle, Button} from "./mx/components/button/button";
import PointerEvent from "./mx/ui/event/pointer_event";
import {StyleAdapter, styled, Theme, THEME_LIGHT} from "./mx/theme";
import {computeShadow, createCssShadow} from "./mx/elevation";
import logo from "./logo.svg"
import add from "./add.svg"
import {ColorFunction} from "./mx/styles/colorFunction";
import {Argb} from "./mx/ui/color/Argb";
import {Statesheet} from "./mx/styles/statesheet";
import {Styles} from "./mx/components/button/styles";
import {App as Fragment} from "./mx/theme";

/*
theme
[Log] pink10: #ff1b1b1a (main.635711f13ccab17ffd30.hot-update.js, line 39)
[Log] pink20: #ff30302f (main.635711f13ccab17ffd30.hot-update.js, line 39)
[Log] pink30: #ff474746 (main.635711f13ccab17ffd30.hot-update.js, line 39)
[Log] pink40: #ff5e5e5d (main.635711f13ccab17ffd30.hot-update.js, line 39)
[Log] pink50: #ff777776 (main.635711f13ccab17ffd30.hot-update.js, line 39)
[Log] pink60: #ff919190 (main.635711f13ccab17ffd30.hot-update.js, line 39)
[Log] pink70: #ffababaa (main.635711f13ccab17ffd30.hot-update.js, line 39)
[Log] pink80: #ffc6c6c5 (main.635711f13ccab17ffd30.hot-update.js, line 39)

 */

function theme() {
    for (let i = 0; i <= 100; i += 10) {
        let pink = Hct.fromInt(ColorUtils.intFromRgb(255, 128, 0))
        pink.tone = i
        let p = pink.toInt()
        let h = ColorUtils.hexFromInt(p)
        console.log(`$coral${i}: ${h}`)
    }
}

function decomp(int: number) {
    const hct = Hct.fromInt(int)
    const {hue, chroma, tone} = hct
    console.log("hct", hue, chroma, tone)

}

function App() {
    return (
        <div className="App">
            <div>
                <Fragment theme={THEME_LIGHT}>
                    <Button isEnabled={true} icon={add} label={"Button"} style={Styles.Button.Filled}></Button>
                </Fragment>
            </div>
        </div>
    );
}

const clickHandler = (e?: PointerEvent) => {
    console.log("clicked")
}

export default App;
