import {Statesheet} from "../styles/Statesheet";
import {Style} from "../styles/Style";

export class StateManager {
    private inflatedStatesheet: Statesheet

    constructor(
        private styledAttributes: Style,
        private statesheet: Statesheet
    ) {
        const inflatedStatesheet: Statesheet = {...statesheet}
        const states = Object.keys(statesheet)

        for (let state of states) {
            const value = statesheet[state]

            inflatedStatesheet[state] = {
                ...styledAttributes,
                ...value
            }
        }

        this.inflatedStatesheet = inflatedStatesheet
    }

    setState () {

    }
}