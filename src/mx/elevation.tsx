import {Argb} from "./ui/color/Argb";

export class Elevation {
    static level0 = 0
    static level1 = 1
    static level2 = 3
    static level3 = 6
    static level4 = 8
    static level5 = 12
}

//
// level0_opacity = 0;
// level1_opacity = 0.05;
// level2_opacity = 0.08;
// level3_opacity = 0.11;
// level4_opacity = 0.12;
// level5_opacity = 0.14;

function rgba(r: number, g: number, b: number, a: number) {
    const alpha = a * 255

    return new Argb(alpha, r, g, b).toInt()
}

function wrapArgb(argb: Argb) {
    const {alpha, red, green, blue} = argb

    return `rgba(${alpha}, ${red}, ${green}, ${blue})`
}

const KEY_UMBRA = rgba(0, 0, 0, 0.2);
const KEY_PENUMBRA = rgba(0, 0, 0, 0.14);
const AMBIENT = rgba(0, 0, 0, 0.12);

const REFERENCE_SHADOWS = [
    {
        elevation: 0, shadows: [[0, 0, 0, 0, KEY_UMBRA],
            [0, 0, 0, 0, KEY_PENUMBRA],
            [0, 0, 0, 0, AMBIENT]]
    },

    {
        elevation: 2, shadows: [[0, 3, 1, -2, KEY_UMBRA],
            [0, 2, 2, 0, KEY_PENUMBRA],
            [0, 1, 5, 0, AMBIENT]]
    },

    {
        elevation: 3, shadows: [[0, 3, 3, -2, KEY_UMBRA],
            [0, 3, 4, 0, KEY_PENUMBRA],
            [0, 1, 8, 0, AMBIENT]]
    },

    {
        elevation: 4, shadows: [[0, 2, 4, -1, KEY_UMBRA],
            [0, 4, 5, 0, KEY_PENUMBRA],
            [0, 1, 10, 0, AMBIENT]]
    },

    {
        elevation: 6, shadows: [[0, 3, 5, -1, KEY_UMBRA],
            [0, 6, 10, 0, KEY_PENUMBRA],
            [0, 1, 18, 0, AMBIENT]]
    },

    {
        elevation: 8, shadows: [[0, 5, 5, -3, KEY_UMBRA],
            [0, 8, 10, 1, KEY_PENUMBRA],
            [0, 3, 14, 2, AMBIENT]]
    },

    {
        elevation: 16, shadows: [[0, 8, 10, -5, KEY_UMBRA],
            [0, 16, 24, 2, KEY_PENUMBRA],
            [0, 6, 30, 5, AMBIENT]]
    }];

function findBoundingShadowSets(elevation: number) {
    if (elevation < 0) {
        console.debug("Elevation is less than zero");
    }

    for (let i = 0; i < REFERENCE_SHADOWS.length - 1; i++) {
        const lower = REFERENCE_SHADOWS[i]
        const upper = REFERENCE_SHADOWS[i + 1]

        if (lower.elevation <= elevation && upper.elevation > elevation) {
            return [lower, upper]
        }
    }
    const lower = REFERENCE_SHADOWS[REFERENCE_SHADOWS.length - 2]
    const upper = REFERENCE_SHADOWS[REFERENCE_SHADOWS.length - 1]
    return [lower, upper]
}


function lerp(x: number, a: number, b: number) {
    return a + x * (b - a)
}


function lerpShadow(x: number, shadow1: number[], shadow2: number[]) {
    // Round all parameters, as shadow definitions do not support subpixels
    const newX = Math.round(lerp(x, shadow1[0], shadow2[0]));
    const newY = Math.round(lerp(x, shadow1[1], shadow2[1]));
    const newBlur = Math.round(lerp(x, shadow1[2], shadow2[2]));
    const newSpread = Math.round(lerp(x, shadow1[3], shadow2[3]));
    const newColor = shadow1[4]; // No need to lerp the shadow color
    return [newX,
        newY,
        newBlur,
        newSpread,
        newColor,
    ]
}


export function computeShadow(elevation: number) {
    const bounds = findBoundingShadowSets(elevation);
    const min = bounds[0]
    const max = bounds[1]
    const x = (elevation - min.elevation) / (max.elevation - min.elevation)
    let elevationShadows: number[][] = [];

    for (let i = 0; i < min.shadows.length; i++) {
        const newShadow = lerpShadow(x, min.shadows[i], max.shadows[i]);
        elevationShadows.push(newShadow)
    }

    return elevationShadows;
}

export function createCssShadow(elevation: number) {
    if (elevation === 0) {
        return {"boxShadow": "none"}
    } else {
        const shadows = computeShadow(elevation)
        const css = shadows.map((v) => {
            const color = v.pop()!
            return `${v.join(" ")} ${wrapArgb(Argb.fromInt(color))}`
        }).join(", ")

        return {"boxShadow": css}
    }
}