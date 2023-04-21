enum anim {
    duration_short_1 = 75,
    duration_short_2 = 150,
    duration_medium_1 = 200,
    duration_medium_2 = 250,
    duration_long_1 = 300,
    duration_long_2 = 350
}

const state = {
    hovered: {
        state_layer_opacity: 0.08
    },
    focused: {
        state_layer_opacity: 0.12
    },
    pressed: {
        state_layer_opacity: 0.12
    },
    dragged: {
        state_layer_opacity: 0.16
    }
}

export {anim, state}