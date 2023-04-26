import React from 'react';
import './App.scss';
import "./style.scss"
import {Button} from "./mx/components/button/button";
import {THEME_LIGHT} from "./mx/theme";
import add from "./add.svg"
import logo from "./logo.svg"
import {Styles} from "./mx/components/button/styles";
import {Fragment} from "./mx/theme";
import {Chip} from "./mx/components/chip";
import {Attrs} from "./mx/styles/style";
import {Checkbox} from "./mx/components/checkbox";

let custom = {
    ...Styles.Checkbox,
    // checkedIcon: checked
}

function App() {
    return (
        <div className="App">
            <div>
                <Fragment theme={THEME_LIGHT}>
                    {/*<Button isEnabled={true} icon={add} label={"Button"} style={Styles.Button.Outlined}></Button>*/}
                    <Checkbox style={custom as Attrs}></Checkbox>
                </Fragment>
            </div>
        </div>
    );
}

export default App;
