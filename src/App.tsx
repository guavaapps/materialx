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
import {TextInputFiled} from "./mx/components/textInputField";

let custom = {
    ...Styles.TextInputField.Filled,
}

function App() {
    return (
        <div className="App">
            <div>
                <Fragment theme={THEME_LIGHT}>
                    {/*<Button isEnabled={true} icon={add} label={"Button"} style={Styles.Button.Outlined}></Button>*/}
                    <TextInputFiled leadingIcon={add} style={custom as Attrs} label={"Chip"}></TextInputFiled>
                </Fragment>
            </div>
        </div>
    );
}

export default App;
