import {ButtonAttrs} from "./button";
import {state} from "../../values";
import {Attr} from "../../style";

const ATTRS: ButtonAttrs = {
    width: "max-content",
    height: 40,
    cornerSize: 20,
    elevation: 0,
    cornerStyle: "round",
    paddingRight: "24px",
    paddingLeft: "16px",
    iconPaddingRight: "8px",
    iconSize: "20px"
}

const FILLED_ATTRS: ButtonAttrs = {
    ...ATTRS,
    backgroundColor: {
        enabled: Attr.colorPrimary,
        disabled: {color: Attr.colorOnSurface, alpha: 0.12},
    },
    textColor: {
        enabled: Attr.colorOnPrimary,
        disabled: {color: Attr.colorOnSurface, alpha: 0.38}
    },
    overlayColor: {
        hovered: {color: Attr.colorOnSurface, alpha: state.hovered.state_layer_opacity},
        pressed: {color: Attr.colorOnSurface, alpha: state.pressed.state_layer_opacity},
        focused: {color: Attr.colorOnSurface, alpha: state.focused.state_layer_opacity}
    },
    rippleColor: Attr.colorOnPrimary
}

const TONAL_ATTRS: ButtonAttrs = {
    ...ATTRS,
    backgroundColor: {
        enabled: Attr.colorSecondaryContainer,
        disabled: {color: Attr.colorOnSurface, alpha: 0.12},
    },
    textColor: {
        enabled: Attr.colorOnSecondaryContainer,
        disabled: {color: Attr.colorOnSurface, alpha: 0.38}
    },
    overlayColor: {
        hovered: {color: Attr.colorOnSecondaryContainer, alpha: state.hovered.state_layer_opacity},
        pressed: {color: Attr.colorOnSecondaryContainer, alpha: state.pressed.state_layer_opacity},
        focused: {color: Attr.colorOnSecondaryContainer, alpha: state.focused.state_layer_opacity},
    }
}

const TEXT_ATTRS: ButtonAttrs = {
    ...ATTRS,
}

const OUTLINED_ATTRS: ButtonAttrs = {
    ...ATTRS,
}

const iconButtonAttrs: ButtonAttrs = {
    ...ATTRS,
    width: "40px",
    paddingLeft: "8px",
    iconPaddingRight: "0px",
    paddingRight: "8px",
    iconSize: "24px",

    backgroundColor: {
        enabled: Attr.colorOnPrimary,
        disabled: {color: Attr.colorOnSurface, alpha: 0.12},
    },
    textColor: {
        enabled: Attr.colorOnPrimary,
        disabled: {color: Attr.colorOnSurface, alpha: 0.38}
    },
    overlayColor: {
        hovered: {color: Attr.colorOnSurface, alpha: state.hovered.state_layer_opacity},
        pressed: {color: Attr.colorOnSurface, alpha: state.pressed.state_layer_opacity},
        focused: {color: Attr.colorOnSurface, alpha: state.focused.state_layer_opacity}
    },
    rippleColor: Attr.colorOnPrimary
}

export const Styles = {
    Button: {
        Filled: {
            ...FILLED_ATTRS
        },
        Outlined: {
            ...OUTLINED_ATTRS
        },
        Text: {
            ...TEXT_ATTRS
        },
        Tonal: {
            ...TONAL_ATTRS
        },

        Icon: {
            Filled: {
                ...iconButtonAttrs,
            },
        }
    }
}