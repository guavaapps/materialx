import {FragmentParams} from "../fragment/FragmentParams";
import {Fragment} from "../fragment/Fragment";
import {createContext, useContext} from "react";

export function App (params: FragmentParams) {
    return (
        <Fragment theme={params.theme}>
            {params.children}
        </Fragment>
    )
}

export class ResourceManager {
    private static RESOURCE_DIRECTORY = "/@res"
    private static STRINGS = "strings"
    private static DRAWABLES = "drawables"
    private static STYLES = ""

    constructor(
        private resDirectory: string = "@res/"
    ) {

    }
}

export const Resources = createContext(new Map<string, any>())
export function useResource (uri: string) {
    const resources =  useContext(Resources)

    if (!resources.has(uri)) {
        throw new Error(`Resource ${uri} not found`)
    }

    return resources.get(uri)
}

export function loadResource (uri: string) {

}