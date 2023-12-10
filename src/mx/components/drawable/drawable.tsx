import {ShapeDrawable, ShapeDrawableUtils} from "../../shapes/drawables";

type DrawableProps = {
    drawable: ShapeDrawable
}

const DrawableLayout = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
}

const PathLayout = {
    display: "block",
}

export function Drawable (props: DrawableProps) {
    const drawable = props.drawable
    const d = ShapeDrawableUtils.createDrawable(drawable)

    const Layout = {
        width: d.size.width,
        height: d.size.height,
        ...DrawableLayout
    }

    console.log("applying stroke path", {p : d.strokePath})

    return (
        <svg style={Layout}>
            <path transform={`translate(${d.strokeWidth! / 2}, ${d.strokeWidth! / 2})`} style={PathLayout} d={d.fillPath} fill={d.fillColor}/>
            <path style={PathLayout} d={d.strokePath} fill={d.strokeColor} fillRule={"evenodd"}/>
        </svg>
    )
}