import {
    _DefaultThemeNeutralColors as Neutral,
    _DefaultThemePrimaryColors as Primary,
    _DefaultThemeSecondaryColors as Secondary
} from "./ThemeUtils";
import {AttributeSet, Style} from "../styles/Style";
import {useFragment} from "../app/fragment/Fragment";

// default themes
export const THEME_LIGHT: Theme = {
    colorError: "#B3261E",
    colorErrorContainer: "#F9DEDC",
    colorOnError: "#FFFFFF",
    colorOnErrorContainer: "#410E0B",
    colorOnPrimary: Primary.pink100,
    colorOnPrimaryContainer: Primary.pink10,
    colorOnSecondary: Secondary.coral100,
    colorOnSecondaryContainer: Secondary.coral10,
    colorOnSurface: Neutral.neutral10,
    colorOnSurfaceVariant: Neutral.neutral_variant30,
    colorOutline: Neutral.neutral_variant50,
    colorOutlineVariant: Neutral.neutral_variant80,
    colorPrimary: Primary.pink40,
    colorPrimaryContainer: Primary.pink90,
    colorSecondary: Secondary.coral40,
    colorSecondaryContainer: Secondary.coral90,
    colorSurface: Neutral.neutral99,
    colorSurfaceVariant: Neutral.neutral_variant99,
}

// TODO not implemented
const THEME_DARK: Theme = {
    colorError: 0,
    colorErrorContainer: 0,
    colorOnError: 0,
    colorOnErrorContainer: 0,
    colorOnPrimary: 0,
    colorOnPrimaryContainer: 0,
    colorOnSecondary: 0,
    colorOnSecondaryContainer: 0,
    colorOnSurface: 0,
    colorOnSurfaceVariant: 0,
    colorOutline: 0,
    colorOutlineVariant: 0,
    colorPrimary: 0,
    colorPrimaryContainer: 0,
    colorSecondary: 0,
    colorSecondaryContainer: 0,
    colorSurface: 0,
    colorSurfaceVariant: 0
}

// theme is essentially a style i.e. resolved attrs
// theme class
export abstract class Theme extends Style{
    [attribute: string]: any

    colorPrimary?: number | string;
    colorOnPrimary?: number | string;
    colorPrimaryContainer?: number | string;
    colorOnPrimaryContainer?: number | string;

    colorSecondary?: number | string;
    colorOnSecondary?: number | string;
    colorSecondaryContainer?: number | string
    colorOnSecondaryContainer?: number | string

    colorSurface?: number | string
    colorOnSurface?: number | string
    colorSurfaceVariant?: number | string
    colorOnSurfaceVariant?: number | string

    colorError?: number | string
    colorOnError?: number | string

    colorErrorContainer?: number | string
    colorOnErrorContainer?: number | string

    colorOutline?: number | string
    colorOutlineVariant?: number | string

    colorSurfaceDim?: number | string
    colorSurfaceBright?: number | string
    colorSurfaceContainerLowest?: number | string
    colorSurfaceContainerLow?: number | string
    colorSurfaceContainer?: number | string
    colorSurfaceContainerHigh?: number | string
    colorSurfaceContainerHighest?: number | string
}

export namespace Theme {
    export function createStyledAttributes (attributes: AttributeSet, theme: Theme) {

    }
}

export function useTheme () {
    return useFragment().theme
}