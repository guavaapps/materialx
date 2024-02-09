import {Component, ComponentUtils} from "../Component";


export function TextView (params: TextView.Params) {
    console.log("START TextView")

    return (
        <Component {...params}>
            <p>Hello</p>
        </Component>
    )
}

export namespace TextView {
    export type Params = {

    } & ComponentUtils.ComponentParams
}