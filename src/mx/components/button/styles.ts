export default 0

// import {ButtonAttrs} from "./button";
// import {state} from "../../values";
// import {Attr, Attrs} from "../../styles/Style";
// import add from "../../../add.svg"
// import checked from "../../../checked.svg"
// import {ChipAttrs} from "../chip";
// import {CheckboxAttrs} from "../checkbox";
// import ic_checked_icon from "../../res/drawable/ic_checked_icon.svg"
// import ic_checked_container from "../../res/drawable/ic_checked_container.svg"
// import ic_indeterminate_icon from "../../res/drawable/ic_indeterminate_icon.svg"
// import ic_unchecked_container from "../../res/drawable/ic_unchecked_container.svg"
// import {TextInputFieldAttrs} from "../textInputField";
//
// const ATTRS: ButtonAttrs = {
//     width: "max-content",
//     height: 40,
//     cornerSize: 20,
//     elevation: 20,
//     cornerStyle: "round",
//     paddingRight: "24px",
//     paddingLeft: "16px",
//     iconPaddingRight: "8px",
//     iconSize: "20px"
// }
//
// const FILLED_ATTRS: ButtonAttrs = {
//     ...ATTRS,
//     backgroundColor: {
//         enabled: Attr.colorPrimary,
//         disabled: {color: Attr.colorOnSurface, alpha: 0.12},
//     },
//     textColor: {
//         enabled: Attr.colorOnPrimary,
//         disabled: {color: Attr.colorOnSurface, alpha: 0.38}
//     },
//     overlayColor: {
//         hovered: {color: Attr.colorOnSurface, alpha: state.hovered.state_layer_opacity},
//         pressed: {color: Attr.colorOnSurface, alpha: state.pressed.state_layer_opacity},
//         focused: {color: Attr.colorOnSurface, alpha: state.focused.state_layer_opacity}
//     },
//     rippleColor: {
//         enabled: {color: Attr.colorOnPrimary, alpha: state.dragged.state_layer_opacity},
//     },
// }
//
// const TONAL_ATTRS: ButtonAttrs = {
//     ...ATTRS,
//     backgroundColor: {
//         enabled: Attr.colorSecondaryContainer,
//         disabled: {color: Attr.colorOnSurface, alpha: 0.12},
//     },
//     textColor: {
//         enabled: Attr.colorOnSecondaryContainer,
//         disabled: {color: Attr.colorOnSurface, alpha: 0.38}
//     },
//     overlayColor: {
//         hovered: {color: Attr.colorOnSecondaryContainer, alpha: state.hovered.state_layer_opacity},
//         pressed: {color: Attr.colorOnSecondaryContainer, alpha: state.pressed.state_layer_opacity},
//         focused: {color: Attr.colorOnSecondaryContainer, alpha: state.focused.state_layer_opacity},
//     },
// }
//
// const TEXT_ATTRS: ButtonAttrs = {
//     ...ATTRS,
// }
//
// const OUTLINED_ATTRS: ButtonAttrs = {
//     ...ATTRS,
// }
//
// const iconButtonAttrs: ButtonAttrs = {
//     ...ATTRS,
//     width: "40px",
//     paddingLeft: "8px",
//     iconPaddingRight: "0px",
//     paddingRight: "8px",
//     iconSize: "24px",
//
//     backgroundColor: {
//         enabled: Attr.colorOnPrimary,
//         disabled: {color: Attr.colorOnSurface, alpha: 0.12},
//     },
//     textColor: {
//         enabled: Attr.colorOnPrimary,
//         disabled: {color: Attr.colorOnSurface, alpha: 0.38}
//     },
//     overlayColor: {
//         hovered: {color: Attr.colorOnSurface, alpha: state.hovered.state_layer_opacity},
//         pressed: {color: Attr.colorOnSurface, alpha: state.pressed.state_layer_opacity},
//         focused: {color: Attr.colorOnSurface, alpha: state.focused.state_layer_opacity}
//     },
//     rippleColor: Attr.colorOnPrimary
// }
//
// export const Styles = {
//     Button: {
//         Filled: {
//             ...FILLED_ATTRS
//         },
//         Outlined: {
//             ...OUTLINED_ATTRS
//         },
//         Text: {
//             ...TEXT_ATTRS
//         },
//         Tonal: {
//             ...TONAL_ATTRS
//         },
//
//         Icon: {
//             Filled: {
//                 ...iconButtonAttrs,
//             },
//         }
//     },
//     Chip: {
//         Assist: {
//             width: "max-content",
//             height: 32,
//             cornerSize: 8,
//             cornerStyle: "round",
//             paddingRight: "8px",
//             paddingLeft: "8px",
//             iconPaddingRight: "8px",
//             iconPaddingLeft: "8px",
//             iconSize: "20px",
//             outlineStyle: "solid",
//             outlineWidth: "1px",
//
//             outlineColor: {
//                 enabled: Attr.colorOutline,
//                 disabled: {color: Attr.colorOnSurface, alpha: 0.12}
//             },
//
//             overlayColor: {
//                 hovered: {color: Attr.colorOnSurface, alpha: state.hovered.state_layer_opacity},
//                 pressed: {color: Attr.colorOnSurface, alpha: state.hovered.state_layer_opacity},
//                 focused: {color: Attr.colorOnSurface, alpha: state.focused.state_layer_opacity},
//                 dragged: {color: Attr.colorOnSurface, alpha: state.dragged.state_layer_opacity}
//             },
//
//             textColor: {
//                 enabled: Attr.colorOnSurface,
//                 disabled: {color: Attr.colorOnSurface, alpha: 0.38}
//             },
//
//             rippleColor: {color: Attr.colorOnPrimary, alpha: state.pressed.state_layer_opacity},
//         },
//
//         Filter: {
//             width: "max-content",
//             height: 32,
//             cornerSize: 8,
//             cornerStyle: "round",
//             paddingRight: "8px",
//             paddingLeft: "8px",
//             iconPaddingRight: "8px",
//             iconPaddingLeft: "8px",
//             iconSize: "20px",
//             outlineStyle: "solid",
//
//             checkedIcon: checked,
//             checkedIconVisible: true,
//
//             outlineWidth: {
//                 enabled: "1px",
//                 selected: "0px"
//             },
//
//             backgroundColor: {
//                 enabled: "#00000000",
//                 selected: Attr.colorSecondaryContainer,
//             },
//
//             outlineColor: {
//                 enabled: Attr.colorOutline,
//                 selected: "#00000000",
//                 disabled: {color: Attr.colorOnSurface, alpha: 0.12}
//             },
//
//             overlayColor: {
//                 hovered: {color: Attr.colorOnSurface, alpha: state.hovered.state_layer_opacity},
//                 pressed: {color: Attr.colorOnSurface, alpha: state.hovered.state_layer_opacity},
//                 focused: {color: Attr.colorOnSurface, alpha: state.focused.state_layer_opacity},
//                 dragged: {color: Attr.colorOnSurface, alpha: state.dragged.state_layer_opacity}
//             },
//
//             textColor: {
//                 enabled: Attr.colorOnSurface,
//                 disabled: {color: Attr.colorOnSurface, alpha: 0.38}
//             },
//
//             rippleColor: {color: Attr.colorOnPrimary, alpha: state.pressed.state_layer_opacity},
//         },
//
//         Input: {
//             width: "max-content",
//             height: 32,
//             cornerSize: 8,
//             cornerStyle: "round",
//             paddingRight: "8px",
//             paddingLeft: "8px",
//             iconPaddingRight: "8px",
//             iconPaddingLeft: "8px",
//             iconSize: "20px",
//             outlineStyle: "solid",
//             outlineWidth: "1px",
//
//             checkedIconVisible: false,
//             closeIconVisible: true,
//
//             closeIcon: add,
//
//             outlineColor: {
//                 enabled: Attr.colorOutline,
//                 disabled: {color: Attr.colorOnSurface, alpha: 0.12}
//             },
//
//             overlayColor: {
//                 hovered: {color: Attr.colorOnSurface, alpha: state.hovered.state_layer_opacity},
//                 pressed: {color: Attr.colorOnSurface, alpha: state.hovered.state_layer_opacity},
//                 focused: {color: Attr.colorOnSurface, alpha: state.focused.state_layer_opacity},
//                 dragged: {color: Attr.colorOnSurface, alpha: state.dragged.state_layer_opacity}
//             },
//
//             textColor: {
//                 enabled: Attr.colorOnSurface,
//                 disabled: {color: Attr.colorOnSurface, alpha: 0.38}
//             },
//
//             rippleColor: {color: Attr.colorOnPrimary, alpha: state.pressed.state_layer_opacity},
//         },
//     },
//
//     Checkbox: {
//         width: 40,
//         height: 40,
//         iconSize: "18px",
//
//         containerChecked: ic_checked_container,
//         containerUnchecked: ic_unchecked_container,
//         iconChecked: ic_checked_icon,
//         iconIndeterminate: ic_indeterminate_icon,
//
//         backgroundColor: {
//             enabled: Attr.colorOnSurface,
//             selected: Attr.colorPrimary
//         },
//
//         iconColor: Attr.colorSurface,
//
//         rippleColor: {color: Attr.colorOnPrimary, alpha: state.pressed.state_layer_opacity}
//     } as CheckboxAttrs,
//
//     TextInputField: {
//         Filled: {
//             width: "max-content",
//             height: 56,
//
//             minWidth: 88,
//             minHeight: 56,
//
//             maxWidth: 145,
//             maxHeight: 400,
//
//             cornerSize: [4, 4, 0, 0],
//
//             leadingIconSize: 24,
//             leadingIconColor: "red",
//
//             trailingIconSize: 24,
//             trailingIconColor: "red",
//
//             paddingLeft: 12,
//             paddingRight: 12,
//
//             backgroundColor: {
//                 enabled: Attr.colorSurfaceVariant,
//                 disabled: {color: Attr.colorOnSurface, alpha: 0.4}
//             },
//
//             activeIndicatorColor: {
//                 enabled: Attr.colorPrimary
//             },
//
//             rippleColor: {color: Attr.colorOnPrimary, alpha: state.pressed.state_layer_opacity}
//
//         } as TextInputFieldAttrs
//     },
//
//     TextView: {
//         width: "max-content",
//         height: "max-content",
//         backgroundColor: {
//             // enabled: "red",
//             // hovered: "green",
//             // focused: "blue",
//             // pressed: "pink"
//         },
//         marginLeft: 20,
//         paddingLeft: 10,
//
//         textColor: {
//             enabled: Attr.colorPrimary,
//             disabled: Attr.colorOnSurface,
//             hovered: Attr.colorPrimary,
//             focused: Attr.colorPrimary,
//             pressed: Attr.colorPrimary
//         },
//     }
// }