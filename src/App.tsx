import React from 'react';
import './App.scss';
import "./style.scss"
import {Button} from "./mx/components/button/button";
import {THEME_LIGHT} from "./mx/theme";
import add from "./add.svg"
import {Styles} from "./mx/components/button/styles";
import {App as Fragment} from "./mx/theme";

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

export default App;
