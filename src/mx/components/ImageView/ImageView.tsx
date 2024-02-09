import {ComponentUtils} from "../Component";


export function ImageView (params: ImageView.Params) {
    return (
        <img src={params.img}/>
    )
}

export namespace ImageView {
    export type Params = {
        img: string
    } & ComponentUtils.ComponentParams
}