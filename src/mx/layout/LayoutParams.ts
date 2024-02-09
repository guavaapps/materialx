export namespace Layout {
    export type LayoutParams = {
        x?: number,
        y?: number,

        width?: number,
        height?: number,

        minWidth?: number,
        minHeight?: number,

        maxWidth?: number,
        maxHeight?: number,

        paddingLeft?: number,
        paddingTop?: number,
        paddingRight?: number,
        paddingBottom?: number,
        paddingStart?: number,
        paddingEnd?: number,

        marginLeft?: number,
        marginTop?: number,
        marginRight?: number,
        marginBottom?: number,
        marginStart?: number,
        marginEnd?: number
    }
}

export namespace LayoutParams {
    export const MATCH_PARENT = -1
    export const WRAP_CONTENT = -2
}