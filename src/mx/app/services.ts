import {useApp} from "./app";
import {TransitionHandler} from "../transitions/transition";

export type TransitionService = {
    transitionHandler: TransitionHandler,
    runningAnimations: Animation[]
}

export const useTransitionService = () => {
    const app = useApp()

    // transition handler always loaded on render
    const transitionHandler = app.services.transitionService!.transitionHandler

    return transitionHandler
}