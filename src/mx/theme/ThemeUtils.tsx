import {Hct} from "../color/hct/Hct";

export class ThemeUtils {
    static createFromColor(color: number) {
        const hct = Hct.fromInt(color)

    }
}

export enum _DefaultThemePrimaryColors {
    pink0 = "#000000",
    pink10 = "#380038",
    pink20 = "#5b005c",
    pink30 = "#810082",
    pink40 = "#a800a9",
    pink50 = "#d200d4",
    pink60 = "#fe00fd",
    pink70 = "#ff74f8",
    pink80 = "#ffaaf5",
    pink90 = "#ffd6f6",
    pink100 = "#ffffff",
}

export enum _DefaultThemeSecondaryColors {
    coral0 = "#000000",
    coral10 = "#321300",
    coral20 = "#512400",
    coral30 = "#733500",
    coral40 = "#974800",
    coral50 = "#bd5c00",
    coral60 = "#e47000",
    coral70 = "#ff8d2f",
    coral80 = "#ffb683",
    coral90 = "#ffdbc4",
    coral100 = "#ffffff",
}

export enum _DefaultThemeNeutralColors {
    neutral0 = "#000000",
    neutral10 = "#1c1b1f",
    neutral100 = "#ffffff",
    neutral20 = "#313033",
    neutral30 = "#484649",
    neutral40 = "#605d62",
    neutral50 = "#787579",
    neutral60 = "#939094",
    neutral70 = "#aeaaae",
    neutral80 = "#c9c5ca",
    neutral90 = "#e6e1e5",
    neutral95 = "#f4eff4",
    neutral99 = "#fffbfe",
    neutral_variant0 = "#000000",
    neutral_variant10 = "#1d1a22",
    neutral_variant100 = "#ffffff",
    neutral_variant20 = "#322f37",
    neutral_variant30 = "#49454f",
    neutral_variant40 = "#605d66",
    neutral_variant50 = "#79747e",
    neutral_variant60 = "#938f99",
    neutral_variant70 = "#aea9b4",
    neutral_variant80 = "#cac4d0",
    neutral_variant90 = "#e7e0ec",
    neutral_variant95 = "#f5eefa",
    neutral_variant99 = "#fffbfe",
}