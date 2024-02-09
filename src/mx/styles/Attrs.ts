import {useFragment} from "../app/fragment/Fragment";
import {AttributeSet} from "./Style";

export function useAttribute (attributes: AttributeSet, attribute: string, defaultValue: any = undefined) {
    const attr = attributes[attribute]

    return attr === undefined ? defaultValue : attr
}