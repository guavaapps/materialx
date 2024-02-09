import {Style} from "../styles/Style";
import {Theme} from "../theme/Theme";
import {Statesheet} from "../styles/Statesheet";

export class StyleManager {
    private componentStyle: Style

    constructor(
        private style: Style,
        private theme: Theme
    ) {
        this.componentStyle = Style.extend(style, theme)
    }

    getStyledAttributes () {

    }

    createStyledStatesheet (statesheet: Statesheet) {
        const styledStatesheet: Statesheet = {}

        const states = Object.keys(statesheet)

        for (let state of states) {
            const attributes = statesheet[state]

            const styledAttributes = Style.create(attributes, this.componentStyle)

            styledStatesheet[state] = styledStatesheet
        }

        return styledStatesheet
    }
}