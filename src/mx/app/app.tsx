export default 0

// import React, {createContext, MutableRefObject, RefObject, useContext, useRef, useState} from "react";
// import {TransitionHandler} from "../transitions/transition";
// import {TransitionService} from "./services";
// import {useOnLayoutHandler} from "../layout/Layout";
// import {Rect} from "../shapes/shapes";
//
// type AppObject = {
//     services: {
//         transitionService?: TransitionService
//     }
// }
//
// const UninitializedAppObject = {
//     services: {}
// }
//
// export type ServiceStateUpdateHandler<T> = (self: T) => void
//
// const AppProvider = createContext<AppObject>(UninitializedAppObject)
//
// export const useApp = () => useContext(AppProvider)
//
// function getBounds () {
//     return {
//         width: window.innerWidth,
//         height: window.innerHeight
//     }
// }
//
// export const App = (props: {children?: React.ReactNode}) => {
//     // TODO init app @resources
//
//     // TransitionHandler
//     const transitionHandler: MutableRefObject<TransitionHandler> = useRef<TransitionHandler>(new TransitionHandler())
//
//     const app = {
//         services: {
//             transitionService: {
//                 transitionHandler: transitionHandler.current,
//                 runningAnimations: []
//             }
//         }
//     }
//
//     // handle app size
//     const [bounds, setBounds] = useState<Rect>(getBounds())
//     let AppLayout = bounds
//
//     const mainLayoutRef = useOnLayoutHandler((_) => {
//         setBounds(getBounds)
//
//         console.log("set bounds", bounds, mainLayoutRef)
//
//         const layoutHolder = mainLayoutRef.current?.firstChild
//     })
//
//     return (<div ref={mainLayoutRef as RefObject<HTMLDivElement>} style={AppLayout}><AppProvider.Provider value={app}>{props.children}</AppProvider.Provider></div>)
// }